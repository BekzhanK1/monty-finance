"""Dish readiness from pantry stock (D12), with unit conversion (D14)."""

from sqlalchemy.orm import Session

from app.food.models import FoodDish
from app.food.services.inventory import Readiness, check_availability, dish_needs, load_pantry, readiness

DishPantryStatus = Readiness


def calculate_dish_pantry_status(
    db: Session,
    *,
    household_id: int,
    dish: FoodDish,
    pantry: dict | None = None,
) -> DishPantryStatus:
    """ready — everything in stock; partial — some of it; missing — nothing or no composition."""
    stock = pantry if pantry is not None else load_pantry(db, household_id=household_id)
    return readiness(check_availability(dish_needs(dish), stock))
