from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_db
from app.food.deps import get_food_household_id
from app.food.models import FoodDish, FoodDishIngredient, FoodIngredient, FoodMealCategory, FoodMealSlot, FoodUnit
from app.food.schemas import (
    FoodDishCreate,
    FoodDishIngredientItem,
    FoodDishResponse,
    FoodDishUpdate,
    FoodMealCategoryCreate,
    FoodMealCategoryResponse,
    FoodMealCategoryUpdate,
)
from app.food.serialization import dish_to_response
from app.food.services.household_bootstrap import ensure_household_food_ready

router = APIRouter()


def _dish_load_options():
    return (
        selectinload(FoodDish.ingredients).selectinload(FoodDishIngredient.ingredient),
        selectinload(FoodDish.ingredients).selectinload(FoodDishIngredient.unit),
    )


def _validate_and_add_ingredients(
    db: Session,
    dish_id: int,
    items: list[FoodDishIngredientItem],
    household_id: int,
) -> None:
    for it in sorted(items, key=lambda x: (x.sort_order, x.ingredient_id)):
        ing = (
            db.query(FoodIngredient)
            .filter(FoodIngredient.id == it.ingredient_id, FoodIngredient.household_id == household_id)
            .first()
        )
        if not ing:
            raise HTTPException(status_code=400, detail=f"Invalid ingredient_id: {it.ingredient_id}")
        unit = db.query(FoodUnit).filter(FoodUnit.id == it.unit_id).first()
        if not unit:
            raise HTTPException(status_code=400, detail=f"Invalid unit_id: {it.unit_id}")
        db.add(
            FoodDishIngredient(
                dish_id=dish_id,
                ingredient_id=it.ingredient_id,
                quantity=Decimal(str(it.quantity)),
                unit_id=it.unit_id,
                is_optional=it.is_optional,
                note=it.note,
                sort_order=it.sort_order,
            )
        )


@router.get("/meal-categories", response_model=list[FoodMealCategoryResponse])
def list_meal_categories(
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    ensure_household_food_ready(db, household_id)
    rows = (
        db.query(FoodMealCategory)
        .filter(FoodMealCategory.household_id == household_id)
        .order_by(FoodMealCategory.sort_order, FoodMealCategory.id)
        .all()
    )
    return rows


@router.post("/meal-categories", response_model=FoodMealCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_meal_category(
    body: FoodMealCategoryCreate,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    row = FoodMealCategory(
        household_id=household_id,
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
    household_id: int = Depends(get_food_household_id),
):
    row = (
        db.query(FoodMealCategory)
        .filter(
            FoodMealCategory.id == category_id,
            FoodMealCategory.household_id == household_id,
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
    household_id: int = Depends(get_food_household_id),
):
    row = (
        db.query(FoodMealCategory)
        .filter(
            FoodMealCategory.id == category_id,
            FoodMealCategory.household_id == household_id,
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
    archived: bool = Query(False, description="true — only archived dishes"),
    include_pantry_status: bool = Query(False, description="Calculate pantry readiness status"),
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    q = (
        db.query(FoodDish)
        .options(*_dish_load_options())
        .filter(
            FoodDish.household_id == household_id,
            FoodDish.is_archived.is_(archived),
        )
    )
    if meal_category_id is not None:
        q = q.filter(FoodDish.meal_category_id == meal_category_id)
    rows = q.order_by(FoodDish.created_at.desc()).all()
    
    if include_pantry_status:
        from app.food.services.dish_pantry_status import calculate_dish_pantry_status
        return [
            dish_to_response(d, pantry_status=calculate_dish_pantry_status(db, household_id=household_id, dish=d))
            for d in rows
        ]
    
    return [dish_to_response(d) for d in rows]


@router.post("/dishes", response_model=FoodDishResponse, status_code=status.HTTP_201_CREATED)
def create_dish(
    body: FoodDishCreate,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    cat = (
        db.query(FoodMealCategory)
        .filter(
            FoodMealCategory.id == body.meal_category_id,
            FoodMealCategory.household_id == household_id,
        )
        .first()
    )
    if not cat:
        raise HTTPException(status_code=400, detail="Invalid meal_category_id")
    row = FoodDish(
        household_id=household_id,
        meal_category_id=body.meal_category_id,
        title=body.title.strip(),
        recipe_text=body.recipe_text or "",
        description=body.description,
        servings_default=body.servings_default,
        prep_minutes=body.prep_minutes,
        cook_minutes=body.cook_minutes,
        is_archived=body.is_archived,
    )
    db.add(row)
    db.flush()
    if body.ingredients:
        _validate_and_add_ingredients(db, row.id, body.ingredients, household_id)
    db.commit()
    d = (
        db.query(FoodDish)
        .options(*_dish_load_options())
        .filter(FoodDish.id == row.id)
        .first()
    )
    return dish_to_response(d)


@router.patch("/dishes/{dish_id}", response_model=FoodDishResponse)
def update_dish(
    dish_id: int,
    body: FoodDishUpdate,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    row = (
        db.query(FoodDish)
        .options(*_dish_load_options())
        .filter(FoodDish.id == dish_id, FoodDish.household_id == household_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Dish not found")
    if body.meal_category_id is not None:
        cat = (
            db.query(FoodMealCategory)
            .filter(
                FoodMealCategory.id == body.meal_category_id,
                FoodMealCategory.household_id == household_id,
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
    if body.description is not None:
        row.description = body.description
    if body.servings_default is not None:
        row.servings_default = body.servings_default
    if body.prep_minutes is not None:
        row.prep_minutes = body.prep_minutes
    if body.cook_minutes is not None:
        row.cook_minutes = body.cook_minutes
    if body.is_archived is not None:
        row.is_archived = body.is_archived
    db.commit()
    d = (
        db.query(FoodDish)
        .options(*_dish_load_options())
        .filter(FoodDish.id == dish_id)
        .first()
    )
    return dish_to_response(d)


@router.delete("/dishes/{dish_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dish(
    dish_id: int,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    row = (
        db.query(FoodDish)
        .filter(FoodDish.id == dish_id, FoodDish.household_id == household_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Dish not found")
    in_menu = (
        db.query(FoodMealSlot)
        .filter(FoodMealSlot.dish_id == dish_id, FoodMealSlot.household_id == household_id)
        .first()
    )
    if in_menu:
        row.is_archived = True
        db.commit()
        return None
    db.delete(row)
    db.commit()
    return None
