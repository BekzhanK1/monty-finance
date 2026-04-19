from datetime import datetime

from pydantic import BaseModel, Field


class FoodMealCategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    sort_order: int = 0


class FoodMealCategoryCreate(FoodMealCategoryBase):
    pass


class FoodMealCategoryUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    sort_order: int | None = None


class FoodMealCategoryResponse(FoodMealCategoryBase):
    id: int
    household_id: int

    class Config:
        from_attributes = True


class FoodDishBase(BaseModel):
    title: str = Field(..., max_length=200)
    recipe_text: str = ""
    meal_category_id: int


class FoodDishCreate(FoodDishBase):
    pass


class FoodDishUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    recipe_text: str | None = None
    meal_category_id: int | None = None


class FoodDishResponse(BaseModel):
    id: int
    household_id: int
    meal_category_id: int
    title: str
    recipe_text: str
    created_at: datetime

    class Config:
        from_attributes = True
