from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_db
from app.finance.models import User
from app.food.models import FoodShoppingItem, FoodShoppingList, MVP_HOUSEHOLD_ID
from app.food.schemas import (
    FoodShoppingGenerateBody,
    FoodShoppingItemCreate,
    FoodShoppingItemPatch,
    FoodShoppingListResponse,
)
from app.food.serialization_shop import shopping_list_to_response
from app.food.services.shopping_generator import generate_shopping_list_from_menu
from app.middleware.auth import get_current_user

router = APIRouter()


def _list_options():
    return selectinload(FoodShoppingList.items).selectinload(FoodShoppingItem.unit)


@router.get("/shopping-lists/latest", response_model=FoodShoppingListResponse)
def get_latest_shopping_list(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (
        db.query(FoodShoppingList)
        .options(_list_options())
        .filter(FoodShoppingList.household_id == MVP_HOUSEHOLD_ID)
        .order_by(FoodShoppingList.created_at.desc())
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="No shopping list yet")
    return shopping_list_to_response(row)


@router.post("/shopping-lists/generate", response_model=FoodShoppingListResponse, status_code=status.HTTP_201_CREATED)
def generate_shopping_list(
    body: FoodShoppingGenerateBody,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if body.date_to < body.date_from:
        raise HTTPException(status_code=400, detail="Invalid date range")
    lst = generate_shopping_list_from_menu(
        db,
        household_id=MVP_HOUSEHOLD_ID,
        date_from=body.date_from,
        date_to=body.date_to,
    )
    row = (
        db.query(FoodShoppingList)
        .options(_list_options())
        .filter(FoodShoppingList.id == lst.id)
        .first()
    )
    return shopping_list_to_response(row)


@router.post(
    "/shopping-lists/{list_id}/items",
    response_model=FoodShoppingListResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_shopping_item(
    list_id: int,
    body: FoodShoppingItemCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    lst = (
        db.query(FoodShoppingList)
        .filter(FoodShoppingList.id == list_id, FoodShoppingList.household_id == MVP_HOUSEHOLD_ID)
        .first()
    )
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    next_order = (
        db.query(func.coalesce(func.max(FoodShoppingItem.sort_order), -1))
        .filter(FoodShoppingItem.list_id == list_id)
        .scalar()
        + 1
    )
    db.add(
        FoodShoppingItem(
            list_id=list_id,
            ingredient_id=body.ingredient_id,
            label=body.label.strip(),
            quantity=Decimal(str(body.quantity)) if body.quantity is not None else None,
            unit_id=body.unit_id,
            checked=False,
            sort_order=next_order,
        )
    )
    db.commit()
    row = db.query(FoodShoppingList).options(_list_options()).filter(FoodShoppingList.id == list_id).first()
    return shopping_list_to_response(row)


@router.patch("/shopping-items/{item_id}", response_model=FoodShoppingListResponse)
def patch_shopping_item(
    item_id: int,
    body: FoodShoppingItemPatch,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    it = (
        db.query(FoodShoppingItem)
        .join(FoodShoppingList)
        .filter(
            FoodShoppingItem.id == item_id,
            FoodShoppingList.household_id == MVP_HOUSEHOLD_ID,
        )
        .first()
    )
    if not it:
        raise HTTPException(status_code=404, detail="Item not found")
    if body.checked is not None:
        it.checked = body.checked
    db.commit()
    row = db.query(FoodShoppingList).options(_list_options()).filter(FoodShoppingList.id == it.list_id).first()
    return shopping_list_to_response(row)
