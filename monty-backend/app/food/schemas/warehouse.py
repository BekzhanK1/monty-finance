from datetime import datetime

from pydantic import BaseModel, Field


class FoodWarehouseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    emoji: str = Field("🏠", min_length=1, max_length=16)


class FoodWarehouseUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    emoji: str | None = Field(None, min_length=1, max_length=16)
    is_default: bool | None = None
    sort_order: int | None = None


class FoodWarehouseResponse(BaseModel):
    id: int
    name: str
    emoji: str
    is_default: bool
    sort_order: int
    items_count: int = 0
    attention_count: int = 0


class FoodTransferLineIn(BaseModel):
    ingredient_id: int
    quantity: float = Field(..., gt=0)
    unit_id: int


class FoodTransferCreate(BaseModel):
    from_warehouse_id: int
    to_warehouse_id: int
    comment: str | None = Field(None, max_length=300)
    lines: list[FoodTransferLineIn] = Field(..., min_length=1, max_length=100)


class FoodTransferLineResponse(BaseModel):
    ingredient_id: int
    ingredient_name: str
    quantity: float
    unit_code: str


class FoodTransferResponse(BaseModel):
    id: int
    number: int
    from_warehouse_id: int
    from_warehouse_name: str
    to_warehouse_id: int
    to_warehouse_name: str
    comment: str | None
    created_at: datetime
    cancelled_at: datetime | None
    user_name: str | None = None
    lines: list[FoodTransferLineResponse]
