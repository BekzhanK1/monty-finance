from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class FoodShoppingGenerateBody(BaseModel):
    date_from: date
    date_to: date
    mode: Literal["new", "merge_draft"] = "new"


class FoodShoppingItemResponse(BaseModel):
    id: int
    ingredient_id: int | None
    label: str
    quantity: float | None
    unit_id: int | None
    unit_code: str | None
    checked: bool
    sort_order: int
    note: str | None = None
    unit_mismatch: bool = False
    actual_price: float | None = None


class FoodShoppingListResponse(BaseModel):
    id: int
    household_id: int
    title: str
    period_start: date | None
    period_end: date | None
    status: str
    linked_transaction_id: str | None = None
    total_amount: float = 0
    created_at: datetime
    items: list[FoodShoppingItemResponse] = []


class FoodShoppingItemPatch(BaseModel):
    checked: bool | None = None
    actual_price: float | None = Field(None, ge=0)


class FoodShoppingListPatch(BaseModel):
    status: Literal["draft", "active", "done"] | None = None


class FoodShoppingFinalizeResponse(BaseModel):
    list: FoodShoppingListResponse
    transaction_id: str
    total_amount: int


class FoodShoppingItemCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=200)
    quantity: float | None = Field(None, gt=0)
    unit_id: int | None = None
    ingredient_id: int | None = None
