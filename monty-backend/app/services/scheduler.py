from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import pytz

from app.core.config import SessionLocal
from app.services.digest_service import generate_ai_digest, send_digest_to_telegram
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

def setup_scheduler():
    trigger = CronTrigger(
        hour=21,
        minute=0,
        timezone=pytz.timezone("Asia/Almaty")
    )
    
    scheduler.add_job(
        send_daily_digest,
        trigger=trigger,
        id="daily_digest",
        name="Send daily AI digest",
        replace_existing=True
    )
    
    print("Scheduler configured for daily digest at 21:00 (Almaty time)")
