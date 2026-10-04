from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy.orm import selectinload

from app.food.models import FoodDish, FoodPantryItem
from app.food.services import shopping_service as shop
from app.food.services.aisles import aisle_for, default_location, guess_aisle
from app.food.services.inventory import (
    UnitMismatchError,
    add_stock,
    check_availability,
    consume,
    dish_load_options,
    dish_needs,
    load_pantry,
    readiness,
)
from app.food.services.units import convert
from tests.food_factory import Food


def test_unit_conversion():
    assert convert(Decimal("1.5"), "kg", "g") == Decimal(1500)
    assert convert(Decimal(250), "ml", "l") == Decimal("0.25")
    assert convert(Decimal(2), "pcs", "pcs") == Decimal(2)
    assert convert(Decimal(1), "kg", "ml") is None
    assert convert(Decimal(1), "tbsp", "ml") is None


@pytest.mark.parametrize("name, aisle", [
    ("Молоко 3,2%", "dairy"), ("Яйца", "dairy"), ("Куриное филе", "meat"), ("Картофель", "produce"),
    ("Перец болгарский", "produce"), ("Перец чёрный", "spices"), ("Фасоль красная", "grocery"),
    ("Рис басмати", "grocery"), ("Пельмени", "frozen"), ("Батон", "bakery"), ("Салфетки", "household"),
    ("Что-то странное", "other"),
])
def test_guess_aisle(name, aisle):
    assert guess_aisle(name) == aisle


def test_aisle_for_prefers_stored_key_and_ignores_legacy_text():
    assert aisle_for("meat", "Тофу") == "meat"
    assert aisle_for("специи и масла", "Соль") == "spices"
    assert default_location("frozen") == "freezer"
    assert default_location("grocery") == "pantry"


def _dish(db, dish_id):
    return db.query(FoodDish).options(*dish_load_options()).filter(FoodDish.id == dish_id).one()


def test_availability_converts_units_and_scales_servings(db):
    f = Food(db)
    flour, eggs, salt = f.ingredient("Мука", "g"), f.ingredient("Яйца", "pcs"), f.ingredient("Соль", always_home=True)
    dish = f.dish("Блины", [(flour, 200, "g"), (eggs, 2, "pcs"), (salt, 5, "g")], servings=2)
    f.stock(flour, 1, "kg")
    f.stock(eggs, 3, "pcs")

    pantry = load_pantry(db, household_id=1, warehouse_id=f.home.id)
    lines = check_availability(dish_needs(_dish(db, dish.id)), pantry)
    assert [line.status for line in lines] == ["ok", "ok", "always_home"]
    assert lines[0].have == Decimal(1000)
    assert readiness(lines) == "ready"

    # Four servings need 4 eggs: one short.
    lines = check_availability(dish_needs(_dish(db, dish.id), servings=4), pantry)
    assert lines[1].status == "short" and lines[1].missing == Decimal(1)
    assert readiness(lines) == "partial"


def test_readiness_missing_and_unit_mismatch(db):
    f = Food(db)
    milk = f.ingredient("Молоко", "ml")
    dish = f.dish("Каша", [(milk, 300, "ml")])
    assert readiness(check_availability(dish_needs(_dish(db, dish.id)), load_pantry(db, household_id=1, warehouse_id=f.home.id))) == "missing"
    f.stock(milk, 2, "pcs")
    [line] = check_availability(dish_needs(_dish(db, dish.id)), load_pantry(db, household_id=1, warehouse_id=f.home.id))
    assert line.status == "unit_mismatch"


def test_consume_subtracts_in_pantry_units_and_never_goes_negative(db):
    f = Food(db)
    flour, eggs = f.ingredient("Мука"), f.ingredient("Яйца", "pcs")
    dish = f.dish("Блины", [(flour, 300, "g"), (eggs, 4, "pcs")], servings=2)
    flour_row = f.stock(flour, 1, "kg")
    eggs_row = f.stock(eggs, 3, "pcs")

    consumed = consume(db, dish_needs(_dish(db, dish.id)), load_pantry(db, household_id=1, warehouse_id=f.home.id))
    db.commit()
    db.refresh(flour_row)
    db.refresh(eggs_row)
    assert Decimal(flour_row.quantity) == Decimal("0.7")
    assert Decimal(eggs_row.quantity) == 0
    assert [(c.name, c.shortfall) for c in consumed] == [("Мука", False), ("Яйца", True)]


def test_add_stock_merges_converts_and_rejects_incompatible(db):
    f = Food(db)
    milk = f.ingredient("Молоко", "ml", category="dairy")
    row = add_stock(db, household_id=1, warehouse_id=f.home.id, ingredient=milk, quantity=Decimal(1), unit=f.unit("l"))
    db.commit()
    assert row.location == "fridge"
    add_stock(db, household_id=1, warehouse_id=f.home.id, ingredient=milk, quantity=Decimal(500), unit=f.unit("ml"))
    db.commit()
    db.refresh(row)
    assert Decimal(row.quantity) == Decimal("1.5") and row.unit.code == "l"
    with pytest.raises(UnitMismatchError):
        add_stock(db, household_id=1, warehouse_id=f.home.id, ingredient=milk, quantity=Decimal(2), unit=f.unit("pcs"))


def test_shopping_from_menu_is_idempotent_and_subtracts_stock(db):
    f = Food(db)
    rice, chicken, onion = f.ingredient("Рис"), f.ingredient("Курица", category="meat"), f.ingredient("Лук", "pcs")
    plov = f.dish("Плов", [(rice, 300, "g"), (chicken, 500, "g"), (onion, 2, "pcs")], servings=2)
    salad = f.dish("Салат", [(onion, 1, "pcs")], servings=2)
    f.slot(plov, date(2026, 10, 5), servings=4)
    f.slot(salad, date(2026, 10, 6))
    f.stock(rice, 1, "kg")  # enough rice

    lst = shop.get_or_create_current_list(db, household_id=1)
    assert shop.add_from_menu(db, lst, household_id=1, warehouse_id=f.home.id, date_from=date(2026, 10, 5), date_to=date(2026, 10, 11)) == 2
    db.commit()
    lst = shop.reload_list(db, lst.id)
    items = {it.label: it for it in lst.items}
    assert set(items) == {"Курица", "Лук"}
    assert Decimal(items["Курица"].quantity) == 1000 and items["Курица"].category == "meat"
    assert Decimal(items["Лук"].quantity) == 5
    assert items["Лук"].sources == "Плов, Салат"

    # Running it again adds nothing.
    assert shop.add_from_menu(db, lst, household_id=1, warehouse_id=f.home.id, date_from=date(2026, 10, 5), date_to=date(2026, 10, 11)) == 0


def test_manual_add_merges_same_product(db):
    f = Food(db)
    milk = f.ingredient("Молоко", "ml")
    lst = shop.get_or_create_current_list(db, household_id=1)
    shop.add_entries(db, lst, [shop.Entry("Молоко", Decimal(1), f.unit("l"), milk)])
    shop.add_entries(db, lst, [shop.Entry("молоко", Decimal(500), f.unit("ml"), milk)])
    shop.add_entries(db, lst, [shop.Entry("Хлеб", None, None)])
    db.commit()
    lst = shop.reload_list(db, lst.id)
    assert [(it.label, it.quantity and float(it.quantity), it.category) for it in lst.items] == [
        ("Молоко", 1.5, "dairy"), ("Хлеб", None, "bakery"),
    ]


def test_low_stock_tops_up_to_minimum(db):
    f = Food(db)
    eggs = f.ingredient("Яйца", "pcs")
    f.stock(eggs, 2, "pcs", min_quantity=Decimal(10))
    lst = shop.get_or_create_current_list(db, household_id=1)
    assert shop.add_low_stock(db, lst, household_id=1, warehouse_id=f.home.id) == 1
    db.commit()
    [item] = shop.reload_list(db, lst.id).items
    assert (item.label, float(item.quantity), item.sources) == ("Яйца", 8.0, "заканчивается")


def test_complete_moves_bought_to_pantry_and_carries_over_the_rest(db):
    f = Food(db)
    milk = f.ingredient("Молоко", "ml", category="dairy")
    lst = shop.get_or_create_current_list(db, household_id=1)
    shop.add_entries(db, lst, [
        shop.Entry("Молоко", Decimal(1), f.unit("l"), milk),
        shop.Entry("Сыр", Decimal(300), f.unit("g")),
        shop.Entry("Хлеб", None, None),
    ])
    db.commit()
    lst = shop.reload_list(db, lst.id)
    for it in lst.items:
        it.checked = it.label != "Хлеб"
    db.commit()

    result = shop.complete(db, lst, household_id=1, to_pantry=True, warehouse_id=f.home.id)
    assert result.moved_to_pantry == 2 and result.skipped == []
    assert [it.label for it in result.new_list.items] == ["Хлеб"]
    assert result.new_list.id != lst.id and shop.get_or_create_current_list(db, household_id=1).id == result.new_list.id

    stock = {r.ingredient.name: r for r in db.query(FoodPantryItem).options(
        selectinload(FoodPantryItem.ingredient), selectinload(FoodPantryItem.unit)).all()}
    assert float(stock["Молоко"].quantity) == 1 and stock["Молоко"].unit.code == "l"
    # Unknown product became an ingredient on the fly, filed under its aisle.
    assert stock["Сыр"].ingredient.category == "dairy" and stock["Сыр"].location == "fridge"
