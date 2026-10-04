from datetime import date, datetime

import pytest

from app.finance.models import Category, CategoryGroup, TransactionType
from app.finance.services import expense_parser
from app.finance.services.expense_parser import (
    AMOUNT_NOT_FOUND_MESSAGE,
    CATEGORY_NOT_FOUND_MESSAGE,
    ExpenseParseError,
    transaction_datetime,
    validate_llm_payload,
)
from app.finance.services.siri_logger import SiriLog

TODAY = date(2026, 10, 4)
FOOD = Category(id=1, name="Продукты", group=CategoryGroup.BASE, type=TransactionType.EXPENSE, icon="🛒")


def _validate(data):
    return validate_llm_payload(data, raw_text="сырой текст", categories_by_id={1: FOOD}, today=TODAY, log=SiriLog())


def test_valid_payload_with_relative_date():
    items = _validate({"transactions": [{"amount": "3000", "category_id": 1, "comment": "молоко", "date": "2026-10-03"}]})
    assert len(items) == 1
    assert items[0].amount == 3000
    assert items[0].category is FOOD
    assert items[0].comment == "молоко"
    assert items[0].local_date == date(2026, 10, 3)


@pytest.mark.parametrize("raw_date", [None, "2026-10-04", "2026-10-09", "2025-01-01", "не дата"])
def test_today_future_too_old_or_garbage_dates_mean_now(raw_date):
    items = _validate({"transactions": [{"amount": 500, "category_id": 1, "comment": "x", "date": raw_date}]})
    assert items[0].local_date is None


def test_missing_comment_falls_back_to_raw_text():
    items = _validate({"transactions": [{"amount": 500, "category_id": 1}]})
    assert items[0].comment == "сырой текст"


@pytest.mark.parametrize(
    "data, message",
    [
        ({"error": "amount"}, AMOUNT_NOT_FOUND_MESSAGE),
        ({"error": "category"}, CATEGORY_NOT_FOUND_MESSAGE),
        ({"transactions": []}, AMOUNT_NOT_FOUND_MESSAGE),
        ({"transactions": [{"amount": 0, "category_id": 1}]}, AMOUNT_NOT_FOUND_MESSAGE),
        ({"transactions": [{"amount": "много", "category_id": 1}]}, AMOUNT_NOT_FOUND_MESSAGE),
        ({"transactions": [{"amount": 100, "category_id": 99}]}, CATEGORY_NOT_FOUND_MESSAGE),
        ({"transactions": [{"amount": 100, "category_id": None}]}, CATEGORY_NOT_FOUND_MESSAGE),
    ],
)
def test_invalid_payloads(data, message):
    with pytest.raises(ExpenseParseError) as exc:
        _validate(data)
    assert exc.value.message == message


def test_past_local_date_is_pinned_to_local_noon_in_utc(monkeypatch):
    monkeypatch.setattr(expense_parser, "local_today", lambda: TODAY)
    # Asia/Almaty is UTC+5 → 12:00 local = 07:00 UTC.
    assert transaction_datetime(date(2026, 10, 2)) == datetime(2026, 10, 2, 7, 0)


def test_today_or_none_means_now(monkeypatch):
    monkeypatch.setattr(expense_parser, "local_today", lambda: TODAY)
    before = datetime.utcnow()
    assert transaction_datetime(None) >= before
    assert transaction_datetime(TODAY) >= before


def test_prompt_mentions_today_and_slang(db):
    prompt = expense_parser.build_prompt("косарь такси", db.query(Category).all(), TODAY, include_income=True)
    assert "2026-10-04, воскресенье" in prompt
    assert "«косарь» = 1000" in prompt
    assert '"INCOME"' in prompt
