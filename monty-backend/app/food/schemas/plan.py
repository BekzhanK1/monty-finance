from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class FoodMealSlotCreate(BaseModel):
    slot_date: date
    slot_key: Literal["breakfast", "lunch", "dinner", "snack"]
    dish_id: int | None = None
    custom_title: str | None = Field(None, max_length=200)
    servings: int = Field(2, ge=1, le=50)
    notes: str | None = None


class FoodMealSlotUpdate(BaseModel):
    dish_id: int | None = None
    custom_title: str | None = Field(default=None, max_length=200)
    servings: int | None = Field(default=None, ge=1, le=50)
    notes: str | None = None


class FoodMealSlotResponse(BaseModel):
    id: int
    household_id: int
    slot_date: date
    slot_key: str
    dish_id: int | None
    custom_title: str | None
    servings: int
    notes: str | None
    dish_title: str | None = None
