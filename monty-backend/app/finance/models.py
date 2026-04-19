import uuid
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, BigInteger, Boolean, ForeignKey, DateTime, Date, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.config import Base
import enum

class CategoryGroup(str, enum.Enum):
    BASE = "BASE"
    COMFORT = "COMFORT"
    SAVINGS = "SAVINGS"
    INCOME = "INCOME"

class TransactionType(str, enum.Enum):
    EXPENSE = "EXPENSE"
    INCOME = "INCOME"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)

    transactions = relationship("Transaction", back_populates="user")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    group = Column(SQLEnum(CategoryGroup), nullable=False)
    type = Column(SQLEnum(TransactionType), nullable=False)
    icon = Column(String(10), nullable=False)

    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("MonthlyBudget", back_populates="category")

class MonthlyBudget(Base):
    __tablename__ = "monthly_budgets"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    period = Column(Date, nullable=False)
    limit_amount = Column(Integer, nullable=False)

    category = relationship("Category", back_populates="budgets")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    transaction_date = Column(DateTime, default=datetime.utcnow)
    comment = Column(String(255), nullable=True)

    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")

class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, nullable=False)
    value = Column(String(255), nullable=False)
