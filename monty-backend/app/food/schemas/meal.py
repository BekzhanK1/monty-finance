from datetime import datetime

from pydantic import BaseModel, Field

from app.food.schemas.catalog import FoodDishIngredientLineResponse, FoodDishIngredientItem


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
    description: str | None = None
    servings_default: int = Field(4, ge=1, le=99)
    prep_minutes: int | None = Field(None, ge=0, le=24 * 60)
    cook_minutes: int | None = Field(None, ge=0, le=24 * 60)
    is_archived: bool = False


class FoodDishCreate(FoodDishBase):
    ingredients: list[FoodDishIngredientItem] | None = None


class FoodDishUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    recipe_text: str | None = None
    meal_category_id: int | None = None
    description: str | None = None
    servings_default: int | None = Field(None, ge=1, le=99)
    prep_minutes: int | None = Field(None, ge=0, le=24 * 60)
    cook_minutes: int | None = Field(None, ge=0, le=24 * 60)
    is_archived: bool | None = None


class FoodDishResponse(BaseModel):
    id: int
    household_id: int
    meal_category_id: int
    title: str
    recipe_text: str
    description: str | None
    servings_default: int
    prep_minutes: int | None
    cook_minutes: int | None
    is_archived: bool
    created_at: datetime
    updated_at: datetime | None
    ingredients: list[FoodDishIngredientLineResponse] = Field(default_factory=list)
