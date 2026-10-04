from datetime import date
from decimal import Decimal

from app.food.models.pantry import FoodPantryItem
from app.food.schemas.pantry import FoodPantryItemResponse
from app.food.services.aisles import aisle_for
from app.food.services.expiry import stock_status


def pantry_item_to_response(row: FoodPantryItem, today: date | None = None) -> FoodPantryItemResponse:
    ing = row.ingredient
    unit = row.unit
    status, days_left = stock_status(
        quantity=Decimal(row.quantity),
        min_quantity=Decimal(row.min_quantity) if row.min_quantity is not None else None,
        expires_on=row.expires_on,
        today=today,
    )
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
        location=row.location or "pantry",
        expires_on=row.expires_on,
        min_quantity=float(row.min_quantity) if row.min_quantity is not None else None,
        aisle=aisle_for(ing.category if ing else None, ing.name if ing else ""),
        status=status,
        days_left=days_left,
        warehouse_id=row.warehouse_id,
        warehouse_name=row.warehouse.name if row.warehouse else "",
    )
