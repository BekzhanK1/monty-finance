import uuid
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, BigInteger, Boolean, ForeignKey, DateTime, Date, Enum as SQLEnum, event, false
from sqlalchemy.orm import Session, relationship, with_loader_criteria
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

class TransactionSource(str, enum.Enum):
    MANUAL = "manual"
    VOICE = "voice"
    SIRI = "siri"
    BOT = "bot"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    household_id = Column(Integer, nullable=False, default=1, index=True)

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
    # Stored as plain strings (TransactionSource values) so new sources need no enum migration.
    source = Column(String(16), nullable=False, default=TransactionSource.MANUAL.value, server_default=TransactionSource.MANUAL.value)
    raw_text = Column(String(500), nullable=True)
    # Hidden expenses are invisible to everyone (lists, budgets, analytics, digests) until
    # their author reveals them; only the /transactions/hidden endpoints can see them.
    is_hidden = Column(Boolean, nullable=False, default=False, server_default=false())

    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")


# Execution option that lets a statement see hidden transactions.
INCLUDE_HIDDEN = "include_hidden"


@event.listens_for(Session, "do_orm_execute")
def _exclude_hidden_transactions(state):
    """Filter hidden transactions out of every ORM statement unless it opts in with INCLUDE_HIDDEN.

    Global on purpose: a new query (sum, join, export) can't leak a hidden expense by forgetting a filter.
    Column loads (refresh of an object already in hand) are left alone.
    """
    if state.is_column_load or state.execution_options.get(INCLUDE_HIDDEN, False):
        return
    if state.is_select or state.is_update or state.is_delete:
        state.statement = state.statement.options(
            with_loader_criteria(Transaction, Transaction.is_hidden.is_(False), include_aliases=True)
        )

class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, nullable=False)
    value = Column(String(255), nullable=False)
