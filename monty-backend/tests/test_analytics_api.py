from datetime import date, datetime, timedelta

from app.finance.models import MonthlyBudget, Settings, Transaction
from app.finance.services.analytics_service import local_day


def _add(db, cat, amount, day: date, comment=None):
    # Local noon (UTC+5) → 07:00 UTC, the same calendar day.
    db.add(Transaction(user_id=1, category_id=cat, amount=amount, comment=comment,
                       transaction_date=datetime.combine(day, datetime.min.time()).replace(hour=7)))


def test_overview_defaults_to_salary_period(client, db):
    db.add(Settings(key="salary_day", value="1"))
    db.add(MonthlyBudget(category_id=1, period=date(2026, 1, 1), limit_amount=100_000))
    today = local_day(datetime.utcnow())
    start = today.replace(day=1)
    _add(db, 1, 20_000, start)
    _add(db, 3, 300_000, start)  # income (Зарплата)
    _add(db, 1, 15_000, start - timedelta(days=3))  # previous period
    db.commit()

    body = client.get("/analytics/overview").json()
    assert body["period"]["start"] == start.isoformat() and body["period"]["is_current"] is True
    assert body["totals"]["expense"] == 20_000 and body["totals"]["income"] == 300_000
    assert body["previous"]["expense"] == 15_000
    assert body["budget_limit"] == 100_000
    assert body["forecast"]["spent"] == 20_000
    assert body["categories"][0]["name"] == "Зарплата"
    groceries = next(c for c in body["categories"] if c["category_id"] == 1)
    assert (groceries["previous_amount"], groceries["limit"]) == (15_000, 100_000)
    assert len(body["heatmap"]) == body["period"]["days_total"] == len(body["cumulative"])
    assert len(body["weekdays"]) == 7


def test_overview_custom_range_compares_with_previous_window(client, db):
    _add(db, 1, 1_000, date(2026, 9, 5))
    _add(db, 2, 2_000, date(2026, 8, 30))
    db.commit()
    body = client.get("/analytics/overview", params={"start_date": "2026-09-01", "end_date": "2026-09-07"}).json()
    assert body["previous"]["start"] == "2026-08-25" and body["previous"]["end"] == "2026-08-31"
    assert body["previous"]["expense"] == 2_000 and body["totals"]["expense"] == 1_000
    assert body["forecast"] is None


def test_trends_returns_oldest_first(client, db):
    db.add(Settings(key="salary_day", value="1"))
    today = local_day(datetime.utcnow())
    _add(db, 1, 5_000, today.replace(day=1))
    db.commit()
    body = client.get("/analytics/trends", params={"periods": 3}).json()
    assert len(body) == 3 and body[-1]["is_current"] and body[-1]["expense"] == 5_000
    assert body[0]["start"] < body[1]["start"] < body[2]["start"]


def test_recurring_endpoint(client, db):
    today = local_day(datetime.utcnow())
    for weeks in (1, 2, 3, 4):
        _add(db, 2, 3_000, today - timedelta(days=7 * weeks), comment="Йога")
    db.commit()
    [item] = client.get("/analytics/recurring").json()
    assert (item["label"], item["cadence"], item["amount"]) == ("Йога", "weekly", 3_000)
