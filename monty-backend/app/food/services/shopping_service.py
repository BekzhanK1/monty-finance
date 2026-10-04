"""The household's single live shopping list: add (merging duplicates), fill from menu or low stock, complete."""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy.orm import Session, selectinload

from app.food.models import (
    FoodDish,
    FoodDishIngredient,
    FoodIngredient,
    FoodMealSlot,
    FoodPantryItem,
    FoodShoppingItem,
    FoodShoppingList,
    FoodUnit,
)
from app.food.services.aisles import aisle_for, guess_aisle
from app.food.services.inventory import (
    UnitMismatchError,
    add_stock,
    check_availability,
    dish_load_options,
    dish_needs,
    load_pantry,
)
from app.food.services.units import convert

ACTIVE = "active"
DEFAULT_TITLE = "Список покупок"


def _list_query(db: Session):
    return db.query(FoodShoppingList).options(
        selectinload(FoodShoppingList.items).selectinload(FoodShoppingItem.unit)
    )


def get_or_create_current_list(db: Session, *, household_id: int) -> FoodShoppingList:
    lst = (
        _list_query(db)
        .filter(FoodShoppingList.household_id == household_id, FoodShoppingList.status.in_([ACTIVE, "draft"]))
        .order_by(FoodShoppingList.created_at.desc(), FoodShoppingList.id.desc())
        .first()
    )
    if lst:
        return lst
    lst = FoodShoppingList(household_id=household_id, title=DEFAULT_TITLE, status=ACTIVE)
    db.add(lst)
    db.commit()
    return _list_query(db).filter(FoodShoppingList.id == lst.id).one()


def reload_list(db: Session, list_id: int) -> FoodShoppingList:
    db.expire_all()
    return _list_query(db).filter(FoodShoppingList.id == list_id).one()


@dataclass
class Entry:
    label: str
    quantity: Decimal | None
    unit: FoodUnit | None
    ingredient: FoodIngredient | None = None
    sources: list[str] = field(default_factory=list)


def find_ingredient(db: Session, *, household_id: int, label: str) -> FoodIngredient | None:
    """Case-insensitive name match. Done in Python: SQLite's lower() ignores Cyrillic."""
    name = label.strip().casefold()
    if not name:
        return None
    for ingredient in db.query(FoodIngredient).filter(FoodIngredient.household_id == household_id).all():
        if ingredient.name.strip().casefold() == name:
            return ingredient
    return None


def _merge_sources(existing: str | None, new: list[str]) -> str | None:
    items = [s for s in (existing or "").split(", ") if s]
    for source in new:
        if source and source not in items:
            items.append(source)
    joined = ", ".join(items)
    return joined[:300] or None


def add_entries(db: Session, lst: FoodShoppingList, entries: list[Entry]) -> int:
    """Add entries, folding into an unchecked item for the same product when units are compatible.

    Returns how many entries changed the list. Caller commits.
    """
    changed = 0
    next_order = max((it.sort_order for it in lst.items), default=-1) + 1
    for entry in entries:
        if entry.quantity is not None and entry.quantity <= 0:
            continue
        target = _find_mergeable(lst, entry)
        if target is not None:
            if entry.quantity is not None:
                if target.quantity is None:
                    target.quantity = entry.quantity
                    target.unit_id = entry.unit.id if entry.unit else None
                else:
                    target_code = target.unit.code if target.unit else ""
                    entry_code = entry.unit.code if entry.unit else ""
                    target.quantity = Decimal(target.quantity) + convert(entry.quantity, entry_code, target_code)
            target.sources = _merge_sources(target.sources, entry.sources)
            changed += 1
            continue

        ingredient = entry.ingredient
        item = FoodShoppingItem(
            list_id=lst.id,
            ingredient_id=ingredient.id if ingredient else None,
            label=(ingredient.name if ingredient else entry.label).strip()[:200],
            quantity=entry.quantity,
            unit_id=entry.unit.id if entry.unit else None,
            checked=False,
            sort_order=next_order,
            category=aisle_for(ingredient.category, ingredient.name) if ingredient else guess_aisle(entry.label),
            sources=_merge_sources(None, entry.sources),
        )
        if entry.unit is not None:
            item.unit = entry.unit
        db.add(item)
        lst.items.append(item)
        next_order += 1
        changed += 1
    return changed


def _find_mergeable(lst: FoodShoppingList, entry: Entry) -> FoodShoppingItem | None:
    entry_code = entry.unit.code if entry.unit else None
    for item in lst.items:
        if item.checked:
            continue
        same_product = (
            (entry.ingredient is not None and item.ingredient_id == entry.ingredient.id)
            or (entry.ingredient is None and item.ingredient_id is None
                and item.label.strip().lower() == entry.label.strip().lower())
        )
        if not same_product:
            continue
        if entry.quantity is None or item.quantity is None:
            return item
        item_code = item.unit.code if item.unit else None
        if item_code and entry_code and convert(Decimal(1), entry_code, item_code) is not None:
            return item
    return None


def _already_listed(lst: FoodShoppingList, ingredient_id: int, unit_code: str) -> Decimal:
    """Quantity of this product already on the list (bought or not yet moved to the pantry), in `unit_code`."""
    total = Decimal(0)
    for item in lst.items:
        if item.ingredient_id != ingredient_id or item.quantity is None or item.pantry_applied_at is not None:
            continue
        converted = convert(Decimal(item.quantity), item.unit.code if item.unit else "", unit_code)
        if converted is not None:
            total += converted
    return total


def add_from_menu(db: Session, lst: FoodShoppingList, *, household_id: int, date_from: date, date_to: date) -> int:
    """Add what the planned meals need beyond stock and what is already on the list (idempotent)."""
    slots = (
        db.query(FoodMealSlot)
        .options(
            selectinload(FoodMealSlot.dish).selectinload(FoodDish.ingredients).selectinload(FoodDishIngredient.ingredient),
            selectinload(FoodMealSlot.dish).selectinload(FoodDish.ingredients).selectinload(FoodDishIngredient.unit),
        )
        .filter(
            FoodMealSlot.household_id == household_id,
            FoodMealSlot.slot_date >= date_from,
            FoodMealSlot.slot_date <= date_to,
            FoodMealSlot.dish_id.isnot(None),
            FoodMealSlot.cooked_at.is_(None),
        )
        .all()
    )
    return _add_needs(db, lst, household_id=household_id, needs_with_source=[
        (need, slot.dish.title) for slot in slots if slot.dish for need in dish_needs(slot.dish, slot.servings)
    ])


def add_for_dish(db: Session, lst: FoodShoppingList, *, household_id: int, dish: FoodDish, servings: int | None) -> int:
    return _add_needs(db, lst, household_id=household_id,
                      needs_with_source=[(need, dish.title) for need in dish_needs(dish, servings)])


def _add_needs(db: Session, lst: FoodShoppingList, *, household_id: int, needs_with_source) -> int:
    # Sum per (ingredient, unit) first so one product from several dishes becomes one line.
    totals: dict[tuple[int, str], Decimal] = defaultdict(Decimal)
    meta: dict[tuple[int, str], tuple] = {}
    sources: dict[tuple[int, str], list[str]] = defaultdict(list)
    for need, source in needs_with_source:
        if need.always_home:
            continue
        key = (need.ingredient_id, need.unit_code)
        totals[key] += need.quantity
        meta[key] = need
        if source not in sources[key]:
            sources[key].append(source)

    pantry = load_pantry(db, household_id=household_id)
    ingredients = {i.id: i for i in db.query(FoodIngredient).filter(
        FoodIngredient.id.in_({k[0] for k in totals})).all()} if totals else {}
    units = {u.id: u for u in db.query(FoodUnit).all()}

    entries: list[Entry] = []
    for key, quantity in totals.items():
        need = meta[key]
        need.quantity = quantity
        [avail] = check_availability([need], pantry)
        missing = avail.missing - _already_listed(lst, need.ingredient_id, need.unit_code)
        if missing <= 0:
            continue
        entries.append(Entry(
            label=need.name,
            quantity=_round_up(missing, need.unit_code),
            unit=units.get(need.unit_id),
            ingredient=ingredients.get(need.ingredient_id),
            sources=sources[key],
        ))
    return add_entries(db, lst, entries)


def _round_up(quantity: Decimal, unit_code: str) -> Decimal:
    """Shoppable amounts: whole pieces/packs, grams and millilitres to whole numbers."""
    if unit_code in ("pcs", "pack", "g", "ml"):
        return quantity.to_integral_value(rounding="ROUND_CEILING")
    return quantity.quantize(Decimal("0.01"), rounding="ROUND_CEILING")


def add_low_stock(db: Session, lst: FoodShoppingList, *, household_id: int) -> int:
    rows = (
        db.query(FoodPantryItem)
        .options(selectinload(FoodPantryItem.unit), selectinload(FoodPantryItem.ingredient))
        .filter(FoodPantryItem.household_id == household_id, FoodPantryItem.min_quantity.isnot(None))
        .all()
    )
    entries: list[Entry] = []
    for row in rows:
        quantity, minimum = Decimal(row.quantity), Decimal(row.min_quantity)
        if quantity >= minimum:
            continue
        code = row.unit.code if row.unit else ""
        missing = minimum - quantity - _already_listed(lst, row.ingredient_id, code)
        if missing <= 0:
            continue
        entries.append(Entry(label=row.ingredient.name, quantity=_round_up(missing, code), unit=row.unit,
                             ingredient=row.ingredient, sources=["заканчивается"]))
    return add_entries(db, lst, entries)


@dataclass
class CompleteResult:
    new_list: FoodShoppingList
    moved_to_pantry: int
    skipped: list[str]


def complete(db: Session, lst: FoodShoppingList, *, household_id: int, to_pantry: bool) -> CompleteResult:
    """Close the list: bought items go to the pantry, unbought ones carry over to a fresh list."""
    moved = 0
    skipped: list[str] = []
    now = datetime.utcnow()
    bought = [it for it in lst.items if it.checked]
    if to_pantry:
        for item in bought:
            if item.pantry_applied_at is not None or item.quantity is None or item.unit is None:
                continue
            ingredient = item.ingredient or find_ingredient(db, household_id=household_id, label=item.label)
            if ingredient is None:
                ingredient = FoodIngredient(
                    household_id=household_id,
                    name=item.label.strip()[:200],
                    default_unit_id=item.unit.id,
                    category=item.category or guess_aisle(item.label),
                )
                db.add(ingredient)
                db.flush()
            try:
                add_stock(db, household_id=household_id, ingredient=ingredient,
                          quantity=Decimal(item.quantity), unit=item.unit)
            except UnitMismatchError:
                skipped.append(item.label)
                continue
            item.pantry_applied_at = now
            moved += 1

    lst.status = "done"
    fresh = FoodShoppingList(household_id=household_id, title=DEFAULT_TITLE, status=ACTIVE)
    db.add(fresh)
    db.flush()
    # Re-parent through the relationship so delete-orphan never sees them as orphans.
    for order, item in enumerate([it for it in lst.items if not it.checked]):
        item.sort_order = order
        fresh.items.append(item)
    db.commit()
    return CompleteResult(new_list=reload_list(db, fresh.id), moved_to_pantry=moved, skipped=skipped)


def open_count(lst: FoodShoppingList) -> int:
    return sum(1 for it in lst.items if not it.checked)


__all__ = [
    "CompleteResult",
    "Entry",
    "add_entries",
    "add_for_dish",
    "add_from_menu",
    "add_low_stock",
    "complete",
    "dish_load_options",
    "find_ingredient",
    "get_or_create_current_list",
    "open_count",
    "reload_list",
]
