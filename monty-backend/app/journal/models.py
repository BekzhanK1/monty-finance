"""Journal ORM: entries (text encrypted at rest) and per-user journal settings."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, SmallInteger, String, Text

from app.core.config import Base


class MoodMode:
    MANUAL = "manual"  # the user always taps the mood; AI never sets it
    AI = "ai"  # AI sets the mood from the text unless the user picked one


class MoodSource:
    USER = "user"
    AI = "ai"


class AnalysisStatus:
    PENDING = "pending"
    DONE = "done"
    FAILED = "failed"
    SKIPPED = "skipped"  # nothing to analyze (mood-only check-in)


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # Local (Asia/Almaty) calendar day the entry counts for — streaks and graphs use it.
    entry_date = Column(Date, nullable=False, index=True)
    mood = Column(SmallInteger, nullable=True)  # 1..5; null = unknown (never a fake neutral)
    mood_source = Column(String(8), nullable=True)
    # Fernet tokens. Never returned to anyone but the author.
    content_enc = Column(Text, nullable=True)
    analysis_enc = Column(Text, nullable=True)  # JSON: {summary, tags, emotions}
    analysis_status = Column(String(12), nullable=False, default=AnalysisStatus.SKIPPED)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class JournalSettings(Base):
    __tablename__ = "journal_settings"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    mood_mode = Column(String(8), nullable=False, default=MoodMode.MANUAL)
    reminder_enabled = Column(Boolean, nullable=False, default=True)
    reminder_time = Column(String(5), nullable=False, default="21:30")
