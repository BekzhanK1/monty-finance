from datetime import date, datetime, timedelta

import pytest

from app.finance.models import Transaction, User
from app.journal.models import AnalysisStatus, JournalEntry
from tests.conftest import FakeOpenAI

TODAY = date(2026, 11, 5)  # Thursday


@pytest.fixture(autouse=True)
def fixed_today(monkeypatch):
    for target in (
        "app.journal.routers.entries.local_today",
        "app.journal.routers.overview.local_today",
        "app.journal.services.reminders.local_today",
    ):
        monkeypatch.setattr(target, lambda: TODAY)


@pytest.fixture
def ai(monkeypatch):
    fake = FakeOpenAI(payload={"summary": "Тяжёлый день на работе", "tags": ["Работа", "сон", "работа"], "emotions": ["усталость"], "mood": 2})
    monkeypatch.setattr("app.journal.services.analysis.get_openai_client", lambda: fake)
    return fake


def as_user(user_id: int, db):
    from app.main import app
    from app.middleware.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: db.get(User, user_id)


def add_entry(db, user_id: int, day: date, mood: int | None = 3):
    db.add(JournalEntry(user_id=user_id, entry_date=day, mood=mood, mood_source="user" if mood else None))
    db.commit()


# --- creating entries / mood modes -------------------------------------------------

def test_manual_mode_requires_mood(client):
    r = client.post("/journal/entries", json={"content": "Привет"})
    assert r.status_code == 400


def test_entry_needs_text_or_mood(client):
    assert client.post("/journal/entries", json={"content": "   "}).status_code == 400


def test_mood_only_checkin_counts_for_streak(client):
    r = client.post("/journal/entries", json={"mood": 4})
    assert r.status_code == 201
    assert r.json()["analysis_status"] == AnalysisStatus.SKIPPED
    me = client.get("/journal/overview").json()["me"]
    assert me == {"current": 1, "best": 1, "today_done": True, "frozen_days": []}


def test_manual_mode_ai_adds_tags_but_never_touches_mood(client, db, ai):
    r = client.post("/journal/entries", json={"content": "Устал, но доделал проект", "mood": 4})
    entry_id = r.json()["id"]
    body = client.get(f"/journal/entries/{entry_id}").json()
    assert body["mood"] == 4 and body["mood_source"] == "user"
    assert body["tags"] == ["работа", "сон"]  # lower-cased, de-duplicated
    assert body["summary"] == "Тяжёлый день на работе"
    assert body["analysis_status"] == AnalysisStatus.DONE
    assert "mood" not in ai.chat_prompts[0]  # the user message is just the text


def test_ai_mode_sets_mood_from_text(client, ai):
    client.put("/journal/settings", json={"mood_mode": "ai"})
    entry_id = client.post("/journal/entries", json={"content": "Не выспался"}).json()["id"]
    body = client.get(f"/journal/entries/{entry_id}").json()
    assert body["mood"] == 2 and body["mood_source"] == "ai"


def test_ai_mode_user_pick_wins(client, ai):
    client.put("/journal/settings", json={"mood_mode": "ai"})
    entry_id = client.post("/journal/entries", json={"content": "Нормально", "mood": 5}).json()["id"]
    body = client.get(f"/journal/entries/{entry_id}").json()
    assert body["mood"] == 5 and body["mood_source"] == "user"


def test_editing_ai_mood_makes_it_the_users(client, ai):
    client.put("/journal/settings", json={"mood_mode": "ai"})
    entry_id = client.post("/journal/entries", json={"content": "Не выспался"}).json()["id"]
    body = client.patch(f"/journal/entries/{entry_id}", json={"mood": 3}).json()
    assert body["mood"] == 3 and body["mood_source"] == "user"


def test_failed_ai_keeps_mood_null(client, monkeypatch):
    def boom():
        raise RuntimeError("quota")

    monkeypatch.setattr("app.journal.services.analysis.get_openai_client", boom)
    client.put("/journal/settings", json={"mood_mode": "ai"})
    entry_id = client.post("/journal/entries", json={"content": "Текст"}).json()["id"]
    body = client.get(f"/journal/entries/{entry_id}").json()
    assert body["mood"] is None  # never a fake neutral
    assert body["analysis_status"] == AnalysisStatus.FAILED
    assert body["content"] == "Текст"


def test_text_is_encrypted_at_rest(client, db, ai):
    entry_id = client.post("/journal/entries", json={"content": "Секретная мысль", "mood": 3}).json()["id"]
    db.expire_all()
    row = db.get(JournalEntry, entry_id)
    assert "Секретная" not in row.content_enc
    assert "работа" not in (row.analysis_enc or "")


# --- privacy between partners ------------------------------------------------------

def test_partner_sees_streak_and_mood_but_no_text(client, db, ai):
    client.post("/journal/entries", json={"content": "Личное", "mood": 4})
    as_user(2, db)
    overview = client.get("/journal/overview").json()
    assert overview["me"]["current"] == 0
    [partner] = overview["partners"]
    assert partner["first_name"] == "Аня"
    assert partner["streak"]["today_done"] is True
    assert partner["last_mood"] == 4
    assert set(partner) == {"user_id", "first_name", "streak", "last_mood", "last_entry_date"}
    assert "Личное" not in str(overview)


def test_partner_cannot_read_edit_or_delete_my_entries(client, db, ai):
    entry_id = client.post("/journal/entries", json={"content": "Личное", "mood": 4}).json()["id"]
    as_user(2, db)
    assert client.get(f"/journal/entries/{entry_id}").status_code == 404
    assert client.patch(f"/journal/entries/{entry_id}", json={"mood": 1}).status_code == 404
    assert client.delete(f"/journal/entries/{entry_id}").status_code == 404
    assert client.get("/journal/entries").json()["total"] == 0
    assert client.get("/journal/analytics").json()["entries_count"] == 0


# --- list / delete ----------------------------------------------------------------

def test_list_newest_first_and_delete(client, db):
    add_entry(db, 1, TODAY - timedelta(days=1), 2)
    add_entry(db, 1, TODAY, 5)
    entries = client.get("/journal/entries").json()["entries"]
    assert [e["mood"] for e in entries] == [5, 2]
    assert client.delete(f"/journal/entries/{entries[0]['id']}").status_code == 204
    assert client.get("/journal/entries").json()["total"] == 1


# --- analytics --------------------------------------------------------------------

def test_analytics_series_weekday_and_spending(client, db):
    add_entry(db, 1, TODAY, 5)
    add_entry(db, 1, TODAY, 3)  # day average 4
    add_entry(db, 1, TODAY - timedelta(days=1), 1)
    # 12:00 Almaty = 07:00 UTC (stored naive UTC)
    db.add(Transaction(user_id=2, category_id=1, amount=10_000, transaction_date=datetime(2026, 11, 4, 7)))
    db.add(Transaction(user_id=1, category_id=1, amount=2_000, transaction_date=datetime(2026, 11, 5, 7)))
    db.add(Transaction(user_id=1, category_id=3, amount=99_000, transaction_date=datetime(2026, 11, 5, 7)))  # income
    db.commit()

    data = client.get("/journal/analytics?days=7").json()
    assert data["entries_count"] == 3 and data["days_written"] == 2
    assert data["series"][-1] == {"date": "2026-11-05", "mood": 4.0, "entries": 2}
    assert data["weekday"][3]["mood"] == 4.0  # Thursday
    assert data["spending"]["low_mood"] == {"days": 1, "avg_spent": 10_000}
    assert data["spending"]["high_mood"] == {"days": 1, "avg_spent": 2_000}


# --- settings & reminders ---------------------------------------------------------

def test_settings_defaults_and_validation(client):
    assert client.get("/journal/settings").json() == {"mood_mode": "manual", "reminder_enabled": True, "reminder_time": "21:30"}
    assert client.put("/journal/settings", json={"reminder_time": "25:00"}).status_code == 422
    assert client.put("/journal/settings", json={"mood_mode": "magic"}).status_code == 422
    r = client.put("/journal/settings", json={"reminder_time": "22:15", "reminder_enabled": False})
    assert r.json()["reminder_time"] == "22:15" and r.json()["reminder_enabled"] is False


def test_settings_register_and_remove_scheduler_job(client):
    from app.finance.services.scheduler import scheduler

    client.put("/journal/settings", json={"reminder_enabled": True, "reminder_time": "20:05"})
    job = scheduler.get_job("journal_reminder_1")
    assert job is not None and "20" in str(job.trigger)
    client.put("/journal/settings", json={"reminder_enabled": False})
    assert scheduler.get_job("journal_reminder_1") is None


def test_reminder_text_skips_when_written_and_mentions_partner(db):
    from app.journal.services.reminders import build_reminder_text

    add_entry(db, 2, TODAY)
    add_entry(db, 1, TODAY - timedelta(days=1))
    text = build_reminder_text(db, db.get(User, 1))
    assert "Серия: 1" in text and "Боря" in text
    add_entry(db, 1, TODAY)
    assert build_reminder_text(db, db.get(User, 1)) is None


def test_journal_refuses_without_key_in_prod(client, monkeypatch):
    from app.core.config import settings
    from app.journal import crypto

    monkeypatch.setattr(settings, "STAGE", "PROD")
    monkeypatch.setattr(settings, "JOURNAL_ENCRYPTION_KEY", "")
    crypto._fernet.cache_clear()
    try:
        assert client.get("/journal/overview").status_code == 503
        assert client.get("/health").status_code == 200  # the rest of Monty keeps working
    finally:
        monkeypatch.undo()
        crypto._fernet.cache_clear()


def test_stale_pending_analysis_is_reported_as_failed(client, db):
    db.add(JournalEntry(id="stale", user_id=1, entry_date=TODAY, mood=3, mood_source="user",
                        analysis_status=AnalysisStatus.PENDING, updated_at=datetime.utcnow() - timedelta(minutes=10)))
    db.commit()
    assert client.get("/journal/entries/stale").json()["analysis_status"] == AnalysisStatus.FAILED
