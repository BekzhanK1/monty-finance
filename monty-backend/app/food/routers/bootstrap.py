from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import get_db
from app.food.deps import get_food_household_id
from app.food.schemas.bootstrap import FoodBootstrapResponse
from app.food.services.household_bootstrap import (
    active_dish_count,
    categories_ready,
    ensure_household_food_ready,
)

router = APIRouter()


@router.get("/bootstrap", response_model=FoodBootstrapResponse)
def food_bootstrap(
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    ensure_household_food_ready(db, household_id)
    return FoodBootstrapResponse(
        dish_count=active_dish_count(db, household_id),
        categories_ready=categories_ready(db, household_id),
    )
