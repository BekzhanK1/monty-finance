from datetime import datetime

from app.finance.models import Transaction


def test_voice_parse_text_returns_drafts_without_saving(client, db, fake_openai):
    fake_openai.payload = {
        "transactions": [
            {"amount": 500, "category_id": 2, "comment": "такси", "date": None},
            {"amount": 450000, "category_id": 3, "comment": "зарплата", "date": None},
        ]
    }
    res = client.post("/voice/parse", data={"text": "500 такси и зарплата 450 тысяч"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["text"] == "500 такси и зарплата 450 тысяч"
    assert [(d["amount"], d["category_name"], d["type"]) for d in body["drafts"]] == [
        (500, "Транспорт", "EXPENSE"),
        (450000, "Зарплата", "INCOME"),
    ]
    # Income categories are offered to the model for in-app voice.
    assert "Зарплата" in fake_openai.chat_prompts[0]
    assert db.query(Transaction).count() == 0


def test_voice_parse_audio_is_transcribed_first(client, fake_openai):
    fake_openai.transcript = "вчера три тыщи продукты"
    fake_openai.payload = {"transactions": [{"amount": 3000, "category_id": 1, "comment": "продукты"}]}
    res = client.post("/voice/parse", files={"audio": ("voice.webm", b"\x1a\x45\xdf\xa3fake", "audio/webm")})
    assert res.status_code == 200, res.text
    assert res.json()["text"] == "вчера три тыщи продукты"
    assert fake_openai.transcribed[0][0] == "voice.webm"


def test_voice_parse_requires_input(client, fake_openai):
    res = client.post("/voice/parse", data={"text": "   "})
    assert res.status_code == 422
    assert "500 бензин" in res.json()["detail"]


def test_voice_parse_reports_parser_message(client, fake_openai):
    fake_openai.payload = {"error": "amount"}
    res = client.post("/voice/parse", data={"text": "что-то непонятное"})
    assert res.status_code == 422
    assert res.json()["detail"].startswith("Не понял сумму")


def test_voice_parse_empty_transcript(client, fake_openai):
    fake_openai.transcript = ""
    res = client.post("/voice/parse", files={"audio": ("voice.webm", b"abc", "audio/webm")})
    assert res.status_code == 422
    assert "Не удалось распознать" in res.json()["detail"]


def test_bulk_create_saves_source_raw_text_and_date(client, db):
    res = client.post(
        "/transactions/bulk",
        json={
            "items": [
                {"category_id": 1, "amount": 3000, "comment": "продукты", "transaction_date": "2026-10-01",
                 "source": "voice", "raw_text": "первого три тыщи продукты"},
                {"category_id": 2, "amount": 500, "comment": "такси", "source": "voice"},
            ]
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert [t["source"] for t in body] == ["voice", "voice"]
    assert body[0]["raw_text"] == "первого три тыщи продукты"
    saved = {t.amount: t for t in db.query(Transaction).all()}
    assert saved[3000].transaction_date == datetime(2026, 10, 1, 7, 0)
    assert saved[500].source == "voice"


def test_bulk_create_is_atomic_on_unknown_category(client, db):
    res = client.post(
        "/transactions/bulk",
        json={"items": [{"category_id": 1, "amount": 100}, {"category_id": 999, "amount": 200}]},
    )
    assert res.status_code == 404
    assert db.query(Transaction).count() == 0


def test_bulk_rejects_server_only_sources(client):
    res = client.post("/transactions/bulk", json={"items": [{"category_id": 1, "amount": 100, "source": "siri"}]})
    assert res.status_code == 422


def test_single_create_defaults_to_manual(client):
    res = client.post("/transactions", json={"category_id": 1, "amount": 100})
    assert res.status_code == 201
    assert res.json()["source"] == "manual"


def test_siri_saves_source_and_raw_text(client, db, fake_openai, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "SIRI_BASIC_AUTH_USERNAME", "siri")
    monkeypatch.setattr(settings, "SIRI_BASIC_AUTH_PASSWORD", "secret")
    fake_openai.payload = {"transactions": [{"amount": 700, "category_id": 2, "comment": "такси"}]}
    res = client.post("/integrations/siri/expense", json={"user_id": 1, "raw_text": "700 такси"}, auth=("siri", "secret"))
    assert res.status_code == 200, res.text
    t = db.query(Transaction).one()
    assert (t.amount, t.source, t.raw_text) == (700, "siri", "700 такси")
    # Siri stays expense-only.
    assert "Зарплата" not in fake_openai.chat_prompts[0]
