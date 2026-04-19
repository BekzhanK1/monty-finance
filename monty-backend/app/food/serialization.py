from app.food.models.catalog import FoodDishIngredient
from app.food.models.meal import FoodDish
from app.food.models.plan import FoodMealSlot
from app.food.schemas.catalog import FoodDishIngredientLineResponse
from app.food.schemas.meal import FoodDishResponse
from app.food.schemas.plan import FoodMealSlotResponse


def dish_to_response(d: FoodDish) -> FoodDishResponse:
    lines: list[FoodDishIngredientLineResponse] = []
    raw_lines: list[FoodDishIngredient] = list(d.ingredients) if d.ingredients else []
    for line in sorted(raw_lines, key=lambda x: (x.sort_order, x.id)):
        ing = line.ingredient
        unit = line.unit
        lines.append(
            FoodDishIngredientLineResponse(
                id=line.id,
                ingredient_id=line.ingredient_id,
                ingredient_name=ing.name if ing else "",
                quantity=float(line.quantity),
                unit_id=line.unit_id,
                unit_code=unit.code if unit else "",
                unit_name=unit.name if unit else "",
                is_optional=line.is_optional,
                note=line.note,
                sort_order=line.sort_order,
            )
        )
    return FoodDishResponse(
        id=d.id,
        household_id=d.household_id,
        meal_category_id=d.meal_category_id,
        title=d.title,
        recipe_text=d.recipe_text or "",
        description=d.description,
        servings_default=d.servings_default if d.servings_default is not None else 4,
        prep_minutes=d.prep_minutes,
        cook_minutes=d.cook_minutes,
        is_archived=bool(d.is_archived),
        created_at=d.created_at,
        updated_at=d.updated_at,
        ingredients=lines,
    )


def slot_to_response(s: FoodMealSlot) -> FoodMealSlotResponse:
    dish_title = s.dish.title if getattr(s, "dish", None) is not None else None
    return FoodMealSlotResponse(
        id=s.id,
        household_id=s.household_id,
        slot_date=s.slot_date,
        slot_key=s.slot_key,
        dish_id=s.dish_id,
        custom_title=s.custom_title,
        servings=s.servings,
        notes=s.notes,
        dish_title=dish_title,
    )
