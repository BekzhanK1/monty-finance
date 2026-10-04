"""Home stock: what a dish needs vs what is in the pantry, cooking (consume) and restocking.

One stock row per ingredient per warehouse; every change is journaled (services/warehouses.py).
Quantities convert between compatible units (kg↔g, l↔ml); anything else is reported as a
unit mismatch and never guessed.
"""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Literal

from sqlalchemy.orm import Session, selectinload

from app.food.models import FoodDish, FoodDishIngredient, FoodIngredient, FoodPantryItem, FoodUnit
from app.food.services import warehouses
from app.food.services.aisles import aisle_for, default_location
from app.food.services.units import convert

LineStatus = Literal["ok", "short", "none", "unit_mismatch", "always_home"]
Readiness = Literal["ready", "partial", "missing"]


@dataclass
class Need:
    ingredient_id: int
    name: str
    quantity: Decimal
    unit_id: int
    unit_code: str
    always_home: bool = False


@dataclass
class LineAvailability:
    need: Need
    have: Decimal | None  # in the need's unit; None when absent or not convertible
    missing: Decimal
    status: LineStatus


def load_pantry(db: Session, *, household_id: int, warehouse_id: int) -> dict[int, FoodPantryItem]:
    rows = (
        db.query(FoodPantryItem)
        .options(selectinload(FoodPantryItem.unit), selectinload(FoodPantryItem.ingredient))
        .filter(FoodPantryItem.household_id == household_id, FoodPantryItem.warehouse_id == warehouse_id)
        .all()
    )
    return {row.ingredient_id: row for row in rows}


def dish_needs(dish: FoodDish, servings: int | None = None) -> list[Need]:
    """Ingredient lines scaled from the dish's default servings to `servings`."""
    base = max(dish.servings_default or 1, 1)
    factor = Decimal(servings or base) / Decimal(base)
    needs: list[Need] = []
    for line in sorted(dish.ingredients or [], key=lambda x: (x.sort_order, x.id)):
        ing = line.ingredient
        needs.append(
            Need(
                ingredient_id=line.ingredient_id,
                name=ing.name if ing else f"#{line.ingredient_id}",
                quantity=Decimal(line.quantity) * factor,
                unit_id=line.unit_id,
                unit_code=line.unit.code if line.unit else "",
                always_home=bool(ing and ing.is_pantry_default and not line.is_optional),
            )
        )
    return needs


def check_availability(needs: list[Need], pantry: dict[int, FoodPantryItem]) -> list[LineAvailability]:
    result: list[LineAvailability] = []
    for need in needs:
        if need.always_home:
            result.append(LineAvailability(need, None, Decimal(0), "always_home"))
            continue
        row = pantry.get(need.ingredient_id)
        if row is None or Decimal(row.quantity) <= 0:
            result.append(LineAvailability(need, Decimal(0) if row else None, need.quantity, "none"))
            continue
        have = convert(Decimal(row.quantity), row.unit.code if row.unit else "", need.unit_code)
        if have is None:
            result.append(LineAvailability(need, None, need.quantity, "unit_mismatch"))
        elif have >= need.quantity:
            result.append(LineAvailability(need, have, Decimal(0), "ok"))
        else:
            result.append(LineAvailability(need, have, need.quantity - have, "short"))
    return result


def readiness(lines: list[LineAvailability]) -> Readiness:
    counted = [line for line in lines if line.status != "always_home"]
    if not counted:
        return "missing"
    ok = sum(1 for line in counted if line.status == "ok")
    if ok == len(counted):
        return "ready"
    if ok > 0 or any(line.status in ("short", "unit_mismatch") for line in counted):
        return "partial"
    return "missing"


@dataclass
class Consumed:
    ingredient_id: int
    name: str
    quantity: Decimal  # in the pantry row's unit
    unit_code: str
    shortfall: bool  # pantry had less than the recipe asked for


def consume(
    db: Session,
    needs: list[Need],
    pantry: dict[int, FoodPantryItem],
    *,
    user_id: int | None = None,
    note: str | None = None,
) -> list[Consumed]:
    """Subtract `needs` from one warehouse's stock (never below zero), journaled as cooking. Caller commits."""
    consumed: list[Consumed] = []
    for need in needs:
        if need.always_home:
            continue
        row = pantry.get(need.ingredient_id)
        if row is None:
            continue
        row_code = row.unit.code if row.unit else ""
        amount = convert(need.quantity, need.unit_code, row_code)
        if amount is None:
            continue
        stock = Decimal(row.quantity)
        taken = min(stock, amount)
        if taken <= 0:
            continue
        warehouses.record(db, row, -taken, "cook", user_id=user_id, note=note)
        row.quantity = stock - taken
        row.updated_at = datetime.utcnow()
        consumed.append(Consumed(row.ingredient_id, need.name, taken, row_code, shortfall=taken < amount))
    return consumed


class UnitMismatchError(ValueError):
    pass


def add_stock(
    db: Session,
    *,
    household_id: int,
    warehouse_id: int,
    ingredient: FoodIngredient,
    quantity: Decimal,
    unit: FoodUnit,
    location: str | None = None,
    kind: str = "receipt",
    user_id: int | None = None,
    transfer_id: int | None = None,
    note: str | None = None,
) -> FoodPantryItem:
    """Add to the ingredient's row in a warehouse, converting into its unit; creates the row if needed.

    An empty row in an incompatible unit simply switches to the new unit. Journaled as `kind`.
    """
    journal = dict(user_id=user_id, transfer_id=transfer_id, note=note)
    row = (
        db.query(FoodPantryItem)
        .options(selectinload(FoodPantryItem.unit))
        .filter(FoodPantryItem.warehouse_id == warehouse_id, FoodPantryItem.ingredient_id == ingredient.id)
        .first()
    )
    if row is None:
        row = FoodPantryItem(
            household_id=household_id,
            warehouse_id=warehouse_id,
            ingredient_id=ingredient.id,
            quantity=quantity,
            unit_id=unit.id,
            location=location or default_location(aisle_for(ingredient.category, ingredient.name)),
        )
        db.add(row)
        db.flush()
        warehouses.record(db, row, quantity, kind, **journal)
        return row

    row_code = row.unit.code if row.unit else ""
    converted = convert(quantity, unit.code, row_code)
    if converted is None:
        if Decimal(row.quantity) > 0:
            raise UnitMismatchError(
                f"«{ingredient.name}» уже лежит в запасах в единицах «{row.unit.name if row.unit else row_code}» — "
                f"их нельзя сложить с «{unit.name}»."
            )
        warehouses.set_quantity(db, row, quantity, unit_id=unit.id, kind=kind, **journal)
    else:
        warehouses.record(db, row, converted, kind, **journal)
        row.quantity = Decimal(row.quantity) + converted
    if location:
        row.location = location
    row.updated_at = datetime.utcnow()
    return row


def dish_load_options():
    return (
        selectinload(FoodDish.ingredients).selectinload(FoodDishIngredient.ingredient),
        selectinload(FoodDish.ingredients).selectinload(FoodDishIngredient.unit),
    )
