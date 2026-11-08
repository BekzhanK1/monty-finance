from datetime import date, datetime

import pytz
from sqlalchemy.orm import Session

from app.finance.models import User
from app.journal.models import JournalEntry, JournalSettings

# Same zone as the rest of Monty (finance digests, food reminders). See tech-debt.md.
APP_TIMEZONE = pytz.timezone("Asia/Almaty")


def local_today() -> date:
    return datetime.now(APP_TIMEZONE).date()


def get_settings(db: Session, user_id: int) -> JournalSettings:
    row = db.get(JournalSettings, user_id)
    if row is None:
        row = JournalSettings(user_id=user_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def entry_dates(db: Session, user_id: int) -> list[date]:
    rows = db.query(JournalEntry.entry_date).filter(JournalEntry.user_id == user_id).distinct().all()
    return [r[0] for r in rows]


def partners_of(db: Session, user: User) -> list[User]:
    return (
        db.query(User)
        .filter(User.household_id == user.household_id, User.id != user.id, User.is_active.is_(True))
        .order_by(User.id)
        .all()
    )
