from datetime import date, datetime, timedelta

import pytest

from app.finance.models import Category, CategoryGroup, MonthlyBudget, Settings, Transaction, TransactionType
from app.finance.services import digest_service, scheduler
from app.finance.services.daily_budget import DayBudget, compute_day_budget, daily_allowance, local_day_window
from app.finance.services.expense_parser import local_today
from app.finance.services.summary_messages import build_evening_message, build_morning_message, days_word
from app.finance.schemas import BudgetWithSpent


def _budget(category_id: int, group: str, limit: int, spent: int, name: str = "Продукты") -> BudgetWithSpent:
    return BudgetWithSpent(
        category_id=category_id, category_name=name, category_icon="🛒", group=group,
        limit_amount=limit, spent=spent, remaining=limit - spent,
    )


def _day_budget(*, limit=300_000, spent=150_000, spent_today=0, spent_yesterday=0,
                day=date(2026, 10, 25), start=date(2026, 10, 10), end=date(2026, 11, 9), budgets=None) -> DayBudget:
    return DayBudget(
        day=day, period_start=start, period_end=end,
        budgets=budgets if budgets is not None else [_budget(1, "BASE", limit, spent)],
        limit=limit, spent=spent, spent_today=spent_today, spent_yesterday=spent_yesterday, savings=0,
    )


# --- daily limit -------------------------------------------------------------------------------

def test_spending_today_comes_off_today_in_full():
    # 10 days left, 120 000 left before today → 12 000 a day.
    assert daily_allowance(120_000, 0, 10) == (12_000, 12_000)
    # Spending 2 000 today must leave 10 000 for today, not 11 800.
    assert daily_allowance(118_000, 2_000, 10) == (12_000, 10_000)


def test_overspending_today_goes_negative_and_lowers_tomorrow():
    b = _day_budget(limit=310_000, spent=165_000, spent_today=15_000, day=date(2026, 10, 25))
    # 160 000 before today over 16 days left (25.10–09.11).
    assert b.days_left == 16
    assert b.daily_limit == 10_000
    assert b.left_today == -5_000
    assert b.tomorrow_limit == 145_000 // 15


def test_over_budget_period_has_zero_daily_limit():
    b = _day_budget(limit=100_000, spent=120_000)
    assert b.daily_limit == 0
    assert b.left_today == 0


def test_last_day_of_period_has_no_tomorrow_limit():
    b = _day_budget(day=date(2026, 11, 9))
    assert b.days_left == 1
    assert b.tomorrow_limit is None


def test_local_day_window_is_almaty_day():
    start, end = local_day_window(date(2026, 10, 22))
    # Almaty is UTC+5: the local day starts at 19:00 UTC the day before.
    assert start == datetime(2026, 10, 21, 19, 0)
    assert end == datetime(2026, 10, 22, 18, 59, 59, 999999)


@pytest.fixture
def budgeted(db):
    db.add(Category(id=4, name="Кафе", group=CategoryGroup.COMFORT, type=TransactionType.EXPENSE, icon="☕"))
    db.add(MonthlyBudget(category_id=1, period=date(2026, 1, 1), limit_amount=200_000))
    db.add(MonthlyBudget(category_id=4, period=date(2026, 1, 1), limit_amount=100_000))
    db.add(Settings(key="salary_day", value="1"))
    db.commit()
    return db


def _add_tx(db, amount, when: datetime, category_id=1, comment=None):
    db.add(Transaction(user_id=1, category_id=category_id, amount=amount, transaction_date=when, comment=comment))
    db.commit()


def test_spent_today_counts_early_morning_local_time(budgeted):
    today_start, _ = local_day_window(local_today())
    _add_tx(budgeted, 3_000, today_start + timedelta(hours=2))  # 02:00 local, still the previous UTC date
    _add_tx(budgeted, 1_000, today_start - timedelta(hours=1))  # yesterday 23:00 local
    b = compute_day_budget(budgeted)
    assert b.spent_today == 3_000
    assert b.limit == 300_000


def test_dashboard_returns_spent_today(client, budgeted):
    _add_tx(budgeted, 2_500, datetime.utcnow(), category_id=4)
    body = client.get("/budgets/current").json()
    assert body["spent_today"] == 2_500


# --- messages ----------------------------------------------------------------------------------

def test_morning_message_shows_today_limit_and_yesterday():
    b = _day_budget(limit=310_000, spent=150_000, spent_yesterday=8_000)
    text = build_morning_message(b)
    assert "Сегодня можно потратить: <b>10 000 ₸</b>" in text
    assert "Осталось в бюджете: 160 000 ₸ на 16 дней" in text
    assert "Вчера: 8 000 ₸ из 9 882 ₸ ✅" in text
    assert "💡" in text


def test_morning_message_flags_over_budget_category():
    budgets = [_budget(1, "BASE", 100_000, 50_000), _budget(4, "COMFORT", 20_000, 26_000, name="Кафе")]
    b = _day_budget(limit=120_000, spent=76_000, budgets=budgets)
    assert "Кафе" in build_morning_message(b)


def test_morning_message_without_budgets():
    assert "Лимиты бюджета не настроены" in build_morning_message(_day_budget(limit=0, spent=0, budgets=[]))


def test_evening_message_reports_savings_and_tomorrow():
    b = _day_budget(limit=310_000, spent=154_000, spent_today=4_000)
    transactions = [
        {"icon": "🛒", "name": "Продукты", "amount": 4_000, "type": "EXPENSE", "group": "BASE", "comment": "<магазин>"},
        {"icon": "💰", "name": "Зарплата", "amount": 50_000, "type": "INCOME", "group": "INCOME", "comment": None},
    ]
    text = build_evening_message(b, transactions)
    assert "Потрачено сегодня: <b>4 000 ₸</b> из 10 000 ₸" in text
    assert "Сэкономили 6 000 ₸" in text
    assert f"Лимит на завтра: <b>{156_000 // 15:,} ₸</b>".replace(",", " ") in text
    assert "&lt;магазин&gt;" in text
    assert "Доходы: 50 000 ₸" in text


def test_evening_message_overspent_day():
    text = build_evening_message(_day_budget(limit=310_000, spent=165_000, spent_today=15_000), [])
    assert "Перебор за день: 5 000 ₸" in text


@pytest.mark.parametrize("n, word", [(1, "день"), (2, "дня"), (5, "дней"), (11, "дней"), (21, "день"), (24, "дня")])
def test_days_word(n, word):
    assert days_word(n) == word


# --- settings API and scheduling ---------------------------------------------------------------

def test_notification_defaults(client):
    body = client.get("/settings/notifications").json()
    assert body == {
        "items": [
            {"id": "morning", "enabled": True, "time": "09:00"},
            {"id": "evening", "enabled": True, "time": "22:00"},
            {"id": "food", "enabled": True, "time": "20:00"},
        ],
        "evening_ai": False,
    }


def test_update_notifications_reschedules(client):
    payload = {
        "items": [
            {"id": "morning", "enabled": True, "time": "08:30"},
            {"id": "evening", "enabled": False, "time": "22:00"},
            {"id": "food", "enabled": True, "time": "20:00"},
        ],
        "evening_ai": True,
    }
    res = client.put("/settings/notifications", json=payload)
    assert res.status_code == 200, res.text
    assert res.json() == payload
    assert client.get("/settings/notifications").json() == payload

    morning = scheduler.scheduler.get_job("notify_morning")
    assert str(morning.trigger.fields[5]) == "8" and str(morning.trigger.fields[6]) == "30"
    assert scheduler.scheduler.get_job("notify_evening") is None


@pytest.mark.parametrize("item", [{"id": "morning", "enabled": True, "time": "25:00"},
                                  {"id": "nope", "enabled": True, "time": "09:00"}])
def test_update_notifications_rejects_bad_input(client, item):
    assert client.put("/settings/notifications", json={"items": [item], "evening_ai": False}).status_code == 422


def test_test_send_uses_template(client, budgeted, monkeypatch):
    sent = []
    monkeypatch.setattr(digest_service, "send_telegram_message", lambda text: sent.append(text) or True)
    assert client.post("/settings/notifications/morning/test").status_code == 200
    assert client.post("/settings/notifications/evening/test").status_code == 200
    assert "Доброе утро" in sent[0]
    assert "Итоги дня" in sent[1]
    assert client.post("/settings/notifications/nope/test").status_code == 404


def test_evening_ai_comment_only_when_enabled(db, monkeypatch):
    _add_tx(db, 1_000, datetime.utcnow())
    monkeypatch.setattr(digest_service, "generate_ai_summary", lambda *a: "AI-комментарий")
    assert "AI-комментарий" not in digest_service.build_evening_summary(db)
    db.add(Settings(key="notify_evening_ai", value="1"))
    db.commit()
    assert "AI-комментарий" in digest_service.build_evening_summary(db)
