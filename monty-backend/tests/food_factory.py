"""Tiny builders for Food tests."""

from datetime import date
from decimal import Decimal

from app.food.models import (
    FoodDish,
    FoodDishIngredient,
    FoodIngredient,
    FoodMealCategory,
    FoodMealSlot,
    FoodPantryItem,
    FoodUnit,
    FoodWarehouse,
)
from app.food.services.unit_seed import ensure_default_units


class Food:
    def __init__(self, db, household_id: int = 1):
        self.db = db
        self.household_id = household_id
        ensure_default_units(db)
        self.units = {u.code: u for u in db.query(FoodUnit).all()}
        self._category = None
        self.home = self.warehouse("Дом", default=True)

    def warehouse(self, name: str, default: bool = False) -> FoodWarehouse:
        row = FoodWarehouse(household_id=self.household_id, name=name, is_default=default)
        self.db.add(row)
        self.db.commit()
        return row

    def unit(self, code: str) -> FoodUnit:
        return self.units[code]

    def ingredient(self, name: str, unit: str = "g", category: str | None = None, always_home: bool = False):
        row = FoodIngredient(household_id=self.household_id, name=name, default_unit_id=self.unit(unit).id,
                             category=category, is_pantry_default=always_home)
        self.db.add(row)
        self.db.commit()
        return row

    def category(self):
        if self._category is None:
            self._category = FoodMealCategory(household_id=self.household_id, name="Ужин", sort_order=0)
            self.db.add(self._category)
            self.db.commit()
        return self._category

    def dish(self, title: str, lines: list[tuple], servings: int = 2):
        dish = FoodDish(household_id=self.household_id, meal_category_id=self.category().id, title=title,
                        recipe_text="", servings_default=servings)
        self.db.add(dish)
        self.db.flush()
        for order, (ingredient, qty, unit) in enumerate(lines):
            self.db.add(FoodDishIngredient(dish_id=dish.id, ingredient_id=ingredient.id, quantity=Decimal(str(qty)),
                                           unit_id=self.unit(unit).id, sort_order=order))
        self.db.commit()
        self.db.refresh(dish)
        return dish

    def stock(self, ingredient, qty, unit: str, warehouse: FoodWarehouse | None = None, **extra):
        row = FoodPantryItem(household_id=self.household_id, warehouse_id=(warehouse or self.home).id,
                             ingredient_id=ingredient.id, quantity=Decimal(str(qty)), unit_id=self.unit(unit).id, **extra)
        self.db.add(row)
        self.db.commit()
        return row

    def slot(self, dish, when: date, key: str = "dinner", servings: int = 2):
        row = FoodMealSlot(household_id=self.household_id, slot_date=when, slot_key=key, dish_id=dish.id,
                           servings=servings)
        self.db.add(row)
        self.db.commit()
        return row
