import calendar
from datetime import date, timedelta

from app.core.config import Base, engine


def init_db():
    Base.metadata.create_all(bind=engine)


def _clamped_day(year: int, month: int, day: int) -> date:
    """`day` in the given month, clamped to its last day (salary on the 31st → Feb 28/29)."""
    return date(year, month, min(day, calendar.monthrange(year, month)[1]))


def _shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    index = year * 12 + (month - 1) + delta
    return index // 12, index % 12 + 1


def get_financial_period(
    ref_date: date = None, salary_day: int = None
) -> tuple[date, date]:
    """Inclusive [start, end] of the salary-to-salary period containing `ref_date`."""
    if ref_date is None:
        ref_date = date.today()

    if salary_day is None:
        salary_day = 10
    salary_day = max(1, min(31, salary_day))

    start = _clamped_day(ref_date.year, ref_date.month, salary_day)
    if ref_date < start:
        start = _clamped_day(*_shift_month(ref_date.year, ref_date.month, -1), salary_day)
    next_start = _clamped_day(*_shift_month(start.year, start.month, 1), salary_day)

    return start, next_start - timedelta(days=1)
