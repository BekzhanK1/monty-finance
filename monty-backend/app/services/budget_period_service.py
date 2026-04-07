"""Latest monthly budget rows + spent per category for an arbitrary datetime window."""

from datetime import date, datetime, time
from typing import List

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import MonthlyBudget, Transaction
from app.schemas.schemas import BudgetWithSpent


def latest_monthly_budgets_subquery(db: Session):
    return (
        db.query(
            MonthlyBudget.category_id,
            func.max(MonthlyBudget.period).label("max_period"),
        )
        .group_by(MonthlyBudget.category_id)
        .subquery()
    )


def query_latest_budgets(db: Session):
    subq = latest_monthly_budgets_subquery(db)
    return (
        db.query(MonthlyBudget)
        .join(
            subq,
            (MonthlyBudget.category_id == subq.c.category_id)
            & (MonthlyBudget.period == subq.c.max_period),
        )
    )


def spent_by_category_between(db: Session, start: datetime, end: datetime) -> dict[int, int]:
    rows = (
        db.query(
            Transaction.category_id,
            func.coalesce(func.sum(Transaction.amount), 0).label("spent"),
        )
        .filter(
            Transaction.transaction_date >= start,
            Transaction.transaction_date <= end,
        )
        .group_by(Transaction.category_id)
        .all()
    )
    return {int(r.category_id): int(r.spent) for r in rows}


def date_range_to_datetimes(start_d: date, end_d: date) -> tuple[datetime, datetime]:
    start_dt = datetime.combine(start_d, time.min)
    end_dt = datetime.combine(end_d, time.max)
    return start_dt, end_dt


def build_budgets_with_spent(
    db: Session,
    window_start: datetime,
    window_end: datetime,
) -> List[BudgetWithSpent]:
    budgets = query_latest_budgets(db).all()
    spent_map = spent_by_category_between(db, window_start, window_end)
    items: List[BudgetWithSpent] = []
    for budget in budgets:
        category = budget.category
        spent = spent_map.get(budget.category_id, 0)
        remaining = budget.limit_amount - spent
        items.append(
            BudgetWithSpent(
                category_id=category.id,
                category_name=category.name,
                category_icon=category.icon,
                group=category.group.value,
                limit_amount=budget.limit_amount,
                spent=spent,
                remaining=remaining,
            )
        )
    return items
