"""Warehouses and the stock movement journal."""

from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.food.models import FoodPantryItem, FoodStockMovement, FoodWarehouse

DEFAULT_NAME = "Дом"


def list_warehouses(db: Session, *, household_id: int, include_archived: bool = False) -> list[FoodWarehouse]:
    q = db.query(FoodWarehouse).filter(FoodWarehouse.household_id == household_id)
    if not include_archived:
        q = q.filter(FoodWarehouse.is_archived.is_(False))
    return q.order_by(FoodWarehouse.sort_order, FoodWarehouse.id).all()


def ensure_default_warehouse(db: Session, *, household_id: int) -> FoodWarehouse:
    """The household's default warehouse, creating «Дом» on first use."""
    rows = list_warehouses(db, household_id=household_id)
    default = next((w for w in rows if w.is_default), None)
    if default:
        return default
    if rows:
        rows[0].is_default = True
        db.flush()
        return rows[0]
    warehouse = FoodWarehouse(household_id=household_id, name=DEFAULT_NAME, emoji="🏠", is_default=True)
    db.add(warehouse)
    db.flush()
    return warehouse


def resolve_warehouse(db: Session, *, household_id: int, warehouse_id: int | None) -> FoodWarehouse:
    """An explicit active warehouse of this household, or the default one."""
    if warehouse_id is None:
        return ensure_default_warehouse(db, household_id=household_id)
    warehouse = (
        db.query(FoodWarehouse)
        .filter(FoodWarehouse.id == warehouse_id, FoodWarehouse.household_id == household_id)
        .first()
    )
    if warehouse is None or warehouse.is_archived:
        raise HTTPException(status_code=404, detail="Склад не найден")
    return warehouse


def record(
    db: Session,
    row: FoodPantryItem,
    delta: Decimal,
    kind: str,
    *,
    user_id: int | None = None,
    transfer_id: int | None = None,
    note: str | None = None,
) -> None:
    """Journal one change of `row` (signed, in the row's current unit). Zero changes are skipped."""
    if delta == 0:
        return
    db.add(FoodStockMovement(
        household_id=row.household_id,
        warehouse_id=row.warehouse_id,
        ingredient_id=row.ingredient_id,
        quantity=delta,
        unit_id=row.unit_id,
        kind=kind,
        transfer_id=transfer_id,
        note=note,
        user_id=user_id,
        created_at=datetime.utcnow(),
    ))


def set_quantity(
    db: Session,
    row: FoodPantryItem,
    quantity: Decimal,
    *,
    unit_id: int | None = None,
    kind: str = "adjust",
    user_id: int | None = None,
    transfer_id: int | None = None,
    note: str | None = None,
) -> None:
    """Set stock to an exact value (stock count / manual edit), journaling the difference.

    A unit change is journaled as writing off the old quantity and receiving the new one.
    """
    quantity = max(Decimal(0), quantity)
    if unit_id is not None and unit_id != row.unit_id:
        journal = dict(user_id=user_id, transfer_id=transfer_id, note=note)
        record(db, row, -Decimal(row.quantity), kind, **journal)
        row.unit_id = unit_id
        row.quantity = quantity
        db.flush()
        record(db, row, quantity, kind, **journal)
    else:
        record(db, row, quantity - Decimal(row.quantity), kind, user_id=user_id, transfer_id=transfer_id, note=note)
        row.quantity = quantity
    row.updated_at = datetime.utcnow()
