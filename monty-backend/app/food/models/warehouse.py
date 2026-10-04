"""Warehouses (homes/flats), stock transfers between them and the stock movement journal.

Like a tiny 1C: stock lives per (warehouse, ingredient); every change of quantity is a
movement row, and a transfer is a posted document whose lines move stock between warehouses.
"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.core.config import Base
from app.food.models._constants import MVP_HOUSEHOLD_ID


class FoodWarehouse(Base):
    __tablename__ = "food_warehouses"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, nullable=False, default=MVP_HOUSEHOLD_ID, index=True)
    name = Column(String(100), nullable=False)
    emoji = Column(String(16), nullable=False, default="🏠", server_default="🏠")
    is_default = Column(Boolean, nullable=False, default=False, server_default="0")
    is_archived = Column(Boolean, nullable=False, default=False, server_default="0")
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime, default=datetime.utcnow)


class FoodStockTransfer(Base):
    """Перемещение: a posted document moving stock from one warehouse to another."""

    __tablename__ = "food_stock_transfers"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, nullable=False, index=True)
    number = Column(Integer, nullable=False)  # per-household sequence for display ("№ 12")
    from_warehouse_id = Column(Integer, ForeignKey("food_warehouses.id"), nullable=False)
    to_warehouse_id = Column(Integer, ForeignKey("food_warehouses.id"), nullable=False)
    comment = Column(String(300), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    # Set when the document is cancelled (unposted); movements are reversed, the document stays.
    cancelled_at = Column(DateTime, nullable=True)

    from_warehouse = relationship("FoodWarehouse", foreign_keys=[from_warehouse_id])
    to_warehouse = relationship("FoodWarehouse", foreign_keys=[to_warehouse_id])
    lines = relationship("FoodStockTransferLine", back_populates="transfer", cascade="all, delete-orphan",
                         order_by="FoodStockTransferLine.id")


class FoodStockTransferLine(Base):
    __tablename__ = "food_stock_transfer_lines"

    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("food_stock_transfers.id", ondelete="CASCADE"), nullable=False, index=True)
    ingredient_id = Column(Integer, ForeignKey("food_ingredients.id"), nullable=False)
    quantity = Column(Numeric(12, 4), nullable=False)
    unit_id = Column(Integer, ForeignKey("food_units.id"), nullable=False)

    transfer = relationship("FoodStockTransfer", back_populates="lines")
    ingredient = relationship("FoodIngredient")
    unit = relationship("FoodUnit")


class FoodStockMovement(Base):
    """Регистр остатков: one row per change of a warehouse's stock of an ingredient."""

    __tablename__ = "food_stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("food_warehouses.id"), nullable=False, index=True)
    ingredient_id = Column(Integer, ForeignKey("food_ingredients.id", ondelete="CASCADE"), nullable=False, index=True)
    # Signed, in `unit_id` (the stock row's unit at the time).
    quantity = Column(Numeric(12, 4), nullable=False)
    unit_id = Column(Integer, ForeignKey("food_units.id"), nullable=False)
    # receipt | purchase | cook | adjust | transfer_out | transfer_in | transfer_cancel | writeoff
    kind = Column(String(20), nullable=False)
    transfer_id = Column(Integer, ForeignKey("food_stock_transfers.id"), nullable=True)
    note = Column(String(200), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    unit = relationship("FoodUnit")
    warehouse = relationship("FoodWarehouse")
