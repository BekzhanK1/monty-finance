from app.food.models.pantry import FoodPantryItem
from app.food.schemas.pantry import FoodPantryItemResponse


def pantry_item_to_response(row: FoodPantryItem) -> FoodPantryItemResponse:
    ing = row.ingredient
    unit = row.unit
    return FoodPantryItemResponse(
        id=row.id,
        household_id=row.household_id,
        ingredient_id=row.ingredient_id,
        ingredient_name=ing.name if ing else "",
        quantity=float(row.quantity),
        unit_id=row.unit_id,
        unit_code=unit.code if unit else "",
        note=row.note,
        updated_at=row.updated_at,
    )
