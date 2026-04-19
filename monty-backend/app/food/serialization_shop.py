from app.food.models.shop import FoodShoppingItem, FoodShoppingList
from app.food.schemas.shop import FoodShoppingItemResponse, FoodShoppingListResponse


def shopping_item_to_response(it: FoodShoppingItem) -> FoodShoppingItemResponse:
    return FoodShoppingItemResponse(
        id=it.id,
        ingredient_id=it.ingredient_id,
        label=it.label,
        quantity=float(it.quantity) if it.quantity is not None else None,
        unit_id=it.unit_id,
        unit_code=it.unit.code if it.unit else None,
        checked=bool(it.checked),
        sort_order=it.sort_order,
    )


def shopping_list_to_response(lst: FoodShoppingList) -> FoodShoppingListResponse:
    raw = list(lst.items) if lst.items else []
    items = [shopping_item_to_response(x) for x in sorted(raw, key=lambda x: (x.sort_order, x.id))]
    return FoodShoppingListResponse(
        id=lst.id,
        household_id=lst.household_id,
        title=lst.title,
        period_start=lst.period_start,
        period_end=lst.period_end,
        status=lst.status,
        created_at=lst.created_at,
        items=items,
    )
