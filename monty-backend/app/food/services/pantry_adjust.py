"""Subtract household pantry stock from aggregated shopping totals."""

from decimal import Decimal

from sqlalchemy.orm import Session

from app.food.models import FoodPantryItem


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
) -> tuple[dict[tuple[int, int], Decimal], set[tuple[int, int]]]:
    """
    Returns adjusted totals and keys where pantry has the ingredient in a different unit
    (no subtraction applied per D6 MVP).
    """
    adjusted: dict[tuple[int, int], Decimal] = {}
    unit_mismatch: set[tuple[int, int]] = set()

    for key, need in totals.items():
        ing_id, unit_id = key
        stock = pantry.get(key)
        if stock is not None:
            net = need - stock
            adjusted[key] = net if net > 0 else Decimal(0)
            continue

        other_units = [u for (i, u), _q in pantry.items() if i == ing_id and u != unit_id]
        if other_units:
            unit_mismatch.add(key)
            adjusted[key] = need
            continue

        adjusted[key] = need

    return adjusted, unit_mismatch
