"""The household's current shopping list (one live list; completed lists are kept as history)."""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_db
from app.finance.models import User
from app.finance.services.digest_service import send_transaction_notification
from app.food.deps import get_food_household_id, get_food_warehouse
from app.food.models import FoodIngredient, FoodShoppingItem, FoodShoppingList, FoodUnit, FoodWarehouse
from app.food.schemas import (
    FoodShoppingAddResult,
    FoodShoppingComplete,
    FoodShoppingCompleteResponse,
    FoodShoppingDateRange,
    FoodShoppingItemCreate,
    FoodShoppingItemPatch,
    FoodShoppingListResponse,
)
from app.food.serialization_shop import shopping_list_to_response
from app.food.services import shopping_service as shop
from app.food.services.aisles import AISLE_KEYS
from app.food.services.finance_bridge import record_grocery_expense
from app.middleware.auth import get_current_user

router = APIRouter()


def _response(db: Session, list_id: int) -> FoodShoppingListResponse:
    return shopping_list_to_response(shop.reload_list(db, list_id))


def _get_item(db: Session, household_id: int, item_id: int) -> FoodShoppingItem:
    item = (
        db.query(FoodShoppingItem)
        .join(FoodShoppingList)
        .filter(FoodShoppingItem.id == item_id, FoodShoppingList.household_id == household_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


def _get_unit(db: Session, unit_id: int | None) -> FoodUnit | None:
    if unit_id is None:
        return None
    unit = db.query(FoodUnit).filter(FoodUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=400, detail="Invalid unit_id")
    return unit


@router.get("/shopping-list", response_model=FoodShoppingListResponse)
def get_current_list(
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    return shopping_list_to_response(shop.get_or_create_current_list(db, household_id=household_id))


@router.post("/shopping-list/items", response_model=FoodShoppingListResponse, status_code=status.HTTP_201_CREATED)
def add_item(
    body: FoodShoppingItemCreate,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    """Add by name; links to a known product automatically and merges with an existing line."""
    lst = shop.get_or_create_current_list(db, household_id=household_id)
    ingredient = None
    if body.ingredient_id is not None:
        ingredient = (
            db.query(FoodIngredient)
            .filter(FoodIngredient.id == body.ingredient_id, FoodIngredient.household_id == household_id)
            .first()
        )
        if ingredient is None:
            raise HTTPException(status_code=400, detail="Invalid ingredient_id")
    else:
        ingredient = shop.find_ingredient(db, household_id=household_id, label=body.label)
    unit = _get_unit(db, body.unit_id)
    quantity = Decimal(str(body.quantity)) if body.quantity is not None else None
    if quantity is not None and unit is None and ingredient is not None:
        unit = ingredient.default_unit
    shop.add_entries(db, lst, [shop.Entry(body.label, quantity, unit, ingredient)])
    db.commit()
    return _response(db, lst.id)


@router.patch("/shopping-list/items/{item_id}", response_model=FoodShoppingListResponse)
def patch_item(
    item_id: int,
    body: FoodShoppingItemPatch,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    item = _get_item(db, household_id, item_id)
    sent = body.model_fields_set
    if body.checked is not None:
        item.checked = body.checked
    if body.label is not None:
        item.label = body.label.strip()
    if "quantity" in sent:
        item.quantity = Decimal(str(body.quantity)) if body.quantity is not None else None
    if "unit_id" in sent:
        item.unit_id = _get_unit(db, body.unit_id).id if body.unit_id is not None else None
    if body.category is not None:
        if body.category not in AISLE_KEYS:
            raise HTTPException(status_code=400, detail="Unknown category")
        item.category = body.category
    if "actual_price" in sent:
        item.actual_price = Decimal(str(body.actual_price)) if body.actual_price is not None else None
    db.commit()
    return _response(db, item.list_id)


@router.delete("/shopping-list/items/{item_id}", response_model=FoodShoppingListResponse)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    item = _get_item(db, household_id, item_id)
    list_id = item.list_id
    db.delete(item)
    db.commit()
    return _response(db, list_id)


@router.post("/shopping-list/from-menu", response_model=FoodShoppingAddResult)
def add_from_menu(
    body: FoodShoppingDateRange,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
    warehouse: FoodWarehouse = Depends(get_food_warehouse),
):
    if body.date_to < body.date_from:
        raise HTTPException(status_code=400, detail="date_to must be >= date_from")
    lst = shop.get_or_create_current_list(db, household_id=household_id)
    added = shop.add_from_menu(db, lst, household_id=household_id, warehouse_id=warehouse.id,
                               date_from=body.date_from, date_to=body.date_to)
    db.commit()
    return FoodShoppingAddResult(list=_response(db, lst.id), added=added)


@router.post("/shopping-list/low-stock", response_model=FoodShoppingAddResult)
def add_low_stock(
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
    warehouse: FoodWarehouse = Depends(get_food_warehouse),
):
    lst = shop.get_or_create_current_list(db, household_id=household_id)
    added = shop.add_low_stock(db, lst, household_id=household_id, warehouse_id=warehouse.id)
    db.commit()
    return FoodShoppingAddResult(list=_response(db, lst.id), added=added)


@router.post("/shopping-list/complete", response_model=FoodShoppingCompleteResponse)
def complete_list(
    body: FoodShoppingComplete,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
    current_user: User = Depends(get_current_user),
    warehouse: FoodWarehouse = Depends(get_food_warehouse),
):
    """Finish a shopping trip: bought items → the warehouse, optional receipt total → Finance expense."""
    lst = shop.get_or_create_current_list(db, household_id=household_id)
    bought = [it.label for it in lst.items if it.checked]
    if not bought:
        raise HTTPException(status_code=400, detail="Отметьте купленное, прежде чем завершать покупку")

    transaction_id = None
    if body.total_amount:
        tx, category = record_grocery_expense(
            db, lst=lst, user_id=current_user.id, amount=body.total_amount, items=bought,
        )
        transaction_id = tx.id
        send_transaction_notification(
            db=db,
            category_icon=category.icon,
            category_name=category.name,
            amount=body.total_amount,
            user_name=current_user.first_name or "Пользователь",
            comment=tx.comment,
        )

    result = shop.complete(db, lst, household_id=household_id, to_pantry=body.to_pantry,
                           warehouse_id=warehouse.id, user_id=current_user.id)
    return FoodShoppingCompleteResponse(
        list=shopping_list_to_response(result.new_list),
        moved_to_pantry=result.moved_to_pantry,
        skipped=result.skipped,
        transaction_id=transaction_id,
    )
