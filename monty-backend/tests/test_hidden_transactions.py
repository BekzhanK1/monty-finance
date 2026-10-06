from datetime import date, datetime, timedelta

import pytest

from app.finance.models import INCLUDE_HIDDEN, Category, MonthlyBudget, Settings, Transaction, User
from app.finance.services import digest_service
from app.finance.services.analytics_service import local_day

HIDDEN_AMOUNT = 77_777


@pytest.fixture
def as_user(db):
    """Switch the authenticated user: as_user(2) makes the partner the caller."""
    from app.main import app
    from app.middleware.auth import get_current_user

    def _switch(user_id: int):
        app.dependency_overrides[get_current_user] = lambda: db.get(User, user_id)

    return _switch


@pytest.fixture
def notifications(monkeypatch):
    sent = []
    monkeypatch.setattr("app.finance.routers.transactions.send_transaction_notification", lambda **kw: sent.append(kw))
    return sent


@pytest.fixture
def hidden(client, db):
    """Today: one visible 1 000 grocery expense and one hidden gift, both by user 1."""
    db.add(Settings(key="salary_day", value="1"))
    db.add(MonthlyBudget(category_id=1, period=date(2026, 1, 1), limit_amount=100_000))
    db.add(Transaction(user_id=1, category_id=1, amount=1_000, transaction_date=datetime.utcnow()))
    db.commit()
    res = client.post("/transactions/hidden", json={"category_id": 1, "amount": HIDDEN_AMOUNT, "comment": "подарок"})
    assert res.status_code == 201, res.text
    return res.json()


def test_create_hidden_sends_no_notification(client, notifications):
    res = client.post("/transactions/hidden", json={"category_id": 1, "amount": 500, "comment": "сюрприз"})
    assert res.status_code == 201
    assert notifications == []


@pytest.mark.parametrize("user_id", [1, 2])
def test_hidden_expense_is_absent_everywhere(client, as_user, hidden, user_id):
    as_user(user_id)
    assert [t["amount"] for t in client.get("/transactions").json()] == [1_000]
    assert client.get("/transactions", params={"search": "подарок"}).json() == []
    assert "подарок" not in client.get("/transactions/export/csv").text

    groceries = next(b for b in client.get("/budgets/current").json()["budgets"] if b["category_id"] == 1)
    assert groceries["spent"] == 1_000

    assert client.get("/analytics/overview").json()["totals"]["expense"] == 1_000
    assert client.get("/analytics").json()["total_expenses"] == 1_000
    assert client.get("/analytics/period").json()["total_expenses"] == 1_000
    assert str(HIDDEN_AMOUNT) not in client.get("/analytics/trends").text
    assert str(HIDDEN_AMOUNT) not in client.get("/analytics/recurring").text


def test_hidden_expense_is_absent_from_digest(db, hidden):
    assert digest_service.get_today_total(db) == 1_000
    assert [t["amount"] if isinstance(t, dict) else t.amount for t in digest_service.get_today_transactions_detail(db)] == [1_000]
    assert str(HIDDEN_AMOUNT) not in digest_service.get_today_transactions_summary(db).replace(",", "").replace(" ", "")


def test_regular_endpoints_cannot_touch_hidden(client, hidden):
    tid = hidden["id"]
    assert client.patch(f"/transactions/{tid}", json={"amount": 1}).status_code == 404
    assert client.delete(f"/transactions/{tid}").status_code == 404


def test_author_lists_edits_and_deletes_own_hidden(client, db, hidden):
    tid = hidden["id"]
    assert [t["id"] for t in client.get("/transactions/hidden").json()] == [tid]

    res = client.patch(f"/transactions/hidden/{tid}", json={"amount": 80_000, "category_id": 2})
    assert res.status_code == 200 and res.json()["amount"] == 80_000 and res.json()["category_id"] == 2

    assert client.delete(f"/transactions/hidden/{tid}").status_code == 204
    assert client.get("/transactions/hidden").json() == []
    assert db.query(Transaction).execution_options(**{INCLUDE_HIDDEN: True}).filter_by(id=tid).first() is None


def test_partner_cannot_see_or_touch_authors_hidden(client, as_user, hidden):
    as_user(2)
    tid = hidden["id"]
    assert client.get("/transactions/hidden").json() == []
    assert client.patch(f"/transactions/hidden/{tid}", json={"amount": 1}).status_code == 404
    assert client.post(f"/transactions/hidden/{tid}/reveal").status_code == 404
    assert client.delete(f"/transactions/hidden/{tid}").status_code == 404


def test_reveal_makes_it_ordinary_on_purchase_date(client, as_user, db, notifications):
    past = local_day(datetime.utcnow()) - timedelta(days=40)
    created = client.post("/transactions/hidden", json={
        "category_id": 1, "amount": HIDDEN_AMOUNT, "transaction_date": past.isoformat(),
    }).json()

    revealed = client.post(f"/transactions/hidden/{created['id']}/reveal")
    assert revealed.status_code == 200
    assert notifications == []
    assert client.get("/transactions/hidden").json() == []

    as_user(2)
    [tx] = client.get("/transactions").json()
    assert tx["id"] == created["id"] and tx["transaction_date"] == created["transaction_date"]
    assert local_day(datetime.fromisoformat(tx["transaction_date"])) == past
    assert client.post(f"/transactions/hidden/{created['id']}/reveal").status_code == 404


def test_hidden_create_requires_known_category(client):
    assert client.post("/transactions/hidden", json={"category_id": 999, "amount": 1}).status_code == 404


def test_deleting_category_removes_its_hidden_expenses(client, db, hidden):
    db.add(Category(id=9, name="Подарки", group="COMFORT", type="EXPENSE", icon="🎁"))
    db.commit()
    tid = client.post("/transactions/hidden", json={"category_id": 9, "amount": 5}).json()["id"]
    assert client.delete("/categories/9").status_code == 204
    assert db.query(Transaction).execution_options(**{INCLUDE_HIDDEN: True}).filter_by(id=tid).first() is None
