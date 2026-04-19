"""Normalized units, ingredients, and per-dish ingredient lines."""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.core.config import Base

from app.food.models._constants import MVP_HOUSEHOLD_ID


class FoodUnit(Base):
    """Global unit reference (not scoped per household)."""

    __tablename__ = "food_units"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(32), nullable=False, unique=True, index=True)
    name = Column(String(80), nullable=False)
    system = Column(String(20), nullable=False, default="metric")


class FoodIngredient(Base):
    __tablename__ = "food_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, nullable=False, default=MVP_HOUSEHOLD_ID, index=True)
    name = Column(String(200), nullable=False)
    default_unit_id = Column(Integer, ForeignKey("food_units.id"), nullable=False)
    category = Column(String(64), nullable=True)
    notes = Column(String(500), nullable=True)

    default_unit = relationship("FoodUnit", foreign_keys=[default_unit_id])


class FoodDishIngredient(Base):
    __tablename__ = "food_dish_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    dish_id = Column(Integer, ForeignKey("food_dishes.id", ondelete="CASCADE"), nullable=False, index=True)
    ingredient_id = Column(Integer, ForeignKey("food_ingredients.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Numeric(12, 4), nullable=False)
    unit_id = Column(Integer, ForeignKey("food_units.id"), nullable=False)
    is_optional = Column(Boolean, nullable=False, default=False)
    note = Column(String(500), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)

    dish = relationship("FoodDish", back_populates="ingredients")
    ingredient = relationship("FoodIngredient")
    unit = relationship("FoodUnit", foreign_keys=[unit_id])
