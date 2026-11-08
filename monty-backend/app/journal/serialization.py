from datetime import datetime, timedelta

from app.journal.crypto import decrypt_json, decrypt_text
from app.journal.models import AnalysisStatus, JournalEntry
from app.journal.schemas import JournalEntryResponse, StreakResponse
from app.journal.services.streaks import Streak


# BackgroundTasks are not durable: a restart mid-analysis would leave "pending" forever
# (and the client polling). Past this age a pending entry is reported as failed → retry button.
STALE_PENDING = timedelta(minutes=5)


def _status(entry: JournalEntry) -> str:
    if entry.analysis_status == AnalysisStatus.PENDING and datetime.utcnow() - entry.updated_at > STALE_PENDING:
        return AnalysisStatus.FAILED
    return entry.analysis_status


def entry_to_response(entry: JournalEntry) -> JournalEntryResponse:
    analysis = decrypt_json(entry.analysis_enc) or {}
    return JournalEntryResponse(
        id=entry.id,
        entry_date=entry.entry_date,
        mood=entry.mood,
        mood_source=entry.mood_source,
        content=decrypt_text(entry.content_enc),
        summary=analysis.get("summary"),
        tags=analysis.get("tags", []),
        emotions=analysis.get("emotions", []),
        analysis_status=_status(entry),
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


def streak_to_response(streak: Streak) -> StreakResponse:
    return StreakResponse(
        current=streak.current, best=streak.best, today_done=streak.today_done, frozen_days=list(streak.frozen_days)
    )
