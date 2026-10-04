"""Перемещение между складами: posting checks the source has enough, cancelling checks the destination still does."""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.food.models import (
    FoodIngredient,
    FoodPantryItem,
    FoodStockTransfer,
    FoodStockTransferLine,
    FoodUnit,
    FoodWarehouse,
)
from app.food.services import warehouses
from app.food.services.inventory import UnitMismatchError, add_stock
from app.food.services.units import convert


class TransferError(ValueError):
    pass


@dataclass
class LineInput:
    ingredient: FoodIngredient
    quantity: Decimal
    unit: FoodUnit


def _fmt(q: Decimal) -> str:
    return f"{q.normalize():f}".replace(".", ",")


def _row(db: Session, warehouse_id: int, ingredient_id: int) -> FoodPantryItem | None:
    return (
        db.query(FoodPantryItem)
        .options(selectinload(FoodPantryItem.unit))
        .filter(FoodPantryItem.warehouse_id == warehouse_id, FoodPantryItem.ingredient_id == ingredient_id)
        .first()
    )


def _take(db: Session, warehouse: FoodWarehouse, ingredient: FoodIngredient, quantity: Decimal, unit: FoodUnit) -> tuple[FoodPantryItem, Decimal]:
    """Validate that `warehouse` holds `quantity` of the ingredient; returns (row, amount in row unit)."""
    row = _row(db, warehouse.id, ingredient.id)
    if row is None or Decimal(row.quantity) <= 0:
        raise TransferError(f"«{ingredient.name}»: нет на складе «{warehouse.name}»")
    amount = convert(quantity, unit.code, row.unit.code)
    if amount is None:
        raise TransferError(f"«{ingredient.name}»: на складе в единицах «{row.unit.name}», нельзя переместить в «{unit.name}»")
    if amount > Decimal(row.quantity):
        raise TransferError(
            f"«{ingredient.name}»: недостаточно на складе «{warehouse.name}» — "
            f"есть {_fmt(Decimal(row.quantity))} {row.unit.name}, нужно {_fmt(amount)}"
        )
    return row, amount


def post_transfer(
    db: Session,
    *,
    household_id: int,
    source: FoodWarehouse,
    target: FoodWarehouse,
    lines: list[LineInput],
    comment: str | None,
    user_id: int | None,
) -> FoodStockTransfer:
    """Create and post the document atomically: nothing moves unless every line is covered."""
    if source.id == target.id:
        raise TransferError("Склады отправления и назначения совпадают")
    if not lines:
        raise TransferError("Добавьте хотя бы один продукт")
    if len({line.ingredient.id for line in lines}) != len(lines):
        raise TransferError("Один продукт указан несколько раз — объедините строки")

    # Validate everything first so a failing line leaves stock untouched.
    taken = [(_take(db, source, line.ingredient, line.quantity, line.unit), line) for line in lines]

    number = (db.query(func.coalesce(func.max(FoodStockTransfer.number), 0))
              .filter(FoodStockTransfer.household_id == household_id).scalar()) + 1
    doc = FoodStockTransfer(
        household_id=household_id, number=number, from_warehouse_id=source.id, to_warehouse_id=target.id,
        comment=(comment or "").strip()[:300] or None, user_id=user_id, created_at=datetime.utcnow(),
    )
    db.add(doc)
    db.flush()

    for (row, amount), line in taken:
        db.add(FoodStockTransferLine(transfer_id=doc.id, ingredient_id=line.ingredient.id,
                                     quantity=amount, unit_id=row.unit_id))
        warehouses.record(db, row, -amount, "transfer_out", user_id=user_id, transfer_id=doc.id)
        row.quantity = Decimal(row.quantity) - amount
        row.updated_at = datetime.utcnow()
        try:
            add_stock(db, household_id=household_id, warehouse_id=target.id, ingredient=line.ingredient,
                      quantity=amount, unit=row.unit, location=row.location, kind="transfer_in",
                      user_id=user_id, transfer_id=doc.id)
        except UnitMismatchError as exc:
            db.rollback()
            raise TransferError(str(exc).replace("в запасах", f"на складе «{target.name}»")) from exc
    db.commit()
    return load_transfer(db, doc.id)


def cancel_transfer(db: Session, doc: FoodStockTransfer, *, user_id: int | None) -> FoodStockTransfer:
    """Unpost: move every line back. Fails if the destination no longer has the goods."""
    if doc.cancelled_at is not None:
        raise TransferError("Документ уже отменён")
    source, target = doc.from_warehouse, doc.to_warehouse
    taken = [(_take(db, target, line.ingredient, Decimal(line.quantity), line.unit), line) for line in doc.lines]
    for (row, amount), line in taken:
        warehouses.record(db, row, -amount, "transfer_cancel", user_id=user_id, transfer_id=doc.id)
        row.quantity = Decimal(row.quantity) - amount
        row.updated_at = datetime.utcnow()
        try:
            add_stock(db, household_id=doc.household_id, warehouse_id=source.id, ingredient=line.ingredient,
                      quantity=amount, unit=row.unit, location=row.location, kind="transfer_cancel",
                      user_id=user_id, transfer_id=doc.id)
        except UnitMismatchError as exc:
            db.rollback()
            raise TransferError(str(exc).replace("в запасах", f"на складе «{source.name}»")) from exc
    doc.cancelled_at = datetime.utcnow()
    db.commit()
    return load_transfer(db, doc.id)


def load_transfer(db: Session, transfer_id: int) -> FoodStockTransfer:
    return (
        db.query(FoodStockTransfer)
        .options(
            selectinload(FoodStockTransfer.lines).selectinload(FoodStockTransferLine.ingredient),
            selectinload(FoodStockTransfer.lines).selectinload(FoodStockTransferLine.unit),
            selectinload(FoodStockTransfer.from_warehouse),
            selectinload(FoodStockTransfer.to_warehouse),
        )
        .filter(FoodStockTransfer.id == transfer_id)
        .one()
    )
