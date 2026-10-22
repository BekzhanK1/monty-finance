"""Budget snapshot for one local day: what is left, what today may still spend, how the pace looks.

Shared by the dashboard and the Telegram summaries so every surface shows the same numbers.
"""

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta

import pytz
from sqlalchemy.orm import Session

from app.finance.schemas import BudgetWithSpent
from app.finance.services.budget_period_service import build_budgets_with_spent, date_range_to_datetimes, spent_by_category_between
from app.finance.services.database import get_financial_period
from app.finance.services.expense_parser import APP_TIMEZONE, local_today
from app.finance.services.settings_service import SettingsService

SPENDING_GROUPS = ("BASE", "COMFORT")
# ±5 percentage points of the elapsed time counts as "on pace" (same rule as the dashboard).
PACE_TOLERANCE = 5


def local_day_window(day: date) -> tuple[datetime, datetime]:
    """Naive-UTC [start, end] of a local (Almaty) calendar day, matching how transactions are stored."""
    start = APP_TIMEZONE.localize(datetime.combine(day, time.min)).astimezone(pytz.utc).replace(tzinfo=None)
    end = APP_TIMEZONE.localize(datetime.combine(day + timedelta(days=1), time.min)).astimezone(pytz.utc).replace(tzinfo=None)
    return start, end - timedelta(microseconds=1)


def spent_on_day(db: Session, budgets: list[BudgetWithSpent], day: date) -> int:
    """Spending on a local day in the budgeted BASE/COMFORT categories (what the daily limit covers)."""
    ids = {b.category_id for b in budgets if b.group in SPENDING_GROUPS}
    by_category = spent_by_category_between(db, *local_day_window(day))
    return sum(amount for category_id, amount in by_category.items() if category_id in ids)


def daily_allowance(remaining: int, spent_today: int, days_left: int) -> tuple[int, int]:
    """(limit for today, what is still left today).

    The limit is fixed at the start of the day — remaining budget before today's spending split over the
    days left — so every tenge spent today comes straight off "left today" instead of being spread over
    the rest of the period. "Left today" goes negative once today's limit is exceeded.
    """
    limit = max(0, (remaining + spent_today) // max(1, days_left))
    return limit, limit - spent_today


@dataclass
class DayBudget:
    day: date
    period_start: date
    period_end: date
    budgets: list[BudgetWithSpent]
    limit: int
    spent: int
    spent_today: int
    spent_yesterday: int
    savings: int

    remaining: int = field(init=False)
    total_days: int = field(init=False)
    days_left: int = field(init=False)
    daily_limit: int = field(init=False)
    left_today: int = field(init=False)

    def __post_init__(self):
        self.remaining = self.limit - self.spent
        self.total_days = (self.period_end - self.period_start).days + 1
        self.days_left = max(1, (self.period_end - self.day).days + 1)
        self.daily_limit, self.left_today = daily_allowance(self.remaining, self.spent_today, self.days_left)

    @property
    def has_budget(self) -> bool:
        return self.limit > 0

    @property
    def elapsed_days(self) -> int:
        return min(self.total_days, max(1, self.total_days - self.days_left + 1))

    @property
    def time_percent(self) -> float:
        return self.elapsed_days / self.total_days * 100

    @property
    def spent_percent(self) -> float:
        return self.spent / self.limit * 100 if self.limit else 0

    @property
    def pace(self) -> str:
        if not self.limit:
            return "on"
        if self.spent_percent > self.time_percent + PACE_TOLERANCE:
            return "over"
        if self.spent_percent < self.time_percent - PACE_TOLERANCE:
            return "under"
        return "on"

    @property
    def planned_spent(self) -> int:
        """What the plan allows to have spent by the end of today."""
        return round(self.limit * self.elapsed_days / self.total_days)

    @property
    def forecast(self) -> int:
        return round(self.spent / self.elapsed_days * self.total_days)

    @property
    def yesterday_in_period(self) -> bool:
        return self.day > self.period_start

    @property
    def yesterday_limit(self) -> int:
        """Yesterday's daily limit, rebuilt from the budget left before yesterday's and today's spending."""
        before = self.remaining + self.spent_today + self.spent_yesterday
        return max(0, before // (self.days_left + 1))

    @property
    def tomorrow_limit(self) -> int | None:
        """Tomorrow's daily limit if nothing more is spent today; None when tomorrow starts a new period."""
        if self.days_left <= 1:
            return None
        return max(0, self.remaining // (self.days_left - 1))

    def group_totals(self, group: str) -> tuple[int, int]:
        items = [b for b in self.budgets if b.group == group]
        return sum(b.limit_amount for b in items), sum(b.spent for b in items)


def compute_day_budget(db: Session, day: date | None = None) -> DayBudget:
    day = day or local_today()
    period_start, period_end = get_financial_period(day, SettingsService.get_salary_day(db))
    budgets = build_budgets_with_spent(db, *date_range_to_datetimes(period_start, period_end))
    spending = [b for b in budgets if b.group in SPENDING_GROUPS]
    yesterday = day - timedelta(days=1)
    return DayBudget(
        day=day,
        period_start=period_start,
        period_end=period_end,
        budgets=budgets,
        limit=sum(b.limit_amount for b in spending),
        spent=sum(b.spent for b in spending),
        spent_today=spent_on_day(db, budgets, day),
        spent_yesterday=spent_on_day(db, budgets, yesterday) if yesterday >= period_start else 0,
        savings=sum(b.spent for b in budgets if b.group == "SAVINGS"),
    )
