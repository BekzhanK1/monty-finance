from datetime import date

from pydantic import BaseModel

from app.food.schemas.pantry import FoodPantryItemResponse
from app.food.schemas.plan import FoodMealSlotResponse


class FoodTodayResponse(BaseModel):
    date: date
    slots: list[FoodMealSlotResponse]
    tomorrow_planned: int
    expiring: list[FoodPantryItemResponse]
    low_stock: list[FoodPantryItemResponse]
    shopping_list_id: int
    shopping_open: int
