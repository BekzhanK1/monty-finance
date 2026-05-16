from fastapi import Depends

from app.finance.models import User
from app.middleware.auth import get_current_user


def get_food_household_id(
    current_user: User = Depends(get_current_user),
) -> int:
    return current_user.household_id
