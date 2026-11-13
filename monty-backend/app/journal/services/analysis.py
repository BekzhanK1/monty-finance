"""One LLM call per entry: summary, tags, emotions and (in AI mood mode) the mood.

Runs after the response is sent (BackgroundTasks), so saving never waits for OpenAI.
A failed call leaves mood untouched (null stays null) and marks the entry FAILED.
"""

import json
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.config import SessionLocal
from app.finance.services.expense_parser import get_openai_client
from app.journal.crypto import decrypt_text, encrypt_json
from app.journal.models import AnalysisStatus, JournalEntry, MoodSource

log = logging.getLogger(__name__)

MODEL = "gpt-4o-mini"
MAX_CHARS = 6000  # long entries are cut; the start carries enough signal for tags/mood

SYSTEM_PROMPT = """Ты анализируешь личную дневниковую запись. Текст может быть на русском, казахском или английском.
Верни ТОЛЬКО JSON:
{
  "summary": "одно короткое предложение на русском — о чём запись",
  "tags": ["до 5 тем, существительные в нижнем регистре на русском: работа, учёба, отношения, здоровье, деньги, семья, друзья, спорт, отдых, сон…"],
  "emotions": ["до 3 эмоций в нижнем регистре на русском: радость, спокойствие, усталость, тревога, грусть, злость, благодарность, вдохновение…"]%s
}
Не придумывай того, чего нет в тексте. Пустой или бессмысленный текст → пустые списки."""

MOOD_FIELD = """,
  "mood": целое 1..5 — настроение автора: 1 очень плохо, 2 плохо, 3 нормально, 4 хорошо, 5 отлично.
          Оценивай состояние автора, а не тон событий; сухой текст без эмоций → 3"""


def _clean_list(value, limit: int) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        if isinstance(item, str) and (word := item.strip().lower()[:40]) and word not in out:
            out.append(word)
    return out[:limit]


def _parse(raw: str, want_mood: bool) -> tuple[dict, int | None]:
    data = json.loads(raw)
    analysis = {
        "summary": str(data.get("summary") or "").strip()[:300] or None,
        "tags": _clean_list(data.get("tags"), 5),
        "emotions": _clean_list(data.get("emotions"), 3),
    }
    mood = data.get("mood") if want_mood else None
    if isinstance(mood, (int, float)) and not isinstance(mood, bool):
        mood = min(5, max(1, round(mood)))
    else:
        mood = None
    return analysis, mood


def analyze_text(text: str, *, want_mood: bool) -> tuple[dict, int | None]:
    response = get_openai_client().chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT % (MOOD_FIELD if want_mood else "")},
            {"role": "user", "content": text[:MAX_CHARS]},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=300,
    )
    return _parse(response.choices[0].message.content or "{}", want_mood)


def analyze_entry(db: Session, entry_id: str) -> None:
    entry = db.get(JournalEntry, entry_id)
    if entry is None:
        return
    text = decrypt_text(entry.content_enc)
    if not text or not text.strip():
        entry.analysis_status = AnalysisStatus.SKIPPED
        db.commit()
        return
    # The user's own pick always wins; AI only fills a mood nobody chose.
    want_mood = entry.mood_source != MoodSource.USER
    try:
        analysis, mood = analyze_text(text, want_mood=want_mood)
    except Exception as exc:  # network, quota, bad JSON — the entry itself is safe
        log.warning("journal analysis failed for %s: %s", entry_id, exc)
        entry.analysis_status = AnalysisStatus.FAILED
        db.commit()
        return
    db.refresh(entry)  # the user may have edited the mood while we waited
    entry.analysis_enc = encrypt_json(analysis)
    if mood is not None and entry.mood_source != MoodSource.USER:
        entry.mood = mood
        entry.mood_source = MoodSource.AI
    entry.analysis_status = AnalysisStatus.DONE
    entry.updated_at = datetime.utcnow()
    db.commit()


def analyze_entry_in_background(entry_id: str) -> None:
    """BackgroundTasks entrypoint: own session, never raises."""
    db = SessionLocal()
    try:
        analyze_entry(db, entry_id)
    except Exception as exc:
        log.exception("journal background analysis crashed for %s: %s", entry_id, exc)
    finally:
        db.close()
