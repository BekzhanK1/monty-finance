from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_db
from app.finance.models import User
from app.finance.services.digest_service import send_transaction_notification
from app.food.deps import get_food_household_id
from app.food.models import FoodShoppingItem, FoodShoppingList
from app.food.schemas import (
    FoodShoppingFinalizeResponse,
    FoodShoppingGenerateBody,
    FoodShoppingItemCreate,
    FoodShoppingItemPatch,
    FoodShoppingListPatch,
    FoodShoppingListResponse,
)
from app.food.serialization_shop import shopping_list_to_response
from app.food.services.finance_bridge import finalize_shopping_list_to_finance
from app.food.services.shopping_generator import generate_shopping_list_from_menu
from app.middleware.auth import get_current_user

router = APIRouter()


def _list_options():
    return selectinload(FoodShoppingList.items).selectinload(FoodShoppingItem.unit)


@router.get("/shopping-lists/latest", response_model=FoodShoppingListResponse)
def get_latest_shopping_list(
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    row = (
        db.query(FoodShoppingList)
        .options(_list_options())
        .filter(FoodShoppingList.household_id == household_id)
        .order_by(FoodShoppingList.created_at.desc())
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="No shopping list yet")
    return shopping_list_to_response(row)


@router.post(
    "/shopping-lists/generate",
    response_model=FoodShoppingListResponse,
    status_code=status.HTTP_201_CREATED,
)
def generate_shopping_list(
    body: FoodShoppingGenerateBody,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    if body.date_to < body.date_from:
        raise HTTPException(status_code=400, detail="Invalid date range")
    lst = generate_shopping_list_from_menu(
        db,
        household_id=household_id,
        date_from=body.date_from,
        date_to=body.date_to,
        mode=body.mode,
    )
    row = (
        db.query(FoodShoppingList)
        .options(_list_options())
        .filter(FoodShoppingList.id == lst.id)
        .first()
    )
    payload = shopping_list_to_response(row).model_dump(mode="json")
    code = status.HTTP_200_OK if body.mode == "merge_draft" else status.HTTP_201_CREATED
    return JSONResponse(status_code=code, content=payload)


@router.patch("/shopping-lists/{list_id}", response_model=FoodShoppingListResponse)
def update_shopping_list(
    list_id: int,
    body: FoodShoppingListPatch,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    lst = (
        db.query(FoodShoppingList)
        .filter(FoodShoppingList.id == list_id, FoodShoppingList.household_id == household_id)
        .first()
    )
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    if body.status is not None:
        if body.status not in ("draft", "active", "done"):
            raise HTTPException(status_code=400, detail="Invalid status")
        lst.status = body.status
    db.commit()
    row = db.query(FoodShoppingList).options(_list_options()).filter(FoodShoppingList.id == list_id).first()
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
    household_id: int = Depends(get_food_household_id),
):
    lst = (
        db.query(FoodShoppingList)
        .filter(FoodShoppingList.id == list_id, FoodShoppingList.household_id == household_id)
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
    household_id: int = Depends(get_food_household_id),
):
    it = (
        db.query(FoodShoppingItem)
        .join(FoodShoppingList)
        .filter(
            FoodShoppingItem.id == item_id,
            FoodShoppingList.household_id == household_id,
        )
        .first()
    )
    if not it:
        raise HTTPException(status_code=404, detail="Item not found")
    if body.checked is not None:
        it.checked = body.checked
    if body.actual_price is not None:
        it.actual_price = Decimal(str(body.actual_price))
    elif "actual_price" in body.model_fields_set and body.actual_price is None:
        it.actual_price = None
    db.commit()
    row = db.query(FoodShoppingList).options(_list_options()).filter(FoodShoppingList.id == it.list_id).first()
    return shopping_list_to_response(row)


@router.post("/shopping-lists/{list_id}/finalize", response_model=FoodShoppingFinalizeResponse)
def finalize_shopping_list(
    list_id: int,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
    current_user: User = Depends(get_current_user),
):
    lst = (
        db.query(FoodShoppingList)
        .options(_list_options())
        .filter(FoodShoppingList.id == list_id, FoodShoppingList.household_id == household_id)
        .first()
    )
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    from app.finance.models import Category

    tx, total = finalize_shopping_list_to_finance(
        db,
        lst=lst,
        user_id=current_user.id,
        user_name=current_user.first_name or "Пользователь",
    )
    category = db.query(Category).filter(Category.id == tx.category_id).first()
    if category:
        send_transaction_notification(
            db=db,
            category_icon=category.icon,
            category_name=category.name,
            amount=tx.amount,
            user_name=current_user.first_name or "Пользователь",
            comment=tx.comment,
        )

    row = (
        db.query(FoodShoppingList)
        .options(_list_options())
        .filter(FoodShoppingList.id == list_id)
        .first()
    )
    return FoodShoppingFinalizeResponse(
        list=shopping_list_to_response(row),
        transaction_id=tx.id,
        total_amount=total,
    )


@router.post("/shopping-lists/{list_id}/apply-to-pantry", response_model=FoodShoppingListResponse)
def apply_shopping_to_pantry(
    list_id: int,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    from datetime import datetime
    from app.food.models import FoodIngredient, FoodPantryItem, FoodUnit

    lst = (
        db.query(FoodShoppingList)
        .options(_list_options())
        .filter(FoodShoppingList.id == list_id, FoodShoppingList.household_id == household_id)
        .first()
    )
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    items_to_apply = [
        it
        for it in lst.items
        if it.checked
        and it.ingredient_id is not None
        and it.quantity is not None
        and it.unit_id is not None
        and it.pantry_applied_at is None
    ]

    for it in items_to_apply:
        qty = Decimal(it.quantity)
        existing = (
            db.query(FoodPantryItem)
            .filter(
                FoodPantryItem.household_id == household_id,
                FoodPantryItem.ingredient_id == it.ingredient_id,
            )
            .first()
        )
        if existing:
            if existing.unit_id != it.unit_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Продукт '{it.label}' уже в кладовой в другой единице — измените вручную.",
                )
            existing.quantity = Decimal(existing.quantity) + qty
        else:
            db.add(
                FoodPantryItem(
                    household_id=household_id,
                    ingredient_id=it.ingredient_id,
                    quantity=qty,
                    unit_id=it.unit_id,
                )
            )
        it.pantry_applied_at = datetime.utcnow()

    db.commit()
    row = db.query(FoodShoppingList).options(_list_options()).filter(FoodShoppingList.id == list_id).first()
    return shopping_list_to_response(row)


@router.post("/dishes/{dish_id}/shopping-shortfall", response_model=FoodShoppingListResponse)
def add_dish_shortfall_to_shopping(
    dish_id: int,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    """Add missing ingredients from a dish to the current week's shopping list."""
    from collections import defaultdict
    from datetime import date, timedelta
    from app.food.models import FoodDish, FoodDishIngredient
    from app.food.services.pantry_adjust import apply_pantry_to_totals, load_pantry_by_ingredient_unit

    dish = (
        db.query(FoodDish)
        .options(
            selectinload(FoodDish.ingredients).selectinload(FoodDishIngredient.ingredient),
            selectinload(FoodDish.ingredients).selectinload(FoodDishIngredient.unit),
        )
        .filter(FoodDish.id == dish_id, FoodDish.household_id == household_id)
        .first()
    )
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")

    today = date.today()
    weekday = today.weekday()
    week_start = today - timedelta(days=weekday)
    week_end = week_start + timedelta(days=6)

    lst = (
        db.query(FoodShoppingList)
        .filter(
            FoodShoppingList.household_id == household_id,
            FoodShoppingList.period_start == week_start,
            FoodShoppingList.period_end == week_end,
            FoodShoppingList.status.in_(["draft", "active"]),
        )
        .first()
    )
    if not lst:
        raise HTTPException(
            status_code=400,
            detail=f"Нет списка на текущую неделю ({week_start.isoformat()} — {week_end.isoformat()}). Сначала соберите список из меню.",
        )

    totals: dict[tuple[int, int], Decimal] = defaultdict(lambda: Decimal(0))
    labels: dict[tuple[int, int], str] = {}

    for line in dish.ingredients:
        ing = line.ingredient
        if ing is None:
            continue
        if ing.is_pantry_default and not line.is_optional:
            continue
        key = (line.ingredient_id, line.unit_id)
        totals[key] += Decimal(line.quantity)
        if key not in labels:
            labels[key] = ing.name

    pantry = load_pantry_by_ingredient_unit(db, household_id=household_id)
    totals, unit_mismatch = apply_pantry_to_totals(totals, pantry)

    existing_items = {
        (it.ingredient_id, it.unit_id): it
        for it in lst.items
        if it.ingredient_id is not None
    }

    for (ing_id, unit_id), qty in totals.items():
        if qty <= 0:
            continue
        existing = existing_items.get((ing_id, unit_id))
        if existing:
            existing.quantity = Decimal(existing.quantity or 0) + qty
        else:
            max_order = (
                db.query(func.coalesce(func.max(FoodShoppingItem.sort_order), -1))
                .filter(FoodShoppingItem.list_id == lst.id)
                .scalar()
            )
            note = (
                "В кладовой этот продукт в другой единице — проверьте количество"
                if (ing_id, unit_id) in unit_mismatch
                else None
            )
            db.add(
                FoodShoppingItem(
                    list_id=lst.id,
                    ingredient_id=ing_id,
                    label=labels[(ing_id, unit_id)],
                    quantity=qty,
                    unit_id=unit_id,
                    checked=False,
                    sort_order=int(max_order) + 1,
                    note=note,
                )
            )

    db.commit()
    row = db.query(FoodShoppingList).options(_list_options()).filter(FoodShoppingList.id == lst.id).first()
    return shopping_list_to_response(row)
