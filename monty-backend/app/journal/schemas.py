from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.finance.services.notification_settings import is_valid_time

MoodModeLiteral = Literal["manual", "ai"]
MAX_CONTENT = 20_000


class JournalEntryCreate(BaseModel):
    content: str | None = Field(None, max_length=MAX_CONTENT)
    mood: int | None = Field(None, ge=1, le=5)


class JournalEntryUpdate(BaseModel):
    content: str | None = Field(None, max_length=MAX_CONTENT)
    mood: int | None = Field(None, ge=1, le=5)


class JournalEntryResponse(BaseModel):
    id: str
    entry_date: date
    mood: int | None
    mood_source: str | None
    content: str | None
    summary: str | None
    tags: list[str]
    emotions: list[str]
    analysis_status: str
    created_at: datetime
    updated_at: datetime


class JournalEntryList(BaseModel):
    entries: list[JournalEntryResponse]
    total: int


class StreakResponse(BaseModel):
    current: int
    best: int
    today_done: bool
    frozen_days: list[date]


class PartnerStatus(BaseModel):
    """Everything a partner may see. Deliberately no text, tags or summary."""

    user_id: int
    first_name: str
    streak: StreakResponse
    last_mood: int | None
    last_entry_date: date | None


class JournalOverview(BaseModel):
    today: date
    me: StreakResponse
    today_entries: int
    mood_mode: MoodModeLiteral
    partners: list[PartnerStatus]


class JournalSettingsResponse(BaseModel):
    mood_mode: MoodModeLiteral
    reminder_enabled: bool
    reminder_time: str

    class Config:
        from_attributes = True


class JournalSettingsUpdate(BaseModel):
    mood_mode: MoodModeLiteral | None = None
    reminder_enabled: bool | None = None
    reminder_time: str | None = None

    @field_validator("reminder_time")
    @classmethod
    def _time(cls, value: str | None) -> str | None:
        if value is not None and not is_valid_time(value):
            raise ValueError("reminder_time must be HH:MM")
        return value
