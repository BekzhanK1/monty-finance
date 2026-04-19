from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_db
from app.finance.models import User
from app.food.models import FoodIngredient, FoodPantryItem, FoodUnit, MVP_HOUSEHOLD_ID
from app.food.schemas import FoodPantryItemCreate, FoodPantryItemResponse, FoodPantryItemUpdate
from app.food.serialization_pantry import pantry_item_to_response
from app.middleware.auth import get_current_user

router = APIRouter()


def _pantry_options():
    return selectinload(FoodPantryItem.ingredient), selectinload(FoodPantryItem.unit)


@router.get("/pantry", response_model=list[FoodPantryItemResponse])
def list_pantry(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(FoodPantryItem)
        .options(_pantry_options())
        .filter(FoodPantryItem.household_id == MVP_HOUSEHOLD_ID)
        .order_by(FoodPantryItem.updated_at.desc(), FoodPantryItem.id.desc())
        .all()
    )
    return [pantry_item_to_response(r) for r in rows]


@router.post("/pantry", response_model=FoodPantryItemResponse, status_code=status.HTTP_201_CREATED)
def upsert_pantry_item(
    body: FoodPantryItemCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ing = (
        db.query(FoodIngredient)
        .filter(FoodIngredient.id == body.ingredient_id, FoodIngredient.household_id == MVP_HOUSEHOLD_ID)
        .first()
    )
    if not ing:
        raise HTTPException(status_code=400, detail="Invalid ingredient_id")
    unit = db.query(FoodUnit).filter(FoodUnit.id == body.unit_id).first()
    if not unit:
        raise HTTPException(status_code=400, detail="Invalid unit_id")

    existing = (
        db.query(FoodPantryItem)
        .filter(
            FoodPantryItem.household_id == MVP_HOUSEHOLD_ID,
            FoodPantryItem.ingredient_id == body.ingredient_id,
        )
        .first()
    )
    qty = Decimal(str(body.quantity))
    if existing:
        if existing.unit_id != body.unit_id:
            raise HTTPException(
                status_code=400,
                detail="Этот продукт уже в кладовой в другой единице — удалите строку или измените её вручную.",
            )
        existing.quantity = Decimal(existing.quantity) + qty
        if body.note is not None:
            existing.note = body.note
        db.commit()
        db.refresh(existing)
        row = db.query(FoodPantryItem).options(_pantry_options()).filter(FoodPantryItem.id == existing.id).first()
        return pantry_item_to_response(row)

    row = FoodPantryItem(
        household_id=MVP_HOUSEHOLD_ID,
        ingredient_id=body.ingredient_id,
        quantity=qty,
        unit_id=body.unit_id,
        note=body.note,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    r = db.query(FoodPantryItem).options(_pantry_options()).filter(FoodPantryItem.id == row.id).first()
    return pantry_item_to_response(r)


@router.patch("/pantry/{item_id}", response_model=FoodPantryItemResponse)
def update_pantry_item(
    item_id: int,
    body: FoodPantryItemUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (
        db.query(FoodPantryItem)
        .filter(FoodPantryItem.id == item_id, FoodPantryItem.household_id == MVP_HOUSEHOLD_ID)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if body.quantity is not None:
        row.quantity = Decimal(str(body.quantity))
    if body.unit_id is not None:
        u = db.query(FoodUnit).filter(FoodUnit.id == body.unit_id).first()
        if not u:
            raise HTTPException(status_code=400, detail="Invalid unit_id")
        row.unit_id = body.unit_id
    if body.note is not None:
        row.note = body.note
    db.commit()
    r = db.query(FoodPantryItem).options(_pantry_options()).filter(FoodPantryItem.id == item_id).first()
    return pantry_item_to_response(r)


@router.delete("/pantry/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pantry_item(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (
        db.query(FoodPantryItem)
        .filter(FoodPantryItem.id == item_id, FoodPantryItem.household_id == MVP_HOUSEHOLD_ID)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(row)
    db.commit()
    return None
