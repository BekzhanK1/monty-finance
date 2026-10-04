"""Today screen, cooking (consumes stock) and per-dish availability."""

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_db
from app.food.deps import get_food_household_id
from app.food.models import FoodDish, FoodDishIngredient, FoodMealSlot
from app.food.schemas import (
    FoodAvailabilityLine,
    FoodConsumedLine,
    FoodCookBody,
    FoodCookResponse,
    FoodDishAvailability,
    FoodShoppingAddResult,
    FoodTodayResponse,
)
from app.food.serialization import slot_to_response
from app.food.serialization_pantry import pantry_item_to_response
from app.food.serialization_shop import shopping_list_to_response
from app.food.services import shopping_service as shop
from app.food.services.expiry import local_today
from app.food.services.inventory import (
    check_availability,
    consume,
    dish_load_options,
    dish_needs,
    load_pantry,
    readiness,
)

router = APIRouter()

SLOT_ORDER = {"breakfast": 0, "lunch": 1, "dinner": 2, "snack": 3}


def slot_load_options():
    return (
        selectinload(FoodMealSlot.dish).selectinload(FoodDish.ingredients).selectinload(FoodDishIngredient.ingredient),
        selectinload(FoodMealSlot.dish).selectinload(FoodDish.ingredients).selectinload(FoodDishIngredient.unit),
    )


def slots_with_readiness(slots: list[FoodMealSlot], pantry) -> list:
    out = []
    for slot in sorted(slots, key=lambda s: (s.slot_date, SLOT_ORDER.get(s.slot_key, 9), s.id)):
        if slot.dish is None or not slot.dish.ingredients:
            out.append(slot_to_response(slot))
            continue
        lines = check_availability(dish_needs(slot.dish, slot.servings), pantry)
        missing = sum(1 for line in lines if line.status not in ("ok", "always_home"))
        out.append(slot_to_response(slot, readiness=readiness(lines), missing_count=missing))
    return out


def _get_dish(db: Session, household_id: int, dish_id: int) -> FoodDish:
    dish = (
        db.query(FoodDish)
        .options(*dish_load_options())
        .filter(FoodDish.id == dish_id, FoodDish.household_id == household_id)
        .first()
    )
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")
    return dish


def _get_slot(db: Session, household_id: int, slot_id: int) -> FoodMealSlot:
    slot = (
        db.query(FoodMealSlot)
        .options(*slot_load_options())
        .filter(FoodMealSlot.id == slot_id, FoodMealSlot.household_id == household_id)
        .first()
    )
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    return slot


@router.get("/today", response_model=FoodTodayResponse)
def get_today(
    day: date | None = Query(None),
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    today = day or local_today()
    pantry = load_pantry(db, household_id=household_id)
    slots = (
        db.query(FoodMealSlot)
        .options(*slot_load_options())
        .filter(FoodMealSlot.household_id == household_id, FoodMealSlot.slot_date == today)
        .all()
    )
    tomorrow_planned = (
        db.query(FoodMealSlot)
        .filter(FoodMealSlot.household_id == household_id, FoodMealSlot.slot_date == today + timedelta(days=1))
        .count()
    )
    stock = [pantry_item_to_response(row, today=today) for row in pantry.values()]
    expiring = sorted((s for s in stock if s.status in ("expired", "expiring")), key=lambda s: s.days_left or 0)
    low_stock = sorted((s for s in stock if s.status in ("low", "out") and s.min_quantity is not None),
                       key=lambda s: s.ingredient_name.lower())
    lst = shop.get_or_create_current_list(db, household_id=household_id)
    return FoodTodayResponse(
        date=today,
        slots=slots_with_readiness(slots, pantry),
        tomorrow_planned=tomorrow_planned,
        expiring=expiring,
        low_stock=low_stock,
        shopping_list_id=lst.id,
        shopping_open=shop.open_count(lst),
    )


def _consumed_lines(consumed) -> list[FoodConsumedLine]:
    return [
        FoodConsumedLine(ingredient_id=c.ingredient_id, name=c.name, quantity=float(c.quantity),
                         unit_code=c.unit_code, shortfall=c.shortfall)
        for c in consumed
    ]


@router.post("/menu/slots/{slot_id}/cook", response_model=FoodCookResponse)
def cook_slot(
    slot_id: int,
    body: FoodCookBody | None = None,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    """Mark the meal as cooked and, by default, write its ingredients off the pantry."""
    body = body or FoodCookBody()
    slot = _get_slot(db, household_id, slot_id)
    if slot.cooked_at is not None:
        raise HTTPException(status_code=409, detail="Уже приготовлено")
    consumed = []
    if body.consume and slot.dish is not None:
        consumed = consume(db, dish_needs(slot.dish, body.servings or slot.servings),
                           load_pantry(db, household_id=household_id))
    slot.cooked_at = datetime.utcnow()
    db.commit()
    slot = _get_slot(db, household_id, slot_id)
    return FoodCookResponse(consumed=_consumed_lines(consumed), slot=slot_to_response(slot))


@router.post("/menu/slots/{slot_id}/uncook", response_model=FoodCookResponse)
def uncook_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    """Undo the "cooked" mark. Stock is not restored — adjust it in the pantry if needed."""
    slot = _get_slot(db, household_id, slot_id)
    slot.cooked_at = None
    db.commit()
    return FoodCookResponse(consumed=[], slot=slot_to_response(_get_slot(db, household_id, slot_id)))


@router.get("/dishes/{dish_id}/availability", response_model=FoodDishAvailability)
def dish_availability(
    dish_id: int,
    servings: int | None = Query(None, ge=1, le=50),
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    dish = _get_dish(db, household_id, dish_id)
    lines = check_availability(dish_needs(dish, servings), load_pantry(db, household_id=household_id))
    return FoodDishAvailability(
        dish_id=dish.id,
        servings=servings or dish.servings_default or 1,
        readiness=readiness(lines),
        lines=[
            FoodAvailabilityLine(
                ingredient_id=line.need.ingredient_id,
                name=line.need.name,
                need=float(line.need.quantity),
                unit_id=line.need.unit_id,
                unit_code=line.need.unit_code,
                have=float(line.have) if line.have is not None else None,
                missing=float(line.missing),
                status=line.status,
            )
            for line in lines
        ],
    )


@router.post("/dishes/{dish_id}/cook", response_model=FoodCookResponse)
def cook_dish(
    dish_id: int,
    body: FoodCookBody | None = None,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    body = body or FoodCookBody()
    dish = _get_dish(db, household_id, dish_id)
    consumed = consume(db, dish_needs(dish, body.servings), load_pantry(db, household_id=household_id))
    db.commit()
    return FoodCookResponse(consumed=_consumed_lines(consumed))


@router.post("/dishes/{dish_id}/to-shopping", response_model=FoodShoppingAddResult)
def dish_to_shopping(
    dish_id: int,
    body: FoodCookBody | None = None,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    """Put what the dish is missing on the current shopping list."""
    dish = _get_dish(db, household_id, dish_id)
    lst = shop.get_or_create_current_list(db, household_id=household_id)
    added = shop.add_for_dish(db, lst, household_id=household_id, dish=dish, servings=(body.servings if body else None))
    db.commit()
    return FoodShoppingAddResult(list=shopping_list_to_response(shop.reload_list(db, lst.id)), added=added)

