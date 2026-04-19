"""Build a shopping list from meal slots in a date range (aggregate dish ingredients)."""

from collections import defaultdict
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session, selectinload

from app.food.models.catalog import FoodDishIngredient
from app.food.models.meal import FoodDish
from app.food.models.plan import FoodMealSlot
from app.food.models.shop import FoodShoppingItem, FoodShoppingList


def generate_shopping_list_from_menu(
    db: Session,
    *,
    household_id: int,
    date_from: date,
    date_to: date,
) -> FoodShoppingList:
    slots = (
        db.query(FoodMealSlot)
        .options(
            selectinload(FoodMealSlot.dish)
            .selectinload(FoodDish.ingredients)
            .selectinload(FoodDishIngredient.ingredient),
            selectinload(FoodMealSlot.dish)
            .selectinload(FoodDish.ingredients)
            .selectinload(FoodDishIngredient.unit),
        )
        .filter(
            FoodMealSlot.household_id == household_id,
            FoodMealSlot.slot_date >= date_from,
            FoodMealSlot.slot_date <= date_to,
            FoodMealSlot.dish_id.isnot(None),
        )
        .all()
    )

    # (ingredient_id, unit_id) -> total quantity
    totals: dict[tuple[int, int], Decimal] = defaultdict(lambda: Decimal(0))
    labels: dict[tuple[int, int], str] = {}

    for slot in slots:
        dish = slot.dish
        if not dish or not dish.ingredients:
            continue
        for line in dish.ingredients:
            key = (line.ingredient_id, line.unit_id)
            totals[key] += Decimal(line.quantity)
            if key not in labels:
                ing = line.ingredient
                labels[key] = ing.name if ing else f"#{line.ingredient_id}"

    title = f"Покупки {date_from.isoformat()} — {date_to.isoformat()}"
    lst = FoodShoppingList(
        household_id=household_id,
        title=title,
        period_start=date_from,
        period_end=date_to,
        status="active",
    )
    db.add(lst)
    db.flush()

    order = 0
    for (ing_id, unit_id), qty in sorted(totals.items(), key=lambda x: labels[x[0]].lower()):
        db.add(
            FoodShoppingItem(
                list_id=lst.id,
                ingredient_id=ing_id,
                label=labels[(ing_id, unit_id)],
                quantity=qty,
                unit_id=unit_id,
                checked=False,
                sort_order=order,
            )
        )
        order += 1

    db.commit()
    db.refresh(lst)
    return lst
