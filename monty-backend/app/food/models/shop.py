"""Shopping lists generated from the menu or edited manually."""

from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.core.config import Base

from app.food.models._constants import MVP_HOUSEHOLD_ID


class FoodShoppingList(Base):
    __tablename__ = "food_shopping_lists"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, nullable=False, default=MVP_HOUSEHOLD_ID, index=True)
    title = Column(String(200), nullable=False)
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship(
        "FoodShoppingItem",
        back_populates="shopping_list",
        cascade="all, delete-orphan",
        order_by="FoodShoppingItem.sort_order",
    )


class FoodShoppingItem(Base):
    __tablename__ = "food_shopping_items"

    id = Column(Integer, primary_key=True, index=True)
    list_id = Column(Integer, ForeignKey("food_shopping_lists.id", ondelete="CASCADE"), nullable=False, index=True)
    ingredient_id = Column(Integer, ForeignKey("food_ingredients.id", ondelete="SET NULL"), nullable=True)
    label = Column(String(200), nullable=False)
    quantity = Column(Numeric(12, 4), nullable=True)
    unit_id = Column(Integer, ForeignKey("food_units.id"), nullable=True)
    checked = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)
    note = Column(Text, nullable=True)

    shopping_list = relationship("FoodShoppingList", back_populates="items")
    ingredient = relationship("FoodIngredient")
    unit = relationship("FoodUnit", foreign_keys=[unit_id])
