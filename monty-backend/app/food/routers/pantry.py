from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_db
from app.finance.models import User
from app.food.deps import get_food_household_id
from app.food.models import FoodIngredient, FoodPantryItem, FoodStockMovement, FoodStockTransfer, FoodUnit
from app.food.schemas import (
    FoodPantryAdjust,
    FoodPantryItemCreate,
    FoodPantryItemResponse,
    FoodPantryItemUpdate,
    FoodStockMovementResponse,
)
from app.food.services import warehouses
from app.middleware.auth import get_current_user
from app.food.services.aisles import guess_aisle
from app.food.services.inventory import UnitMismatchError, add_stock
from app.food.services.shopping_service import find_ingredient
from app.food.serialization_pantry import pantry_item_to_response

router = APIRouter()


def _pantry_options():
    return (selectinload(FoodPantryItem.ingredient), selectinload(FoodPantryItem.unit),
            selectinload(FoodPantryItem.warehouse))


@router.get("/pantry", response_model=list[FoodPantryItemResponse])
def list_pantry(
    warehouse_id: str | None = Query(None, description="id склада, `all` — все склады; по умолчанию основной"),
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    q = db.query(FoodPantryItem).options(*_pantry_options()).filter(FoodPantryItem.household_id == household_id)
    if warehouse_id != "all":
        try:
            wid = int(warehouse_id) if warehouse_id else None
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="warehouse_id: число или all") from exc
        warehouse = warehouses.resolve_warehouse(db, household_id=household_id, warehouse_id=wid)
        q = q.filter(FoodPantryItem.warehouse_id == warehouse.id)
    rows = q.order_by(FoodPantryItem.id).all()
    items = [pantry_item_to_response(r) for r in rows]
    return sorted(items, key=lambda i: i.ingredient_name.lower())


def _load_row(db: Session, item_id: int) -> FoodPantryItem:
    return db.query(FoodPantryItem).options(*_pantry_options()).filter(FoodPantryItem.id == item_id).one()


@router.post("/pantry", response_model=FoodPantryItemResponse, status_code=status.HTTP_201_CREATED)
def upsert_pantry_item(
    body: FoodPantryItemCreate,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
    current_user: User = Depends(get_current_user),
):
    """Поступление: add stock to a warehouse. Same product → quantities add up (kg/g, l/ml convert)."""
    warehouse = warehouses.resolve_warehouse(db, household_id=household_id, warehouse_id=body.warehouse_id)
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
        row = add_stock(db, household_id=household_id, warehouse_id=warehouse.id, ingredient=ing,
                        quantity=Decimal(str(body.quantity)), unit=unit, location=body.location,
                        kind="receipt", user_id=current_user.id)
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
    current_user: User = Depends(get_current_user),
):
    """Edit a stock row; a changed quantity/unit is journaled as an adjustment (инвентаризация)."""
    row = _get_row(db, household_id, item_id)
    sent = body.model_fields_set
    if body.unit_id is not None and not db.query(FoodUnit).filter(FoodUnit.id == body.unit_id).first():
        raise HTTPException(status_code=400, detail="Invalid unit_id")
    if body.quantity is not None or body.unit_id is not None:
        quantity = Decimal(str(body.quantity)) if body.quantity is not None else Decimal(row.quantity)
        warehouses.set_quantity(db, row, quantity, unit_id=body.unit_id, kind="adjust", user_id=current_user.id)
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
    current_user: User = Depends(get_current_user),
):
    """Quick +/− from the list; never goes below zero."""
    row = _get_row(db, household_id, item_id)
    warehouses.set_quantity(db, row, Decimal(row.quantity) + Decimal(str(body.delta)), kind="adjust",
                            user_id=current_user.id)
    db.commit()
    return pantry_item_to_response(_load_row(db, item_id))


@router.delete("/pantry/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pantry_item(
    item_id: int,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
    current_user: User = Depends(get_current_user),
):
    """Remove the row; any remaining quantity is journaled as written off."""
    row = _get_row(db, household_id, item_id)
    warehouses.record(db, row, -Decimal(row.quantity), "writeoff", user_id=current_user.id, note="Удалено из запасов")
    db.delete(row)
    db.commit()
    return None


@router.get("/pantry/{item_id}/movements", response_model=list[FoodStockMovementResponse])
def pantry_item_movements(
    item_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    """История движения продукта на этом складе, новые сверху."""
    row = _get_row(db, household_id, item_id)
    moves = (
        db.query(FoodStockMovement)
        .options(selectinload(FoodStockMovement.unit), selectinload(FoodStockMovement.warehouse))
        .filter(FoodStockMovement.warehouse_id == row.warehouse_id, FoodStockMovement.ingredient_id == row.ingredient_id)
        .order_by(FoodStockMovement.created_at.desc(), FoodStockMovement.id.desc())
        .limit(limit)
        .all()
    )
    users = {u.id: u.first_name for u in db.query(User).filter(User.id.in_({m.user_id for m in moves if m.user_id})).all()}
    numbers = dict(db.query(FoodStockTransfer.id, FoodStockTransfer.number).filter(
        FoodStockTransfer.id.in_({m.transfer_id for m in moves if m.transfer_id})).all())
    return [
        FoodStockMovementResponse(
            id=m.id, created_at=m.created_at, kind=m.kind, quantity=float(m.quantity),
            unit_code=m.unit.code if m.unit else "", warehouse_id=m.warehouse_id,
            warehouse_name=m.warehouse.name if m.warehouse else "", transfer_id=m.transfer_id,
            transfer_number=numbers.get(m.transfer_id), note=m.note, user_name=users.get(m.user_id),
        )
        for m in moves
    ]
