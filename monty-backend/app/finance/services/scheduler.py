from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import pytz

from app.core.config import SessionLocal
from app.finance.services.digest_service import send_evening_summary, send_morning_summary
from app.finance.services.notification_settings import NOTIFICATIONS, get_notification, parse_time
from app.food.models._constants import MVP_HOUSEHOLD_ID
from app.food.services.telegram_reminder import send_tomorrow_food_telegram_reminder

TIMEZONE = pytz.timezone("Asia/Almaty")
scheduler = AsyncIOScheduler(timezone=TIMEZONE)


def send_food_tomorrow_reminder(force: bool = False) -> bool:
    return send_tomorrow_food_telegram_reminder(household_id=MVP_HOUSEHOLD_ID, force=force)


# Notification id → (sender, job name). Senders also back the "send test" button in Settings.
SENDERS = {
    "morning": (send_morning_summary, "Telegram: morning budget summary"),
    "evening": (send_evening_summary, "Telegram: evening day summary"),
    "food": (lambda: send_food_tomorrow_reminder(), "Telegram: menu for tomorrow (Food)"),
}
assert SENDERS.keys() == NOTIFICATIONS.keys()


def _job_id(notification_id: str) -> str:
    return f"notify_{notification_id}"


def _run(notification_id: str):
    sender, name = SENDERS[notification_id]
    try:
        sender()
        print(f"[{datetime.now()}] {name}: done")
    except Exception as e:
        print(f"[{datetime.now()}] {name}: error {e}")


def apply_notification_schedule(db) -> None:
    """(Re)register notification jobs from the settings table; disabled ones are removed."""
    for notification_id in NOTIFICATIONS:
        config = get_notification(db, notification_id)
        job_id = _job_id(notification_id)
        if not config["enabled"]:
            if scheduler.get_job(job_id):
                scheduler.remove_job(job_id)
            continue
        hour, minute = parse_time(config["time"])
        scheduler.add_job(
            _run,
            trigger=CronTrigger(hour=hour, minute=minute, timezone=TIMEZONE),
            args=[notification_id],
            id=job_id,
            name=SENDERS[notification_id][1],
            replace_existing=True,
        )


def setup_scheduler():
    db = SessionLocal()
    try:
        apply_notification_schedule(db)
    finally:
        db.close()

    print("Scheduler configured:")
    for job in scheduler.get_jobs():
        print(f"  - {job.name}: {job.trigger}")
