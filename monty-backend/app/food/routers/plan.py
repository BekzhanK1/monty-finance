from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_db
from app.finance.models import User
from app.food.models import FoodDish, FoodMealSlot, MVP_HOUSEHOLD_ID
from app.food.schemas import FoodMealSlotCreate, FoodMealSlotResponse, FoodMealSlotUpdate
from app.food.serialization import slot_to_response
from app.middleware.auth import get_current_user

router = APIRouter()

ALLOWED_SLOT_KEYS = frozenset({"breakfast", "lunch", "dinner", "snack"})


def _slot_load():
    return selectinload(FoodMealSlot.dish)


@router.get("/menu", response_model=list[FoodMealSlotResponse])
def list_menu_slots(
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if date_to < date_from:
        raise HTTPException(status_code=400, detail="Invalid date range")
    rows = (
        db.query(FoodMealSlot)
        .options(_slot_load())
        .filter(
            FoodMealSlot.household_id == MVP_HOUSEHOLD_ID,
            FoodMealSlot.slot_date >= date_from,
            FoodMealSlot.slot_date <= date_to,
        )
        .order_by(FoodMealSlot.slot_date, FoodMealSlot.slot_key, FoodMealSlot.id)
        .all()
    )
    return [slot_to_response(s) for s in rows]


@router.post("/menu/slots", response_model=FoodMealSlotResponse, status_code=status.HTTP_201_CREATED)
def create_menu_slot(
    body: FoodMealSlotCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if body.slot_key not in ALLOWED_SLOT_KEYS:
        raise HTTPException(status_code=400, detail="Invalid slot_key")
    if body.dish_id is not None:
        dish = (
            db.query(FoodDish)
            .filter(FoodDish.id == body.dish_id, FoodDish.household_id == MVP_HOUSEHOLD_ID)
            .first()
        )
        if not dish:
            raise HTTPException(status_code=400, detail="Invalid dish_id")
    row = FoodMealSlot(
        household_id=MVP_HOUSEHOLD_ID,
        slot_date=body.slot_date,
        slot_key=body.slot_key,
        dish_id=body.dish_id,
        custom_title=body.custom_title.strip() if body.custom_title else None,
        servings=body.servings,
        notes=body.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    s = db.query(FoodMealSlot).options(_slot_load()).filter(FoodMealSlot.id == row.id).first()
    return slot_to_response(s)


@router.patch("/menu/slots/{slot_id}", response_model=FoodMealSlotResponse)
def update_menu_slot(
    slot_id: int,
    body: FoodMealSlotUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (
        db.query(FoodMealSlot)
        .options(_slot_load())
        .filter(FoodMealSlot.id == slot_id, FoodMealSlot.household_id == MVP_HOUSEHOLD_ID)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Slot not found")

    if "dish_id" in body.model_fields_set:
        if body.dish_id is not None:
            dish = (
                db.query(FoodDish)
                .filter(FoodDish.id == body.dish_id, FoodDish.household_id == MVP_HOUSEHOLD_ID)
                .first()
            )
            if not dish:
                raise HTTPException(status_code=400, detail="Invalid dish_id")
        row.dish_id = body.dish_id

    if "custom_title" in body.model_fields_set:
        row.custom_title = body.custom_title.strip() if body.custom_title else None

    if body.servings is not None:
        row.servings = body.servings

    if "notes" in body.model_fields_set:
        row.notes = body.notes

    if body.servings is not None:
        row.servings = body.servings

    db.commit()
    s = db.query(FoodMealSlot).options(_slot_load()).filter(FoodMealSlot.id == slot_id).first()
    return slot_to_response(s)


@router.delete("/menu/slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (
        db.query(FoodMealSlot)
        .filter(FoodMealSlot.id == slot_id, FoodMealSlot.household_id == MVP_HOUSEHOLD_ID)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Slot not found")
    db.delete(row)
    db.commit()
    return None
