from datetime import datetime

from pydantic import BaseModel, Field


class FoodPantryItemCreate(BaseModel):
    ingredient_id: int
    quantity: float = Field(..., gt=0)
    unit_id: int
    note: str | None = Field(None, max_length=500)


class FoodPantryItemUpdate(BaseModel):
    quantity: float | None = Field(None, gt=0)
    unit_id: int | None = None
    note: str | None = Field(None, max_length=500)


class FoodPantryItemResponse(BaseModel):
    id: int
    household_id: int
    ingredient_id: int
    ingredient_name: str
    quantity: float
    unit_id: int
    unit_code: str
    note: str | None
    updated_at: datetime | None
