from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_db
from app.finance.models import User, Transaction, TransactionType, CategoryGroup
from app.finance.schemas import AnalyticsResponse
from app.middleware.auth import get_current_user
from app.finance.services.analytics_helpers import large_one_off_expense_total
from app.finance.services.budget_period_service import build_budgets_with_spent, date_range_to_datetimes

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _parse_boundary_date(s: Optional[str], default: date) -> date:
    if not s:
        return default
    raw = s.strip()
    if "T" in raw:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
    return date.fromisoformat(raw[:10])


def _build_analytics_response(
    db: Session,
    transactions: list,
    window_start: datetime,
    window_end: datetime,
    period_start_str: str,
    period_end_str: str,
    comparison_previous_period: Optional[dict],
) -> AnalyticsResponse:
    total_income = sum(
        t.amount for t in transactions if t.category.type == TransactionType.INCOME
    )
    total_expenses = sum(
        t.amount
        for t in transactions
        if t.category.type == TransactionType.EXPENSE
        and t.category.group != CategoryGroup.SAVINGS
    )
    total_savings = sum(
        t.amount
        for t in transactions
        if t.category.type == TransactionType.EXPENSE
        and t.category.group == CategoryGroup.SAVINGS
    )
    balance = total_income - total_expenses

    by_category = {}
    for t in transactions:
        cat_name = t.category.name
        cat_icon = t.category.icon
        cat_type = t.category.type
        cat_group = t.category.group

        if cat_name not in by_category:
            by_category[cat_name] = {
                "name": cat_name,
                "icon": cat_icon,
                "income": 0,
                "expense": 0,
                "savings": 0,
            }
        if cat_type == TransactionType.INCOME:
            by_category[cat_name]["income"] += t.amount
        elif cat_group == CategoryGroup.SAVINGS:
            by_category[cat_name]["savings"] += t.amount
        else:
            by_category[cat_name]["expense"] += t.amount

    def _cat_type(v):
        if v["income"] > 0:
            return "income"
        if v["savings"] > 0:
            return "savings"
        return "expense"

    by_category_list = [
        {
            "name": v["name"],
            "icon": v["icon"],
            "amount": v["expense"] or v["savings"] or v["income"],
            "type": _cat_type(v),
        }
        for v in by_category.values()
    ]
    by_category_list.sort(key=lambda x: x["amount"], reverse=True)

    by_group = {}
    for t in transactions:
        group = t.category.group.value
        if group not in by_group:
            by_group[group] = {"group": group, "income": 0, "expense": 0, "savings": 0}
        if t.category.type == TransactionType.INCOME:
            by_group[group]["income"] += t.amount
        elif t.category.group == CategoryGroup.SAVINGS:
            by_group[group]["savings"] += t.amount
        else:
            by_group[group]["expense"] += t.amount

    by_group_list = []
    for g in by_group.values():
        if g["income"] > 0:
            by_group_list.append({"group": g["group"], "amount": g["income"], "type": "income"})
        if g["expense"] > 0:
            by_group_list.append({"group": g["group"], "amount": g["expense"], "type": "expense"})
        if g["savings"] > 0:
            by_group_list.append({"group": g["group"], "amount": g["savings"], "type": "savings"})
    by_group_list.sort(key=lambda x: x["amount"], reverse=True)

    daily_data = {}
    for t in transactions:
        day = t.transaction_date.date().isoformat()
        if day not in daily_data:
            daily_data[day] = {"date": day, "income": 0, "expense": 0}
        if t.category.type == TransactionType.INCOME:
            daily_data[day]["income"] += t.amount
        elif t.category.group != CategoryGroup.SAVINGS:
            daily_data[day]["expense"] += t.amount

    daily_list = sorted(daily_data.values(), key=lambda x: x["date"])

    top_expenses = [x for x in by_category_list if x.get("type") in ("expense", "savings")][:5]

    by_user_map = {}
    for t in transactions:
        uid = t.user_id
        name = t.user.first_name or "Без имени"
        if uid not in by_user_map:
            by_user_map[uid] = {
                "user_id": uid,
                "user_name": name,
                "income": 0,
                "expense": 0,
                "savings": 0,
            }
        if t.category.type == TransactionType.INCOME:
            by_user_map[uid]["income"] += t.amount
        elif t.category.group == CategoryGroup.SAVINGS:
            by_user_map[uid]["savings"] += t.amount
        else:
            by_user_map[uid]["expense"] += t.amount
    by_user_list = list(by_user_map.values())

    budgets_with_spent = build_budgets_with_spent(db, window_start, window_end)
    large_one_off = large_one_off_expense_total(transactions)

    return AnalyticsResponse(
        total_income=total_income,
        total_expenses=total_expenses,
        total_savings=total_savings,
        balance=balance,
        by_category=by_category_list[:10],
        by_group=by_group_list,
        daily_data=daily_list,
        top_expenses=top_expenses,
        by_user=by_user_list,
        comparison_previous_period=comparison_previous_period,
        period_start=period_start_str,
        period_end=period_end_str,
        large_one_off_total=large_one_off,
        budgets_with_spent=budgets_with_spent,
    )


@router.get("", response_model=AnalyticsResponse)
def get_analytics(
    months: int = Query(3, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30 * months)

    transactions = (
        db.query(Transaction)
        .options(joinedload(Transaction.user))
        .filter(
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
        .all()
    )

    prev_start = start_date - timedelta(days=30 * months)
    prev_transactions = db.query(Transaction).filter(
        Transaction.transaction_date >= prev_start,
        Transaction.transaction_date < start_date,
    ).all()
    prev_income = sum(
        t.amount for t in prev_transactions if t.category.type == TransactionType.INCOME
    )
    prev_expenses = sum(
        t.amount
        for t in prev_transactions
        if t.category.type == TransactionType.EXPENSE
        and t.category.group != CategoryGroup.SAVINGS
    )
    comparison_previous_period = {
        "total_income": prev_income,
        "total_expenses": prev_expenses,
        "balance": prev_income - prev_expenses,
    }

    period_start_str = start_date.date().isoformat()
    period_end_str = end_date.date().isoformat()

    return _build_analytics_response(
        db,
        transactions,
        start_date,
        end_date,
        period_start_str,
        period_end_str,
        comparison_previous_period,
    )


@router.get("/period", response_model=AnalyticsResponse)
def get_analytics_for_period(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = datetime.utcnow().date()
    start_d = _parse_boundary_date(
        start_date,
        today - timedelta(days=30),
    )
    end_d = _parse_boundary_date(end_date, today)
    if start_d > end_d:
        start_d, end_d = end_d, start_d

    window_start, window_end = date_range_to_datetimes(start_d, end_d)

    transactions = (
        db.query(Transaction)
        .options(joinedload(Transaction.user))
        .filter(
            Transaction.transaction_date >= window_start,
            Transaction.transaction_date <= window_end,
        )
        .all()
    )

    delta = window_end - window_start
    comparison_previous_period = None
    if delta.total_seconds() > 0:
        prev_end_dt = window_start
        prev_start_dt = window_start - delta
        prev_transactions = db.query(Transaction).filter(
            Transaction.transaction_date >= prev_start_dt,
            Transaction.transaction_date < prev_end_dt,
        ).all()
        prev_income = sum(
            t.amount for t in prev_transactions if t.category.type == TransactionType.INCOME
        )
        prev_expenses = sum(
            t.amount
            for t in prev_transactions
            if t.category.type == TransactionType.EXPENSE
            and t.category.group != CategoryGroup.SAVINGS
        )
        comparison_previous_period = {
            "total_income": prev_income,
            "total_expenses": prev_expenses,
            "balance": prev_income - prev_expenses,
        }

    period_start_str = start_d.isoformat()
    period_end_str = end_d.isoformat()

    return _build_analytics_response(
        db,
        transactions,
        window_start,
        window_end,
        period_start_str,
        period_end_str,
        comparison_previous_period,
    )
