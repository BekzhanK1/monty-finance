from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import get_db
from app.models.models import User
from app.schemas.schemas import DashboardResponse
from app.middleware.auth import get_current_user
from app.services.database import get_financial_period
from app.services.settings_service import SettingsService
from app.services.budget_period_service import build_budgets_with_spent, date_range_to_datetimes

router = APIRouter(prefix="/budgets", tags=["Budgets"])

@router.get("/current", response_model=DashboardResponse)
def get_current_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    salary_day = SettingsService.get_salary_day(db)
    period_start, period_end = get_financial_period(salary_day=salary_day)
    window_start, window_end = date_range_to_datetimes(period_start, period_end)
    budget_items = build_budgets_with_spent(db, window_start, window_end)

    savings_deposit = next((b for b in budget_items if b.group == "SAVINGS"), None)
    current_savings = savings_deposit.spent if savings_deposit else 0

    target_amount = SettingsService.get_target_amount(db)

    return DashboardResponse(
        total_savings_goal=target_amount,
        current_savings=current_savings,
        budgets=budget_items,
    )
