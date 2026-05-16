"""Global food measurement units (shared across households)."""

from sqlalchemy.orm import Session

from app.food.models import FoodUnit

DEFAULT_UNITS: list[tuple[str, str, str]] = [
    ("g", "грамм", "metric"),
    ("ml", "миллилитр", "metric"),
    ("pcs", "шт.", "metric"),
    ("tbsp", "ст. л.", "metric"),
    ("tsp", "ч. л.", "metric"),
    ("pinch", "щепотка", "metric"),
]


def ensure_default_units(db: Session) -> None:
    if db.query(FoodUnit).count() > 0:
        return
    for code, name, system in DEFAULT_UNITS:
        db.add(FoodUnit(code=code, name=name, system=system))
    db.commit()
