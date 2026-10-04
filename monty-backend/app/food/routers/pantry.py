from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_db
from app.food.deps import get_food_household_id
from app.food.models import FoodIngredient, FoodPantryItem, FoodUnit
from app.food.schemas import FoodPantryAdjust, FoodPantryItemCreate, FoodPantryItemResponse, FoodPantryItemUpdate
from app.food.services.aisles import guess_aisle
from app.food.services.inventory import UnitMismatchError, add_stock
from app.food.services.shopping_service import find_ingredient
from app.food.serialization_pantry import pantry_item_to_response

router = APIRouter()


def _pantry_options():
    return selectinload(FoodPantryItem.ingredient), selectinload(FoodPantryItem.unit)


@router.get("/pantry", response_model=list[FoodPantryItemResponse])
def list_pantry(
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    rows = (
        db.query(FoodPantryItem)
        .options(*_pantry_options())
        .filter(FoodPantryItem.household_id == household_id)
        .order_by(FoodPantryItem.id)
        .all()
    )
    items = [pantry_item_to_response(r) for r in rows]
    return sorted(items, key=lambda i: i.ingredient_name.lower())


def _load_row(db: Session, item_id: int) -> FoodPantryItem:
    return db.query(FoodPantryItem).options(*_pantry_options()).filter(FoodPantryItem.id == item_id).one()


@router.post("/pantry", response_model=FoodPantryItemResponse, status_code=status.HTTP_201_CREATED)
def upsert_pantry_item(
    body: FoodPantryItemCreate,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    """Add stock. Same product → quantities add up (converted between kg/g, l/ml)."""
    unit = db.query(FoodUnit).filter(FoodUnit.id == body.unit_id).first()
    if not unit:
        raise HTTPException(status_code=400, detail="Invalid unit_id")

    if body.ingredient_id is not None:
        ing = (
            db.query(FoodIngredient)
            .filter(FoodIngredient.id == body.ingredient_id, FoodIngredient.household_id == household_id)
            .first()
        )
        if not ing:
            raise HTTPException(status_code=400, detail="Invalid ingredient_id")
    else:
        ing = find_ingredient(db, household_id=household_id, label=body.name or "")
        if ing is None:
            name = (body.name or "").strip()
            ing = FoodIngredient(household_id=household_id, name=name, default_unit_id=unit.id,
                                 category=guess_aisle(name))
            db.add(ing)
            db.flush()

    try:
        row = add_stock(db, household_id=household_id, ingredient=ing, quantity=Decimal(str(body.quantity)),
                        unit=unit, location=body.location)
    except UnitMismatchError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if body.expires_on is not None:
        row.expires_on = body.expires_on
    if body.min_quantity is not None:
        row.min_quantity = Decimal(str(body.min_quantity))
    if body.note is not None:
        row.note = body.note
    db.commit()
    return pantry_item_to_response(_load_row(db, row.id))


def _get_row(db: Session, household_id: int, item_id: int) -> FoodPantryItem:
    row = (
        db.query(FoodPantryItem)
        .filter(FoodPantryItem.id == item_id, FoodPantryItem.household_id == household_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return row


@router.patch("/pantry/{item_id}", response_model=FoodPantryItemResponse)
def update_pantry_item(
    item_id: int,
    body: FoodPantryItemUpdate,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    row = _get_row(db, household_id, item_id)
    sent = body.model_fields_set
    if body.quantity is not None:
        row.quantity = Decimal(str(body.quantity))
    if body.unit_id is not None:
        u = db.query(FoodUnit).filter(FoodUnit.id == body.unit_id).first()
        if not u:
            raise HTTPException(status_code=400, detail="Invalid unit_id")
        row.unit_id = body.unit_id
    if body.note is not None:
        row.note = body.note
    if body.location is not None:
        row.location = body.location
    if "expires_on" in sent:
        row.expires_on = body.expires_on
    if "min_quantity" in sent:
        row.min_quantity = Decimal(str(body.min_quantity)) if body.min_quantity is not None else None
    row.updated_at = datetime.utcnow()
    db.commit()
    return pantry_item_to_response(_load_row(db, item_id))


@router.post("/pantry/{item_id}/adjust", response_model=FoodPantryItemResponse)
def adjust_pantry_item(
    item_id: int,
    body: FoodPantryAdjust,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    """Quick +/− from the list; never goes below zero."""
    row = _get_row(db, household_id, item_id)
    row.quantity = max(Decimal(0), Decimal(row.quantity) + Decimal(str(body.delta)))
    row.updated_at = datetime.utcnow()
    db.commit()
    return pantry_item_to_response(_load_row(db, item_id))


@router.delete("/pantry/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pantry_item(
    item_id: int,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    row = (
        db.query(FoodPantryItem)
        .filter(FoodPantryItem.id == item_id, FoodPantryItem.household_id == household_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(row)
    db.commit()
    return None
