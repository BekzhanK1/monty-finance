"""Food service ORM. MVP: single household_id until multi-tenant is needed."""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.config import Base

# Single shared workspace for the couple (see docs/food-service-architecture.md).
MVP_HOUSEHOLD_ID = 1


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
    created_at = Column(DateTime, default=datetime.utcnow)

    meal_category = relationship("FoodMealCategory", back_populates="dishes")
