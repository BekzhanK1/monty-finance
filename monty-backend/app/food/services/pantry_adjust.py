"""Subtract household pantry stock from aggregated shopping totals."""

from decimal import Decimal

from sqlalchemy.orm import Session

from app.food.models import FoodPantryItem, FoodUnit
from app.food.services.units import convert


def load_pantry_by_ingredient_unit(
    db: Session,
    *,
    household_id: int,
) -> dict[tuple[int, int], Decimal]:
    rows = (
        db.query(FoodPantryItem)
        .filter(FoodPantryItem.household_id == household_id)
        .all()
    )
    return {(r.ingredient_id, r.unit_id): Decimal(r.quantity) for r in rows}


def apply_pantry_to_totals(
    totals: dict[tuple[int, int], Decimal],
    pantry: dict[tuple[int, int], Decimal],
    unit_codes: dict[int, str] | None = None,
) -> tuple[dict[tuple[int, int], Decimal], set[tuple[int, int]]]:
    """
    Subtract stock from needed totals. With `unit_codes` ({unit_id: code}) stock in a
    compatible unit is converted (kg→g, l→ml). Returns adjusted totals and the keys where
    stock exists only in an incompatible unit (left unsubtracted).
    """
    codes = unit_codes or {}
    adjusted: dict[tuple[int, int], Decimal] = {}
    unit_mismatch: set[tuple[int, int]] = set()

    for key, need in totals.items():
        ing_id, unit_id = key
        stock = Decimal(0)
        found = False
        mismatch = False
        for (p_ing, p_unit), qty in pantry.items():
            if p_ing != ing_id:
                continue
            if p_unit == unit_id:
                stock += qty
                found = True
                continue
            converted = convert(qty, codes.get(p_unit, ""), codes.get(unit_id, "")) if codes else None
            if converted is None:
                mismatch = True
            else:
                stock += converted
                found = True
        if found:
            net = need - stock
            adjusted[key] = net if net > 0 else Decimal(0)
        else:
            adjusted[key] = need
            if mismatch:
                unit_mismatch.add(key)

    return adjusted, unit_mismatch


def unit_code_map(db: Session) -> dict[int, str]:
    return {unit_id: code for unit_id, code in db.query(FoodUnit.id, FoodUnit.code).all()}
