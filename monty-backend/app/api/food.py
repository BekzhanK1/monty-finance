from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_db
from app.middleware.auth import get_current_user
from app.models.food import FoodDish, FoodMealCategory, MVP_HOUSEHOLD_ID
from app.models.models import User
from app.schemas.food_schemas import (
    FoodDishCreate,
    FoodDishResponse,
    FoodDishUpdate,
    FoodMealCategoryCreate,
    FoodMealCategoryResponse,
    FoodMealCategoryUpdate,
)

router = APIRouter(prefix="/food", tags=["Food"])

DEFAULT_CATEGORIES = [
    ("Завтрак", 0),
    ("Обед", 1),
    ("Ужин", 2),
    ("Перекус", 3),
]


def _ensure_default_categories(db: Session) -> None:
    count = db.query(FoodMealCategory).filter(FoodMealCategory.household_id == MVP_HOUSEHOLD_ID).count()
    if count > 0:
        return
    for name, order in DEFAULT_CATEGORIES:
        db.add(FoodMealCategory(household_id=MVP_HOUSEHOLD_ID, name=name, sort_order=order))
    db.commit()


@router.get("/meal-categories", response_model=list[FoodMealCategoryResponse])
def list_meal_categories(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    _ensure_default_categories(db)
    rows = (
        db.query(FoodMealCategory)
        .filter(FoodMealCategory.household_id == MVP_HOUSEHOLD_ID)
        .order_by(FoodMealCategory.sort_order, FoodMealCategory.id)
        .all()
    )
    return rows


@router.post("/meal-categories", response_model=FoodMealCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_meal_category(
    body: FoodMealCategoryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = FoodMealCategory(
        household_id=MVP_HOUSEHOLD_ID,
        name=body.name.strip(),
        sort_order=body.sort_order,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/meal-categories/{category_id}", response_model=FoodMealCategoryResponse)
def update_meal_category(
    category_id: int,
    body: FoodMealCategoryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (
        db.query(FoodMealCategory)
        .filter(
            FoodMealCategory.id == category_id,
            FoodMealCategory.household_id == MVP_HOUSEHOLD_ID,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    if body.name is not None:
        row.name = body.name.strip()
    if body.sort_order is not None:
        row.sort_order = body.sort_order
    db.commit()
    db.refresh(row)
    return row


@router.delete("/meal-categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_category(
    category_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (
        db.query(FoodMealCategory)
        .filter(
            FoodMealCategory.id == category_id,
            FoodMealCategory.household_id == MVP_HOUSEHOLD_ID,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(row)
    db.commit()
    return None


@router.get("/dishes", response_model=list[FoodDishResponse])
def list_dishes(
    meal_category_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(FoodDish).filter(FoodDish.household_id == MVP_HOUSEHOLD_ID)
    if meal_category_id is not None:
        q = q.filter(FoodDish.meal_category_id == meal_category_id)
    return q.order_by(FoodDish.created_at.desc()).all()


@router.post("/dishes", response_model=FoodDishResponse, status_code=status.HTTP_201_CREATED)
def create_dish(
    body: FoodDishCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    cat = (
        db.query(FoodMealCategory)
        .filter(
            FoodMealCategory.id == body.meal_category_id,
            FoodMealCategory.household_id == MVP_HOUSEHOLD_ID,
        )
        .first()
    )
    if not cat:
        raise HTTPException(status_code=400, detail="Invalid meal_category_id")
    row = FoodDish(
        household_id=MVP_HOUSEHOLD_ID,
        meal_category_id=body.meal_category_id,
        title=body.title.strip(),
        recipe_text=body.recipe_text or "",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/dishes/{dish_id}", response_model=FoodDishResponse)
def update_dish(
    dish_id: int,
    body: FoodDishUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (
        db.query(FoodDish)
        .filter(FoodDish.id == dish_id, FoodDish.household_id == MVP_HOUSEHOLD_ID)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Dish not found")
    if body.meal_category_id is not None:
        cat = (
            db.query(FoodMealCategory)
            .filter(
                FoodMealCategory.id == body.meal_category_id,
                FoodMealCategory.household_id == MVP_HOUSEHOLD_ID,
            )
            .first()
        )
        if not cat:
            raise HTTPException(status_code=400, detail="Invalid meal_category_id")
        row.meal_category_id = body.meal_category_id
    if body.title is not None:
        row.title = body.title.strip()
    if body.recipe_text is not None:
        row.recipe_text = body.recipe_text
    db.commit()
    db.refresh(row)
    return row


@router.delete("/dishes/{dish_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dish(
    dish_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (
        db.query(FoodDish)
        .filter(FoodDish.id == dish_id, FoodDish.household_id == MVP_HOUSEHOLD_ID)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Dish not found")
    db.delete(row)
    db.commit()
    return None
