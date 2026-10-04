from datetime import date, timedelta

import pytest

from app.finance.services.database import get_financial_period


@pytest.mark.parametrize(
    "ref, salary_day, expected",
    [
        # salary_day = 1 used to build date(..., day=0) and crash.
        (date(2026, 10, 4), 1, (date(2026, 10, 1), date(2026, 10, 31))),
        (date(2026, 10, 1), 1, (date(2026, 10, 1), date(2026, 10, 31))),
        (date(2026, 10, 4), 10, (date(2026, 9, 10), date(2026, 10, 9))),
        (date(2026, 10, 10), 10, (date(2026, 10, 10), date(2026, 11, 9))),
        (date(2026, 12, 15), 10, (date(2026, 12, 10), date(2027, 1, 9))),
        (date(2026, 1, 5), 10, (date(2025, 12, 10), date(2026, 1, 9))),
        # Days missing in short months clamp to the month's last day.
        (date(2026, 2, 28), 31, (date(2026, 2, 28), date(2026, 3, 30))),
        (date(2026, 2, 10), 31, (date(2026, 1, 31), date(2026, 2, 27))),
        (date(2026, 3, 31), 30, (date(2026, 3, 30), date(2026, 4, 29))),
    ],
)
def test_financial_period(ref, salary_day, expected):
    assert get_financial_period(ref, salary_day) == expected


def _next(d: date) -> date:
    return d + timedelta(days=1)


def test_periods_are_contiguous_for_every_salary_day():
    for salary_day in range(1, 32):
        _, end = get_financial_period(date(2026, 1, 15), salary_day)
        for _ in range(14):
            next_start, next_end = get_financial_period(_next(end), salary_day)
            assert next_start == _next(end)
            assert next_end > next_start
            end = next_end


def test_dashboard_returns_period(client, db):
    res = client.get("/budgets/current")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["period_start"] <= date.today().isoformat() <= body["period_end"]
