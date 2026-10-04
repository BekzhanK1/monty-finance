from fastapi import Depends, Query
from sqlalchemy.orm import Session

from app.core.config import get_db
from app.finance.models import User
from app.food.models import FoodWarehouse
from app.middleware.auth import get_current_user


def get_food_household_id(
    current_user: User = Depends(get_current_user),
) -> int:
    return current_user.household_id


def get_food_warehouse(
    warehouse_id: int | None = Query(None, description="Склад; по умолчанию — основной склад дома"),
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
) -> FoodWarehouse:
    from app.food.services.warehouses import resolve_warehouse

    return resolve_warehouse(db, household_id=household_id, warehouse_id=warehouse_id)
