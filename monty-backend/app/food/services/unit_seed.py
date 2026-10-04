"""Global food measurement units (shared across households)."""

from sqlalchemy.orm import Session

from app.food.models import FoodUnit

DEFAULT_UNITS: list[tuple[str, str, str]] = [
    ("g", "грамм", "metric"),
    ("kg", "кг", "metric"),
    ("ml", "миллилитр", "metric"),
    ("l", "литр", "metric"),
    ("pcs", "шт.", "metric"),
    ("pack", "уп.", "metric"),
    ("tbsp", "ст. л.", "metric"),
    ("tsp", "ч. л.", "metric"),
    ("pinch", "щепотка", "metric"),
]


def ensure_default_units(db: Session) -> None:
    """Insert any missing default unit (by code); existing rows are left alone."""
    existing = {code for (code,) in db.query(FoodUnit.code).all()}
    missing = [u for u in DEFAULT_UNITS if u[0] not in existing]
    if not missing:
        return
    for code, name, system in missing:
        db.add(FoodUnit(code=code, name=name, system=system))
    db.commit()
