from datetime import date

from app.core.config import Base, engine


def init_db():
    Base.metadata.create_all(bind=engine)


def get_financial_period(
    ref_date: date = None, salary_day: int = None
) -> tuple[date, date]:
    from datetime import timedelta

    if ref_date is None:
        ref_date = date.today()

    if salary_day is None:
        salary_day = 10

    if ref_date.day >= salary_day:
        start = ref_date.replace(day=salary_day)
        if ref_date.month == 12:
            end = date(ref_date.year + 1, 1, salary_day - 1)
        else:
            end = date(ref_date.year, ref_date.month + 1, salary_day - 1)
    else:
        if ref_date.month == 1:
            start = date(ref_date.year - 1, 12, salary_day)
        else:
            start = date(ref_date.year, ref_date.month - 1, salary_day)
        end = ref_date.replace(day=salary_day - 1)

    return start, end
