"""Calculate dish readiness status based on pantry stock (D12)."""

from decimal import Decimal
from typing import Literal

from sqlalchemy.orm import Session

from app.food.models import FoodDish, FoodDishIngredient
from app.food.services.pantry_adjust import load_pantry_by_ingredient_unit

DishPantryStatus = Literal["ready", "partial", "missing"]


def calculate_dish_pantry_status(
    db: Session,
    *,
    household_id: int,
    dish: FoodDish,
) -> DishPantryStatus:
    """
    Calculate pantry status for a single dish based on servings_default.
    
    Returns:
      - ready: all required ingredients have sufficient stock in same unit
      - partial: some ingredients sufficient OR stock exists in different unit
      - missing: no composition or no sufficient stock in same unit
    """
    lines = dish.ingredients
    if not lines:
        return "missing"
    
    pantry = load_pantry_by_ingredient_unit(db, household_id=household_id)
    
    relevant_lines = [
        line for line in lines
        if line.ingredient_id is not None
        and not (line.ingredient.is_pantry_default and not line.is_optional)
    ]
    
    if not relevant_lines:
        return "missing"
    
    sufficient_count = 0
    has_unit_mismatch = False
    
    for line in relevant_lines:
        qty_needed = Decimal(line.quantity)
        key = (line.ingredient_id, line.unit_id)
        stock = pantry.get(key)
        
        if stock is not None and stock >= qty_needed:
            sufficient_count += 1
            continue
        
        other_units = [u for (i, u), _q in pantry.items() if i == line.ingredient_id and u != line.unit_id]
        if other_units:
            has_unit_mismatch = True
    
    if sufficient_count == len(relevant_lines):
        return "ready"
    
    if sufficient_count > 0 or has_unit_mismatch:
        return "partial"
    
    return "missing"
