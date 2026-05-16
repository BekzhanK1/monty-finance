"""Per-household Food bootstrap: default meal categories and starter dishes."""

from sqlalchemy.orm import Session

from app.food.models import FoodDish, FoodMealCategory
from app.food.services.pantry_ingredient_seed import seed_pantry_default_ingredients

DEFAULT_CATEGORIES: list[tuple[str, int]] = [
    ("Завтрак", 0),
    ("Обед", 1),
    ("Ужин", 2),
    ("Перекус", 3),
]

# title, meal category name
DEFAULT_SEED_DISHES: list[tuple[str, str]] = [
    ("Омлет", "Завтрак"),
    ("Паста", "Обед"),
    ("Курица с гарниром", "Ужин"),
    ("Суп", "Обед"),
    ("Салат", "Перекус"),
]


def ensure_default_categories(db: Session, household_id: int) -> None:
    count = db.query(FoodMealCategory).filter(FoodMealCategory.household_id == household_id).count()
    if count > 0:
        return
    for name, order in DEFAULT_CATEGORIES:
        db.add(FoodMealCategory(household_id=household_id, name=name, sort_order=order))
    db.commit()


def seed_default_dishes(db: Session, household_id: int) -> None:
    """Insert 5 starter dishes (no ingredients) when the household catalog is empty."""
    if db.query(FoodDish).filter(FoodDish.household_id == household_id).count() > 0:
        return

    categories = {
        c.name: c
        for c in db.query(FoodMealCategory)
        .filter(FoodMealCategory.household_id == household_id)
        .all()
    }
    for title, category_name in DEFAULT_SEED_DISHES:
        cat = categories.get(category_name)
        if cat is None:
            continue
        db.add(
            FoodDish(
                household_id=household_id,
                meal_category_id=cat.id,
                title=title,
                recipe_text="",
            )
        )
    db.commit()


def ensure_household_food_ready(db: Session, household_id: int) -> None:
    ensure_default_categories(db, household_id)
    seed_default_dishes(db, household_id)
    seed_pantry_default_ingredients(db, household_id)


def active_dish_count(db: Session, household_id: int) -> int:
    return (
        db.query(FoodDish)
        .filter(
            FoodDish.household_id == household_id,
            FoodDish.is_archived.is_(False),
        )
        .count()
    )


def categories_ready(db: Session, household_id: int) -> bool:
    return (
        db.query(FoodMealCategory)
        .filter(FoodMealCategory.household_id == household_id)
        .count()
        > 0
    )
