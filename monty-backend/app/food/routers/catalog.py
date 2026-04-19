from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_db
from app.finance.models import User
from app.food.models import FoodDish, FoodDishIngredient, FoodIngredient, FoodUnit, MVP_HOUSEHOLD_ID
from app.food.schemas import (
    FoodDishIngredientsReplace,
    FoodDishResponse,
    FoodIngredientCreate,
    FoodIngredientResponse,
    FoodIngredientUpdate,
    FoodUnitResponse,
)
from app.food.serialization import dish_to_response
from app.middleware.auth import get_current_user

router = APIRouter()

DEFAULT_UNITS = [
    ("g", "грамм", "metric"),
    ("ml", "миллилитр", "metric"),
    ("pcs", "шт.", "metric"),
    ("tbsp", "ст. л.", "metric"),
    ("tsp", "ч. л.", "metric"),
    ("pinch", "щепотка", "metric"),
]


def _ensure_default_units(db: Session) -> None:
    if db.query(FoodUnit).count() > 0:
        return
    for code, name, system in DEFAULT_UNITS:
        db.add(FoodUnit(code=code, name=name, system=system))
    db.commit()


def _dish_load_options():
    return (
        selectinload(FoodDish.ingredients).selectinload(FoodDishIngredient.ingredient),
        selectinload(FoodDish.ingredients).selectinload(FoodDishIngredient.unit),
    )


@router.get("/units", response_model=list[FoodUnitResponse])
def list_units(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    _ensure_default_units(db)
    return db.query(FoodUnit).order_by(FoodUnit.id).all()


@router.get("/ingredients", response_model=list[FoodIngredientResponse])
def list_ingredients(
    q: str | None = Query(None, max_length=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    _ensure_default_units(db)
    query = db.query(FoodIngredient).filter(FoodIngredient.household_id == MVP_HOUSEHOLD_ID)
    if q and q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(FoodIngredient.name.ilike(like))
    return query.order_by(FoodIngredient.name).limit(500).all()


@router.post("/ingredients", response_model=FoodIngredientResponse, status_code=status.HTTP_201_CREATED)
def create_ingredient(
    body: FoodIngredientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    _ensure_default_units(db)
    unit = db.query(FoodUnit).filter(FoodUnit.id == body.default_unit_id).first()
    if not unit:
        raise HTTPException(status_code=400, detail="Invalid default_unit_id")
    row = FoodIngredient(
        household_id=MVP_HOUSEHOLD_ID,
        name=body.name.strip(),
        default_unit_id=body.default_unit_id,
        category=body.category,
        notes=body.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/ingredients/{ingredient_id}", response_model=FoodIngredientResponse)
def update_ingredient(
    ingredient_id: int,
    body: FoodIngredientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (
        db.query(FoodIngredient)
        .filter(FoodIngredient.id == ingredient_id, FoodIngredient.household_id == MVP_HOUSEHOLD_ID)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    if body.default_unit_id is not None:
        unit = db.query(FoodUnit).filter(FoodUnit.id == body.default_unit_id).first()
        if not unit:
            raise HTTPException(status_code=400, detail="Invalid default_unit_id")
        row.default_unit_id = body.default_unit_id
    if body.name is not None:
        row.name = body.name.strip()
    if body.category is not None:
        row.category = body.category
    if body.notes is not None:
        row.notes = body.notes
    db.commit()
    db.refresh(row)
    return row


@router.delete("/ingredients/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ingredient(
    ingredient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (
        db.query(FoodIngredient)
        .filter(FoodIngredient.id == ingredient_id, FoodIngredient.household_id == MVP_HOUSEHOLD_ID)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    used = (
        db.query(FoodDishIngredient)
        .filter(FoodDishIngredient.ingredient_id == ingredient_id)
        .first()
    )
    if used:
        raise HTTPException(status_code=400, detail="Ingredient is used in dishes; remove from dishes first")
    db.delete(row)
    db.commit()
    return None


@router.put("/dishes/{dish_id}/ingredients", response_model=FoodDishResponse)
def replace_dish_ingredients(
    dish_id: int,
    body: FoodDishIngredientsReplace,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    dish = (
        db.query(FoodDish)
        .filter(FoodDish.id == dish_id, FoodDish.household_id == MVP_HOUSEHOLD_ID)
        .first()
    )
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")
    _ensure_default_units(db)
    db.query(FoodDishIngredient).filter(FoodDishIngredient.dish_id == dish_id).delete(synchronize_session=False)
    for it in sorted(body.items, key=lambda x: (x.sort_order, x.ingredient_id)):
        ing = (
            db.query(FoodIngredient)
            .filter(FoodIngredient.id == it.ingredient_id, FoodIngredient.household_id == MVP_HOUSEHOLD_ID)
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
    db.commit()
    d = (
        db.query(FoodDish)
        .options(*_dish_load_options())
        .filter(FoodDish.id == dish_id)
        .first()
    )
    return dish_to_response(d)
