from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_db
from app.finance.models import Category, User, Transaction, TransactionType, CategoryGroup
from app.finance.schemas import AnalyticsResponse
from app.middleware.auth import get_current_user
from app.finance.services.analytics_helpers import category_breakdown, large_one_off_expense_total
from app.finance.services import analytics_service as av2
from app.finance.services.budget_period_service import (
    build_budgets_with_spent,
    date_range_to_datetimes,
    query_latest_budgets,
)
from app.finance.services.database import get_financial_period
from app.finance.services.settings_service import SettingsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _parse_boundary_date(s: Optional[str], default: date) -> date:
    if not s:
        return default
    raw = s.strip()
    if "T" in raw:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
    return date.fromisoformat(raw[:10])


def _period_totals(transactions: list) -> tuple[int, int, int]:
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
    return total_income, total_expenses, total_savings


def _load_transactions(db: Session, start: datetime, end: datetime, *, end_inclusive: bool) -> list:
    query = (
        db.query(Transaction)
        .options(joinedload(Transaction.user), joinedload(Transaction.category))
        .filter(Transaction.transaction_date >= start)
    )
    if end_inclusive:
        query = query.filter(Transaction.transaction_date <= end)
    else:
        query = query.filter(Transaction.transaction_date < end)
    return query.all()


def _build_analytics_response(
    db: Session,
    transactions: list,
    window_start: datetime,
    window_end: datetime,
    period_start_str: str,
    period_end_str: str,
    prev_transactions: Optional[list] = None,
) -> AnalyticsResponse:
    total_income, total_expenses, total_savings = _period_totals(transactions)
    balance = total_income - total_expenses

    by_category_list = category_breakdown(transactions, prev_transactions)

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

    comparison_previous_period = None
    if prev_transactions is not None:
        prev_income, prev_expenses, prev_savings = _period_totals(prev_transactions)
        comparison_previous_period = {
            "total_income": prev_income,
            "total_expenses": prev_expenses,
            "total_savings": prev_savings,
            "balance": prev_income - prev_expenses,
        }

    return AnalyticsResponse(
        total_income=total_income,
        total_expenses=total_expenses,
        total_savings=total_savings,
        balance=balance,
        by_category=by_category_list,
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

    transactions = _load_transactions(db, start_date, end_date, end_inclusive=True)

    prev_start = start_date - timedelta(days=30 * months)
    prev_transactions = _load_transactions(db, prev_start, start_date, end_inclusive=False)

    period_start_str = start_date.date().isoformat()
    period_end_str = end_date.date().isoformat()

    return _build_analytics_response(
        db,
        transactions,
        start_date,
        end_date,
        period_start_str,
        period_end_str,
        prev_transactions,
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

    transactions = _load_transactions(db, window_start, window_end, end_inclusive=True)

    delta = window_end - window_start
    prev_transactions = None
    if delta.total_seconds() > 0:
        prev_transactions = _load_transactions(
            db,
            window_start - delta,
            window_start,
            end_inclusive=False,
        )

    period_start_str = start_d.isoformat()
    period_end_str = end_d.isoformat()

    return _build_analytics_response(
        db,
        transactions,
        window_start,
        window_end,
        period_start_str,
        period_end_str,
        prev_transactions,
    )


# ---------------------------------------------------------------------------
# Analytics v2 — see services/analytics_service.py
# ---------------------------------------------------------------------------

HISTORY_DAYS = 180


def _to_tx(t: Transaction) -> av2.Tx:
    if t.category.type == TransactionType.INCOME:
        kind = "income"
    elif t.category.group == CategoryGroup.SAVINGS:
        kind = "savings"
    else:
        kind = "expense"
    return av2.Tx(
        id=t.id,
        amount=t.amount,
        kind=kind,
        group=t.category.group.value,
        category_id=t.category_id,
        category_name=t.category.name,
        category_icon=t.category.icon,
        comment=t.comment,
        user_id=t.user_id,
        user_name=(t.user.first_name if t.user else None) or "Без имени",
        day=av2.local_day(t.transaction_date),
    )


def _txs_between(db: Session, start: date, end: date) -> list[av2.Tx]:
    window_start, window_end = date_range_to_datetimes(start, end)
    return [_to_tx(t) for t in _load_transactions(db, window_start, window_end, end_inclusive=True)]


def _resolve_period(db: Session, start_date: Optional[str], end_date: Optional[str], today: date):
    """Explicit range, or the current salary-to-salary period. Returns (start, end, previous range)."""
    salary_day = SettingsService.get_salary_day(db)
    if not start_date and not end_date:
        start, end = get_financial_period(today, salary_day)
        prev = get_financial_period(start - timedelta(days=1), salary_day)
        return start, end, prev
    start = _parse_boundary_date(start_date, today - timedelta(days=29))
    end = _parse_boundary_date(end_date, today)
    if start > end:
        start, end = end, start
    if (start, end) == get_financial_period(start, salary_day):
        return start, end, get_financial_period(start - timedelta(days=1), salary_day)
    length = (end - start).days + 1
    return start, end, (start - timedelta(days=length), start - timedelta(days=1))


def _expense_limits(db: Session) -> dict[int, int]:
    return {b.category_id: b.limit_amount for b in query_latest_budgets(db).all()}


@router.get("/overview")
def analytics_overview(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Everything the analytics screen shows for one period (default: current salary period)."""
    today = av2.local_day(datetime.utcnow())
    start, end, (prev_start, prev_end) = _resolve_period(db, start_date, end_date, today)
    period = av2.Period(start=start, end=end, today=today)

    txs = _txs_between(db, start, end)
    prev_txs = _txs_between(db, prev_start, prev_end)
    history = _txs_between(db, start - timedelta(days=HISTORY_DAYS), start - timedelta(days=1))

    limits = _expense_limits(db)
    groups_by_cat = {c.id: c.group for c in db.query(Category).all()}
    budget_limit = sum(
        amount for cat_id, amount in limits.items()
        if groups_by_cat.get(cat_id) in (CategoryGroup.BASE, CategoryGroup.COMFORT)
    )

    cur, prev = av2.totals(txs), av2.totals(prev_txs)
    cats = av2.categories(txs, prev_txs, limits)
    weekdays = av2.weekday_averages(txs, period)
    fc = av2.forecast(txs, period, budget_limit)
    found = av2.anomalies(txs, history + txs)
    struct = av2.structure(txs)

    return {
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "days_total": period.days_total,
            "days_elapsed": period.days_elapsed,
            "is_current": period.is_current,
        },
        "previous": {"start": prev_start.isoformat(), "end": prev_end.isoformat(), **prev.as_dict()},
        "totals": cur.as_dict(),
        "budget_limit": budget_limit,
        "forecast": fc,
        "cumulative": av2.cumulative_series(txs, period, budget_limit),
        "structure": struct,
        "categories": cats,
        "weekdays": weekdays,
        "heatmap": av2.heatmap(txs, period),
        "top_expenses": av2.top_expenses(txs),
        "anomalies": found,
        "by_user": av2.by_user(txs),
        "insights": av2.insights(cur=cur, prev=prev, cats=cats, weekdays=weekdays, fc=fc,
                                 anomalies_found=found, struct=struct),
    }


@router.get("/trends")
def analytics_trends(
    periods: int = Query(6, ge=2, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Totals for the last N salary periods, oldest first."""
    today = av2.local_day(datetime.utcnow())
    salary_day = SettingsService.get_salary_day(db)
    ranges = []
    start, end = get_financial_period(today, salary_day)
    for _ in range(periods):
        ranges.append((start, end))
        start, end = get_financial_period(start - timedelta(days=1), salary_day)
    ranges.reverse()

    txs = _txs_between(db, ranges[0][0], ranges[-1][1])
    out = []
    for p_start, p_end in ranges:
        t = av2.totals([tx for tx in txs if p_start <= tx.day <= p_end])
        out.append({"start": p_start.isoformat(), "end": p_end.isoformat(),
                    "is_current": p_start <= today <= p_end, **t.as_dict()})
    return out


@router.get("/recurring")
def analytics_recurring(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = av2.local_day(datetime.utcnow())
    return av2.recurring(_txs_between(db, today - timedelta(days=HISTORY_DAYS), today), today)
