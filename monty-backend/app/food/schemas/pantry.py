from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

Location = Literal["fridge", "freezer", "pantry"]
StockStatus = Literal["ok", "low", "out", "expiring", "expired"]


class FoodPantryItemCreate(BaseModel):
    """Add stock for an existing ingredient (`ingredient_id`) or a new product by `name`."""

    ingredient_id: int | None = None
    name: str | None = Field(None, min_length=1, max_length=200)
    # Target warehouse; defaults to the household's default warehouse.
    warehouse_id: int | None = None
    quantity: float = Field(..., gt=0)
    unit_id: int
    note: str | None = Field(None, max_length=500)
    location: Location | None = None
    expires_on: date | None = None
    min_quantity: float | None = Field(None, ge=0)

    @model_validator(mode="after")
    def _ingredient_or_name(self):
        if self.ingredient_id is None and not (self.name or "").strip():
            raise ValueError("ingredient_id or name is required")
        return self


class FoodPantryItemUpdate(BaseModel):
    """Only fields that are sent change; send `null` to clear `expires_on` / `min_quantity`."""

    quantity: float | None = Field(None, ge=0)
    unit_id: int | None = None
    note: str | None = Field(None, max_length=500)
    location: Location | None = None
    expires_on: date | None = None
    min_quantity: float | None = Field(None, ge=0)


class FoodPantryAdjust(BaseModel):
    delta: float


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
    location: str = "pantry"
    expires_on: date | None = None
    min_quantity: float | None = None
    aisle: str = "other"
    status: StockStatus = "ok"
    days_left: int | None = None
    warehouse_id: int
    warehouse_name: str = ""


class FoodStockMovementResponse(BaseModel):
    id: int
    created_at: datetime
    kind: str
    quantity: float
    unit_code: str
    warehouse_id: int
    warehouse_name: str
    transfer_id: int | None = None
    transfer_number: int | None = None
    note: str | None = None
    user_name: str | None = None
