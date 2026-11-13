"""Personal "write today?" reminders in each user's private chat with the bot.

One APScheduler job per user (journal_reminder_<id>) at their chosen Almaty time;
the job skips users who already wrote today. Telegram can only deliver to a user who
has pressed Start in the bot — otherwise the send fails and is logged.
"""

import asyncio
import logging

from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from app.core.config import SessionLocal, settings
from app.finance.models import User
from app.journal.services.common import APP_TIMEZONE, entry_dates, get_settings, local_today, partners_of
from app.journal.services.streaks import compute_streak

log = logging.getLogger(__name__)


def _job_id(user_id: int) -> str:
    return f"journal_reminder_{user_id}"


def send_private_message(chat_id: int, text: str) -> bool:
    from telegram import Bot

    if not settings.TELEGRAM_BOT_TOKEN:
        log.info("journal reminder skipped: no TELEGRAM_BOT_TOKEN")
        return False

    async def _send():
        await Bot(token=settings.TELEGRAM_BOT_TOKEN).send_message(chat_id=chat_id, text=text, parse_mode="HTML")

    try:
        asyncio.run(_send())
        return True
    except Exception as exc:
        log.warning("journal reminder to %s failed: %s", chat_id, exc)
        return False


def build_reminder_text(db: Session, user: User) -> str | None:
    """None when the user already wrote today (nothing to remind)."""
    today = local_today()
    streak = compute_streak(entry_dates(db, user.id), today)
    if streak.today_done:
        return None
    lines = ["📝 <b>Как прошёл день?</b> Пара строк или просто настроение — уже запись."]
    if streak.current:
        lines.append(f"🔥 Серия: {streak.current} дн. — не прерывай.")
    done_partners = [
        p.first_name for p in partners_of(db, user) if compute_streak(entry_dates(db, p.id), today).today_done
    ]
    if done_partners:
        lines.append(f"✅ Уже написали сегодня: {', '.join(done_partners)}")
    return "\n".join(lines)


def send_reminder(user_id: int, *, force: bool = False) -> bool:
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if user is None or not user.is_active:
            return False
        text = build_reminder_text(db, user)
        if text is None:
            if not force:
                return False
            text = "📝 Тестовое напоминание: сегодня запись уже есть 👌"
        return send_private_message(user.telegram_id, text)
    finally:
        db.close()


def apply_user_reminder(scheduler, db: Session, user_id: int) -> None:
    config = get_settings(db, user_id)
    job_id = _job_id(user_id)
    # Remove first: on a not-yet-started scheduler replace_existing keeps a stale pending job.
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    if not config.reminder_enabled:
        return
    hour, minute = (int(x) for x in config.reminder_time.split(":"))
    scheduler.add_job(
        send_reminder,
        trigger=CronTrigger(hour=hour, minute=minute, timezone=APP_TIMEZONE),
        args=[user_id],
        id=job_id,
        name=f"Telegram: journal reminder (user {user_id})",
    )


def apply_journal_reminders(scheduler, db: Session) -> None:
    for (user_id,) in db.query(User.id).filter(User.is_active.is_(True)).all():
        apply_user_reminder(scheduler, db, user_id)
