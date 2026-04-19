from pydantic import BaseModel, Field


class FoodUnitResponse(BaseModel):
    id: int
    code: str
    name: str
    system: str

    class Config:
        from_attributes = True


class FoodIngredientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    default_unit_id: int
    category: str | None = Field(None, max_length=64)
    notes: str | None = Field(None, max_length=500)


class FoodIngredientUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    default_unit_id: int | None = None
    category: str | None = Field(None, max_length=64)
    notes: str | None = Field(None, max_length=500)


class FoodIngredientResponse(BaseModel):
    id: int
    household_id: int
    name: str
    default_unit_id: int
    category: str | None
    notes: str | None

    class Config:
        from_attributes = True


class FoodDishIngredientItem(BaseModel):
    ingredient_id: int
    quantity: float = Field(..., gt=0)
    unit_id: int
    is_optional: bool = False
    note: str | None = Field(None, max_length=500)
    sort_order: int = 0


class FoodDishIngredientsReplace(BaseModel):
    items: list[FoodDishIngredientItem]


class FoodDishIngredientLineResponse(BaseModel):
    id: int
    ingredient_id: int
    ingredient_name: str
    quantity: float
    unit_id: int
    unit_code: str
    unit_name: str
    is_optional: bool
    note: str | None
    sort_order: int
