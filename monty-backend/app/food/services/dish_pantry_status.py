"""Dish readiness from pantry stock (D12), with unit conversion (D14)."""

from sqlalchemy.orm import Session

from app.food.models import FoodDish
from app.food.services.inventory import Readiness, check_availability, dish_needs, readiness

DishPantryStatus = Readiness


def calculate_dish_pantry_status(
    db: Session,
    *,
    household_id: int,
    dish: FoodDish,
    pantry: dict,
) -> DishPantryStatus:
    """ready — everything in `pantry` (one warehouse's stock); partial — some of it; missing — nothing."""
    return readiness(check_availability(dish_needs(dish), pantry))
