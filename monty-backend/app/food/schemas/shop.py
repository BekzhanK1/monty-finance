from datetime import date, datetime

from pydantic import BaseModel, Field


class FoodShoppingGenerateBody(BaseModel):
    date_from: date
    date_to: date


class FoodShoppingItemResponse(BaseModel):
    id: int
    ingredient_id: int | None
    label: str
    quantity: float | None
    unit_id: int | None
    unit_code: str | None
    checked: bool
    sort_order: int


class FoodShoppingListResponse(BaseModel):
    id: int
    household_id: int
    title: str
    period_start: date | None
    period_end: date | None
    status: str
    created_at: datetime
    items: list[FoodShoppingItemResponse] = []


class FoodShoppingItemPatch(BaseModel):
    checked: bool | None = None


class FoodShoppingItemCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=200)
    quantity: float | None = Field(None, gt=0)
    unit_id: int | None = None
    ingredient_id: int | None = None
