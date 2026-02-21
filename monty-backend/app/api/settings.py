from app.core.config import get_db
from app.middleware.auth import get_current_user
from app.models.models import Category, MonthlyBudget, User
from app.services.database import get_financial_period
from app.services.settings_service import SettingsService
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingUpdate(BaseModel):
    key: str
    value: str


class SettingsResponse(BaseModel):
    target_amount: str
    target_date: str
    salary_day: str
    total_budget: str


class BudgetConfig(BaseModel):
    category_id: int
    limit_amount: int
    period: str


class BudgetConfigResponse(BaseModel):
    category_id: int
    category_name: str
    category_icon: str
    group: str
    type: str
    limit_amount: int


@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    settings = SettingsService.get_all_settings(db)
    return settings


@router.post("")
def update_setting(setting: SettingUpdate, db: Session = Depends(get_db)):
    allowed_keys = [
        "target_amount",
        "target_date",
        "salary_day",
        "total_budget",
    ]

    if setting.key not in allowed_keys:
        return {"error": f"Key must be one of: {allowed_keys}"}

    SettingsService.set_setting(db, setting.key, setting.value)

    return {"success": True, "key": setting.key, "value": setting.value}


@router.get("/budgets", response_model=list[BudgetConfigResponse])
def get_budget_config(db: Session = Depends(get_db)):
    salary_day = SettingsService.get_salary_day(db)
    period_start, _ = get_financial_period(salary_day=salary_day)

    budgets = db.query(MonthlyBudget).filter(MonthlyBudget.period == period_start).all()

    result = []
    for budget in budgets:
        result.append(
            BudgetConfigResponse(
                category_id=budget.category_id,
                category_name=budget.category.name,
                category_icon=budget.category.icon,
                group=budget.category.group.value,
                type=budget.category.type.value,
                limit_amount=budget.limit_amount,
            )
        )

    return result


@router.post("/budgets")
def update_budget_config(config: BudgetConfig, db: Session = Depends(get_db)):
    salary_day = SettingsService.get_salary_day(db)
    period_start, _ = get_financial_period(salary_day=salary_day)

    budget = (
        db.query(MonthlyBudget)
        .filter(
            MonthlyBudget.category_id == config.category_id,
            MonthlyBudget.period == period_start,
        )
        .first()
    )

    if budget:
        budget.limit_amount = config.limit_amount
    else:
        budget = MonthlyBudget(
            category_id=config.category_id,
            period=period_start,
            limit_amount=config.limit_amount,
        )
        db.add(budget)

    db.commit()

    return {"success": True}


@router.get("/categories", response_model=list)
def get_all_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "icon": c.icon,
            "group": c.group.value,
            "type": c.type.value,
        }
        for c in categories
    ]
