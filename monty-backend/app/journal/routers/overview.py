from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.config import get_db
from app.finance.models import User
from app.journal.models import JournalEntry
from app.journal.schemas import JournalOverview, PartnerStatus
from app.journal.serialization import streak_to_response
from app.journal.services.analytics import build_analytics
from app.journal.services.common import entry_dates, get_settings, local_today, partners_of
from app.journal.services.streaks import compute_streak
from app.middleware.auth import get_current_user

router = APIRouter()


def _partner_status(db: Session, partner: User, today) -> PartnerStatus:
    last = (
        db.query(JournalEntry.entry_date, JournalEntry.mood)
        .filter(JournalEntry.user_id == partner.id)
        .order_by(JournalEntry.entry_date.desc(), JournalEntry.created_at.desc())
        .first()
    )
    return PartnerStatus(
        user_id=partner.id,
        first_name=partner.first_name,
        streak=streak_to_response(compute_streak(entry_dates(db, partner.id), today)),
        last_mood=last.mood if last else None,
        last_entry_date=last.entry_date if last else None,
    )


@router.get("/overview", response_model=JournalOverview)
def overview(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    today = local_today()
    today_entries = (
        db.query(JournalEntry).filter(JournalEntry.user_id == user.id, JournalEntry.entry_date == today).count()
    )
    return JournalOverview(
        today=today,
        me=streak_to_response(compute_streak(entry_dates(db, user.id), today)),
        today_entries=today_entries,
        mood_mode=get_settings(db, user.id).mood_mode,
        partners=[_partner_status(db, p, today) for p in partners_of(db, user)],
    )


@router.get("/analytics")
def analytics(
    days: int = Query(30, ge=7, le=366),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return build_analytics(db, user.id, today=local_today(), days=days)
