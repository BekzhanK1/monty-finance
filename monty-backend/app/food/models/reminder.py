"""Idempotent Telegram food reminders per household per day."""

from datetime import date

from sqlalchemy import Column, Date, Integer, UniqueConstraint

from app.core.config import Base

from app.food.models._constants import MVP_HOUSEHOLD_ID


class FoodReminderSent(Base):
    __tablename__ = "food_reminder_sent"

    __table_args__ = (
        UniqueConstraint("household_id", "reminder_date", name="uq_food_reminder_household_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, nullable=False, default=MVP_HOUSEHOLD_ID, index=True)
    reminder_date = Column(Date, nullable=False, index=True)
