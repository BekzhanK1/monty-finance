from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel

class UserBase(BaseModel):
    telegram_id: int
    first_name: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str
    group: str
    type: str
    icon: str

class CategoryResponse(CategoryBase):
    id: int

    class Config:
        from_attributes = True

class MonthlyBudgetBase(BaseModel):
    category_id: int
    period: date
    limit_amount: int

class MonthlyBudgetResponse(MonthlyBudgetBase):
    id: int

    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    category_id: int
    amount: int
    comment: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    category_id: Optional[int] = None
    amount: Optional[int] = None
    comment: Optional[str] = None


class TransactionResponse(TransactionBase):
    id: str
    user_id: int
    transaction_date: datetime

    class Config:
        from_attributes = True

class BudgetWithSpent(BaseModel):
    category_id: int
    category_name: str
    category_icon: str
    group: str
    limit_amount: int
    spent: int
    remaining: int

class DashboardResponse(BaseModel):
    total_savings_goal: int
    current_savings: int
    budgets: list[BudgetWithSpent]


class CategoryCreate(BaseModel):
    name: str
    group: str
    type: str
    icon: str

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    group: Optional[str] = None
    type: Optional[str] = None
    icon: Optional[str] = None


class AnalyticsResponse(BaseModel):
    total_income: int
    total_expenses: int
    total_savings: int
    balance: int
    by_category: list[dict]
    by_group: list[dict]
    daily_data: list[dict]
    top_expenses: list[dict] = []
    by_user: list[dict] = []
    comparison_previous_period: Optional[dict] = None
