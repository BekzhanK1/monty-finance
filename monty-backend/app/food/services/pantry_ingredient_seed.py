"""Starter pantry-default ingredients (salt, pepper, oil) per household."""

from sqlalchemy.orm import Session

from app.food.models import FoodIngredient, FoodUnit
from app.food.services.unit_seed import ensure_default_units

# name, unit code
PANTRY_DEFAULT_INGREDIENTS: list[tuple[str, str]] = [
    ("Соль", "pinch"),
    ("Перец", "pinch"),
    ("Масло растительное", "ml"),
]


def seed_pantry_default_ingredients(db: Session, household_id: int) -> None:
    ensure_default_units(db)
    units = {u.code: u for u in db.query(FoodUnit).all()}
    existing_names = {
        row.name.strip().lower()
        for row in db.query(FoodIngredient)
        .filter(FoodIngredient.household_id == household_id)
        .all()
    }
    for name, unit_code in PANTRY_DEFAULT_INGREDIENTS:
        if name.strip().lower() in existing_names:
            continue
        unit = units.get(unit_code)
        if unit is None:
            continue
        db.add(
            FoodIngredient(
                household_id=household_id,
                name=name,
                default_unit_id=unit.id,
                category="специи и масла",
                is_pantry_default=True,
            )
        )
        existing_names.add(name.strip().lower())
    db.commit()
