from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import get_db
from app.models.models import User, Category, MonthlyBudget, Transaction, CategoryGroup
from app.schemas.schemas import BudgetWithSpent, DashboardResponse
from app.middleware.auth import get_current_user
from app.services.database import get_financial_period
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/budgets", tags=["Budgets"])

@router.get("/current", response_model=DashboardResponse)
def get_current_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    salary_day = SettingsService.get_salary_day(db)
    period_start, period_end = get_financial_period(salary_day=salary_day)
    
    budgets = db.query(MonthlyBudget).filter(
        MonthlyBudget.period == period_start
    ).all()
    
    spent_query = db.query(
        Transaction.category_id,
        func.coalesce(func.sum(Transaction.amount), 0).label('spent')
    ).filter(
        Transaction.transaction_date >= period_start,
        Transaction.transaction_date < period_end.replace(day=period_end.day + 1)
    ).group_by(Transaction.category_id).all()
    
    spent_by_category = {s.category_id: s.spent for s in spent_query}
    
    budget_items = []
    for budget in budgets:
        category = budget.category
        spent = spent_by_category.get(budget.category_id, 0)
        remaining = budget.limit_amount - spent
        
        budget_items.append(BudgetWithSpent(
            category_id=category.id,
            category_name=category.name,
            category_icon=category.icon,
            group=category.group.value,
            limit_amount=budget.limit_amount,
            spent=spent,
            remaining=remaining
        ))
    
    savings_deposit = next((b for b in budget_items if b.group == "SAVINGS"), None)
    current_savings = savings_deposit.spent if savings_deposit else 0
    
    target_amount = SettingsService.get_target_amount(db)
    
    return DashboardResponse(
        total_savings_goal=target_amount,
        current_savings=current_savings,
        budgets=budget_items
    )
