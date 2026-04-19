"""Menu slots: calendar view is derived from date range queries."""

from sqlalchemy import Column, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.config import Base

from app.food.models._constants import MVP_HOUSEHOLD_ID


class FoodMealSlot(Base):
    __tablename__ = "food_meal_slots"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, nullable=False, default=MVP_HOUSEHOLD_ID, index=True)
    slot_date = Column(Date, nullable=False, index=True)
    slot_key = Column(String(32), nullable=False, index=True)  # breakfast | lunch | dinner | snack
    dish_id = Column(Integer, ForeignKey("food_dishes.id", ondelete="SET NULL"), nullable=True)
    custom_title = Column(String(200), nullable=True)
    servings = Column(Integer, nullable=False, default=2)
    notes = Column(Text, nullable=True)

    dish = relationship("FoodDish")
