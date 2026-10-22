from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import get_db
from app.finance.models import User
from app.finance.schemas import DashboardResponse
from app.middleware.auth import get_current_user
from app.finance.services.settings_service import SettingsService
from app.finance.services.daily_budget import compute_day_budget

router = APIRouter(prefix="/budgets", tags=["Budgets"])

@router.get("/current", response_model=DashboardResponse)
def get_current_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    day_budget = compute_day_budget(db)
    budget_items = day_budget.budgets

    savings_deposit = next((b for b in budget_items if b.group == "SAVINGS"), None)
    current_savings = savings_deposit.spent if savings_deposit else 0

    target_amount = SettingsService.get_target_amount(db)

    return DashboardResponse(
        total_savings_goal=target_amount,
        current_savings=current_savings,
        budgets=budget_items,
        period_start=day_budget.period_start,
        period_end=day_budget.period_end,
        spent_today=day_budget.spent_today,
    )
