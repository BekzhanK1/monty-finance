from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import pytz

from app.core.config import SessionLocal
from app.services.digest_service import generate_ai_digest, send_digest_to_telegram, send_reminder_notification, send_daily_summary
from app.core.config import settings

scheduler = AsyncIOScheduler(timezone=pytz.timezone("Asia/Almaty"))

def send_daily_digest():
    db = SessionLocal()
    try:
        digest = generate_ai_digest(db)
        
        if settings.allowed_telegram_ids:
            for telegram_id in settings.allowed_telegram_ids:
                send_digest_to_telegram(digest, telegram_id)
        
        print(f"[{datetime.now()}] Daily digest sent successfully")
    except Exception as e:
        print(f"[{datetime.now()}] Error sending daily digest: {e}")
    finally:
        db.close()

def send_reminder():
    try:
        send_reminder_notification()
        print(f"[{datetime.now()}] Reminder sent successfully")
    except Exception as e:
        print(f"[{datetime.now()}] Error sending reminder: {e}")

def send_summary():
    try:
        send_daily_summary()
        print(f"[{datetime.now()}] Daily summary sent successfully")
    except Exception as e:
        print(f"[{datetime.now()}] Error sending daily summary: {e}")

def setup_scheduler():
    reminder_trigger = CronTrigger(
        hour=21,
        minute=0,
        timezone=pytz.timezone("Asia/Almaty")
    )
    
    scheduler.add_job(
        send_reminder,
        trigger=reminder_trigger,
        id="daily_reminder",
        name="Send daily reminder to record transactions",
        replace_existing=True
    )
    
    summary_trigger = CronTrigger(
        hour=23,
        minute=50,
        timezone=pytz.timezone("Asia/Almaty")
    )
    
    scheduler.add_job(
        send_summary,
        trigger=summary_trigger,
        id="daily_summary",
        name="Send daily summary with AI analysis",
        replace_existing=True
    )
    
    print("Scheduler configured:")
    print("  - Reminder at 21:00 (Almaty time)")
    print("  - Daily summary at 23:50 (Almaty time)")
