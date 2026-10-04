"""Stock on hand — one row per ingredient per warehouse."""

from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.config import Base

from app.food.models._constants import MVP_HOUSEHOLD_ID


class FoodPantryItem(Base):
    __tablename__ = "food_pantry_items"

    __table_args__ = (
        UniqueConstraint("warehouse_id", "ingredient_id", name="uq_food_pantry_warehouse_ingredient"),
    )

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, nullable=False, default=MVP_HOUSEHOLD_ID, index=True)
    warehouse_id = Column(Integer, ForeignKey("food_warehouses.id"), nullable=False, index=True)
    ingredient_id = Column(Integer, ForeignKey("food_ingredients.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Numeric(12, 4), nullable=False)
    unit_id = Column(Integer, ForeignKey("food_units.id"), nullable=False)
    note = Column(String(500), nullable=True)
    # fridge | freezer | pantry — where it lives at home.
    location = Column(String(16), nullable=False, default="pantry", server_default="pantry")
    expires_on = Column(Date, nullable=True)
    # Below this the item counts as "running low" and can be added to the shopping list.
    min_quantity = Column(Numeric(12, 4), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ingredient = relationship("FoodIngredient")
    unit = relationship("FoodUnit", foreign_keys=[unit_id])
    warehouse = relationship("FoodWarehouse")
