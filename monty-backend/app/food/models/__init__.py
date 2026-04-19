"""Food ORM — import submodules so metadata registers all tables."""

from app.food.models._constants import MVP_HOUSEHOLD_ID
from app.food.models.catalog import FoodDishIngredient, FoodIngredient, FoodUnit
from app.food.models.meal import FoodDish, FoodMealCategory
from app.food.models.plan import FoodMealSlot

__all__ = [
    "MVP_HOUSEHOLD_ID",
    "FoodMealCategory",
    "FoodDish",
    "FoodUnit",
    "FoodIngredient",
    "FoodDishIngredient",
    "FoodMealSlot",
]
