"""Scheduled Telegram notifications: which exist, and their on/off + time stored in the settings table."""

import re
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.finance.services.settings_service import SettingsService


@dataclass(frozen=True)
class NotificationSpec:
    id: str
    default_time: str
    default_enabled: bool = True


NOTIFICATIONS: dict[str, NotificationSpec] = {
    spec.id: spec
    for spec in (
        NotificationSpec("morning", "09:00"),
        NotificationSpec("evening", "22:00"),
        NotificationSpec("food", "20:00"),
    )
}

# The evening summary can end with an AI comment; off by default (templates carry the advice).
EVENING_AI_KEY = "notify_evening_ai"

_TIME_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


def is_valid_time(value: str) -> bool:
    return bool(_TIME_RE.match(value))


def parse_time(value: str) -> tuple[int, int]:
    hour, minute = value.split(":")
    return int(hour), int(minute)


def _enabled_key(notification_id: str) -> str:
    return f"notify_{notification_id}_enabled"


def _time_key(notification_id: str) -> str:
    return f"notify_{notification_id}_time"


def _as_bool(value: str | None, default: bool) -> bool:
    return default if value is None else value == "1"


def get_notification(db: Session, notification_id: str) -> dict:
    spec = NOTIFICATIONS[notification_id]
    stored_time = SettingsService.get_setting(db, _time_key(notification_id))
    return {
        "id": notification_id,
        "enabled": _as_bool(SettingsService.get_setting(db, _enabled_key(notification_id)), spec.default_enabled),
        "time": stored_time if stored_time and is_valid_time(stored_time) else spec.default_time,
    }


def get_notification_settings(db: Session) -> dict:
    return {
        "items": [get_notification(db, notification_id) for notification_id in NOTIFICATIONS],
        "evening_ai": evening_ai_enabled(db),
    }


def set_notification(db: Session, notification_id: str, *, enabled: bool, time: str) -> None:
    SettingsService.set_setting(db, _enabled_key(notification_id), "1" if enabled else "0")
    SettingsService.set_setting(db, _time_key(notification_id), time)


def evening_ai_enabled(db: Session) -> bool:
    return _as_bool(SettingsService.get_setting(db, EVENING_AI_KEY), False)


def set_evening_ai(db: Session, enabled: bool) -> None:
    SettingsService.set_setting(db, EVENING_AI_KEY, "1" if enabled else "0")
