"""
ORM barrel: import subpackages so `Base.metadata` includes every table.

Prefer importing from `app.finance.models` or `app.food.models` in new code.
"""

from app.finance import models as _finance_models  # noqa: F401
from app.food import models as _food_models  # noqa: F401

from app.finance.models import (
    Category,
    CategoryGroup,
    MonthlyBudget,
    Settings,
    Transaction,
    TransactionType,
    User,
)
from app.food.models import FoodDish, FoodMealCategory, MVP_HOUSEHOLD_ID

__all__ = [
    "User",
    "Category",
    "MonthlyBudget",
    "Transaction",
    "Settings",
    "CategoryGroup",
    "TransactionType",
    "FoodMealCategory",
    "FoodDish",
    "MVP_HOUSEHOLD_ID",
]
