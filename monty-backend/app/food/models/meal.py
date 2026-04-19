"""Meal categories and dishes (catalog grouping + free-text recipe)."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.config import Base

from app.food.models._constants import MVP_HOUSEHOLD_ID


class FoodMealCategory(Base):
    __tablename__ = "food_meal_categories"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, nullable=False, default=MVP_HOUSEHOLD_ID, index=True)
    name = Column(String(100), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)

    dishes = relationship(
        "FoodDish",
        back_populates="meal_category",
        cascade="all, delete-orphan",
    )


class FoodDish(Base):
    __tablename__ = "food_dishes"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, nullable=False, default=MVP_HOUSEHOLD_ID, index=True)
    meal_category_id = Column(Integer, ForeignKey("food_meal_categories.id"), nullable=False)
    title = Column(String(200), nullable=False)
    recipe_text = Column(Text, nullable=False, default="")
    description = Column(Text, nullable=True)
    servings_default = Column(Integer, nullable=False, default=4)
    prep_minutes = Column(Integer, nullable=True)
    cook_minutes = Column(Integer, nullable=True)
    is_archived = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, default=datetime.utcnow, onupdate=datetime.utcnow)

    meal_category = relationship("FoodMealCategory", back_populates="dishes")
    ingredients = relationship(
        "FoodDishIngredient",
        back_populates="dish",
        cascade="all, delete-orphan",
        order_by="FoodDishIngredient.sort_order",
    )
