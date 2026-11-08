from datetime import date, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_db
from app.finance.models import User
from app.journal.crypto import encrypt_text
from app.journal.models import AnalysisStatus, JournalEntry, MoodMode, MoodSource
from app.journal.schemas import JournalEntryCreate, JournalEntryList, JournalEntryResponse, JournalEntryUpdate
from app.journal.serialization import entry_to_response
from app.journal.services.analysis import analyze_entry_in_background
from app.journal.services.common import get_settings, local_today
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/entries")


def _clean(text: str | None) -> str | None:
    return text.strip() or None if text is not None else None


def _own_entry(db: Session, entry_id: str, user: User) -> JournalEntry:
    entry = db.get(JournalEntry, entry_id)
    # Someone else's entry is indistinguishable from a missing one.
    if entry is None or entry.user_id != user.id:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    return entry


def _schedule_analysis(entry: JournalEntry, background_tasks: BackgroundTasks) -> None:
    if entry.content_enc is None:
        entry.analysis_status = AnalysisStatus.SKIPPED
        entry.analysis_enc = None
        return
    entry.analysis_status = AnalysisStatus.PENDING
    background_tasks.add_task(analyze_entry_in_background, entry.id)


@router.get("", response_model=JournalEntryList)
def list_entries(
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(30, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(JournalEntry).filter(JournalEntry.user_id == user.id)
    if date_from:
        query = query.filter(JournalEntry.entry_date >= date_from)
    if date_to:
        query = query.filter(JournalEntry.entry_date <= date_to)
    total = query.count()
    rows = (
        query.order_by(JournalEntry.entry_date.desc(), JournalEntry.created_at.desc()).offset(offset).limit(limit).all()
    )
    return JournalEntryList(entries=[entry_to_response(e) for e in rows], total=total)


@router.post("", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
def create_entry(
    body: JournalEntryCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    content = _clean(body.content)
    if content is None and body.mood is None:
        raise HTTPException(status_code=400, detail="Нужен текст или настроение")
    if body.mood is None and get_settings(db, user.id).mood_mode == MoodMode.MANUAL:
        raise HTTPException(status_code=400, detail="Выберите настроение")

    entry = JournalEntry(
        user_id=user.id,
        entry_date=local_today(),
        mood=body.mood,
        mood_source=MoodSource.USER if body.mood is not None else None,
        content_enc=encrypt_text(content),
    )
    db.add(entry)
    db.flush()
    _schedule_analysis(entry, background_tasks)
    db.commit()
    db.refresh(entry)
    return entry_to_response(entry)


@router.get("/{entry_id}", response_model=JournalEntryResponse)
def get_entry(entry_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return entry_to_response(_own_entry(db, entry_id, user))


@router.patch("/{entry_id}", response_model=JournalEntryResponse)
def update_entry(
    entry_id: str,
    body: JournalEntryUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = _own_entry(db, entry_id, user)
    fields = body.model_fields_set
    if "mood" in fields and body.mood is not None:
        entry.mood = body.mood
        entry.mood_source = MoodSource.USER
    if "content" in fields:
        content = _clean(body.content)
        if content is None and entry.mood is None:
            raise HTTPException(status_code=400, detail="Нужен текст или настроение")
        entry.content_enc = encrypt_text(content)
        _schedule_analysis(entry, background_tasks)
    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return entry_to_response(entry)


@router.post("/{entry_id}/analyze", response_model=JournalEntryResponse)
def reanalyze_entry(
    entry_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retry the AI pass, e.g. after a FAILED status."""
    entry = _own_entry(db, entry_id, user)
    _schedule_analysis(entry, background_tasks)
    db.commit()
    db.refresh(entry)
    return entry_to_response(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(_own_entry(db, entry_id, user))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
