"""Build a shopping list from meal slots in a date range (aggregate dish ingredients)."""

from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Literal

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.food.models.catalog import FoodDishIngredient
from app.food.models.meal import FoodDish
from app.food.models.plan import FoodMealSlot
from app.food.models.shop import FoodShoppingItem, FoodShoppingList
from app.food.services.pantry_adjust import apply_pantry_to_totals, load_pantry_by_ingredient_unit

GenerateMode = Literal["new", "merge_draft"]


def _include_in_shopping_list(line: FoodDishIngredient) -> bool:
    ing = line.ingredient
    if ing is None:
        return True
    if ing.is_pantry_default and not line.is_optional:
        return False
    return True


def _servings_multiplier(slot: FoodMealSlot, dish: FoodDish) -> Decimal:
    default = max(dish.servings_default or 1, 1)
    slot_servings = slot.servings if slot.servings is not None else default
    return Decimal(slot_servings) / Decimal(default)


def aggregate_menu_totals(
    db: Session,
    *,
    household_id: int,
    date_from: date,
    date_to: date,
) -> tuple[dict[tuple[int, int], Decimal], dict[tuple[int, int], str]]:
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

    totals: dict[tuple[int, int], Decimal] = defaultdict(lambda: Decimal(0))
    labels: dict[tuple[int, int], str] = {}

    for slot in slots:
        dish = slot.dish
        if not dish or not dish.ingredients:
            continue
        multiplier = _servings_multiplier(slot, dish)
        for line in dish.ingredients:
            if not _include_in_shopping_list(line):
                continue
            key = (line.ingredient_id, line.unit_id)
            totals[key] += Decimal(line.quantity) * multiplier
            if key not in labels:
                ing = line.ingredient
                labels[key] = ing.name if ing else f"#{line.ingredient_id}"

    return totals, labels


def _totals_after_pantry(
    db: Session,
    *,
    household_id: int,
    totals: dict[tuple[int, int], Decimal],
) -> tuple[dict[tuple[int, int], Decimal], set[tuple[int, int]]]:
    pantry = load_pantry_by_ingredient_unit(db, household_id=household_id)
    return apply_pantry_to_totals(totals, pantry)


def _append_menu_items(
    db: Session,
    *,
    list_id: int,
    totals: dict[tuple[int, int], Decimal],
    labels: dict[tuple[int, int], str],
    start_order: int = 0,
    unit_mismatch: set[tuple[int, int]] | None = None,
) -> int:
    mismatch = unit_mismatch or set()
    order = start_order
    for (ing_id, unit_id), qty in sorted(totals.items(), key=lambda x: labels[x[0]].lower()):
        if qty <= 0:
            continue
        note = (
            "В кладовой этот продукт в другой единице — проверьте количество"
            if (ing_id, unit_id) in mismatch
            else None
        )
        db.add(
            FoodShoppingItem(
                list_id=list_id,
                ingredient_id=ing_id,
                label=labels[(ing_id, unit_id)],
                quantity=qty,
                unit_id=unit_id,
                checked=False,
                sort_order=order,
                note=note,
            )
        )
        order += 1
    return order


def _period_title(date_from: date, date_to: date) -> str:
    return f"Покупки {date_from.isoformat()} — {date_to.isoformat()}"


def generate_shopping_list_from_menu(
    db: Session,
    *,
    household_id: int,
    date_from: date,
    date_to: date,
    mode: GenerateMode = "new",
) -> FoodShoppingList:
    if mode == "merge_draft":
        return _merge_draft_list(
            db,
            household_id=household_id,
            date_from=date_from,
            date_to=date_to,
        )

    db.query(FoodShoppingList).filter(
        FoodShoppingList.household_id == household_id,
        FoodShoppingList.status == "active",
    ).update({FoodShoppingList.status: "done"}, synchronize_session=False)

    totals, labels = aggregate_menu_totals(
        db,
        household_id=household_id,
        date_from=date_from,
        date_to=date_to,
    )
    totals, unit_mismatch = _totals_after_pantry(db, household_id=household_id, totals=totals)

    lst = FoodShoppingList(
        household_id=household_id,
        title=_period_title(date_from, date_to),
        period_start=date_from,
        period_end=date_to,
        status="active",
    )
    db.add(lst)
    db.flush()
    _append_menu_items(
        db,
        list_id=lst.id,
        totals=totals,
        labels=labels,
        unit_mismatch=unit_mismatch,
    )
    db.commit()
    db.refresh(lst)
    return lst


def _merge_draft_list(
    db: Session,
    *,
    household_id: int,
    date_from: date,
    date_to: date,
) -> FoodShoppingList:
    draft = (
        db.query(FoodShoppingList)
        .filter(
            FoodShoppingList.household_id == household_id,
            FoodShoppingList.status == "draft",
        )
        .order_by(FoodShoppingList.created_at.desc())
        .first()
    )
    if not draft:
        raise HTTPException(
            status_code=400,
            detail="Нет черновика списка. Создайте новый список или сохраните текущий как черновик.",
        )

    db.query(FoodShoppingItem).filter(
        FoodShoppingItem.list_id == draft.id,
        FoodShoppingItem.ingredient_id.isnot(None),
    ).delete(synchronize_session=False)

    max_order = (
        db.query(func.coalesce(func.max(FoodShoppingItem.sort_order), -1))
        .filter(FoodShoppingItem.list_id == draft.id)
        .scalar()
    )
    start_order = int(max_order) + 1

    totals, labels = aggregate_menu_totals(
        db,
        household_id=household_id,
        date_from=date_from,
        date_to=date_to,
    )
    totals, unit_mismatch = _totals_after_pantry(db, household_id=household_id, totals=totals)
    _append_menu_items(
        db,
        list_id=draft.id,
        totals=totals,
        labels=labels,
        start_order=start_order,
        unit_mismatch=unit_mismatch,
    )

    draft.title = _period_title(date_from, date_to)
    draft.period_start = date_from
    draft.period_end = date_to
    db.commit()
    db.refresh(draft)
    return draft
