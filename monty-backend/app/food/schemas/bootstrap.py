from pydantic import BaseModel


class FoodBootstrapResponse(BaseModel):
    dish_count: int
    categories_ready: bool
