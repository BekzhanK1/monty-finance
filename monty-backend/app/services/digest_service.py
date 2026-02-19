from datetime import datetime, date, timedelta
from typing import List, Dict
from openai import OpenAI
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings
from app.models.models import Transaction, Category, User
from app.services.database import get_financial_period

_openai_client: OpenAI | None = None

def _get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY or None)
    return _openai_client

def get_today_transactions_summary(db: Session) -> str:
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    end_of_day = datetime.combine(today, datetime.max.time())
    
    transactions = db.query(
        Category.name,
        Category.icon,
        func.sum(Transaction.amount).label('total')
    ).join(
        Transaction, Transaction.category_id == Category.id
    ).filter(
        Transaction.transaction_date >= start_of_day,
        Transaction.transaction_date <= end_of_day
    ).group_by(
        Category.id, Category.name, Category.icon
    ).all()
    
    if not transactions:
        return "Сегодня пока нет трат 💤"
    
    lines = []
    for cat_name, cat_icon, total in transactions:
        lines.append(f"{cat_icon} {cat_name}: {total:,} тг")
    
    return "\n".join(lines)

def generate_digest_prompt(transactions_summary: str) -> str:
    return f"""Ты Монти — финансовый ассистент для пары Бекжана и Енлик. 
Они хотят накопить 1.5 млн тенге к июлю 2025 года на свадьбу.

Сегодняшние траты:
{transactions_summary}

Напиши короткий (3-5 предложений), дружелюбный и слегка ироничный отчёт об их дне. 
Используй эмодзи. Будь позитивным, но если траты высокие — мягко пожури. 
Добавь совет или мотивацию копить дальше."""

def generate_ai_digest(db: Session) -> str:
    transactions_summary = get_today_transactions_summary(db)
    
    prompt = generate_digest_prompt(transactions_summary)
    
    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Ты — Монти, дружелюбный финансовый ассистент."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.7
        )
        digest = response.choices[0].message.content or ""
        return digest
    except Exception as e:
        return f"😱 Ошибка при генерации дайджеста: {str(e)}"

def send_digest_to_telegram(digest: str, chat_id: int) -> bool:
    from telegram import Bot
    
    try:
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        bot.send_message(chat_id=chat_id, text=digest, parse_mode="HTML")
        return True
    except Exception:
        return False

def get_today_total(db: Session) -> int:
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    end_of_day = datetime.combine(today, datetime.max.time())
    
    total = db.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_date >= start_of_day,
        Transaction.transaction_date <= end_of_day
    ).scalar()
    
    return total or 0

def send_transaction_notification(
    db: Session,
    category_icon: str,
    category_name: str,
    amount: int,
    user_name: str,
    comment: str | None = None
) -> bool:
    import asyncio
    from telegram import Bot
    
    print(f"[Telegram] Attempting to send notification...")
    print(f"[Telegram] TELEGRAM_CHAT_ID: {settings.TELEGRAM_CHAT_ID}")
    print(f"[Telegram] TELEGRAM_BOT_TOKEN set: {bool(settings.TELEGRAM_BOT_TOKEN)}")
    
    if not settings.TELEGRAM_CHAT_ID or not settings.TELEGRAM_BOT_TOKEN:
        print(f"[Telegram] SKIPPED - missing chat_id or bot_token")
        return False
    
    async def _send():
        today_total = get_today_total(db)
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        text = f"{category_icon} <b>{category_name}</b>\n"
        text += f"💰 {amount:,} ₸\n"
        text += f"👤 {user_name}"
        if comment:
            text += f"\n📝 {comment}"
        text += f"\n\n📊 Потрачено за день: {today_total:,} ₸"
        
        print(f"[Telegram] Sending message to {settings.TELEGRAM_CHAT_ID}...")
        await bot.send_message(
            chat_id=settings.TELEGRAM_CHAT_ID,
            text=text,
            parse_mode="HTML"
        )
        print(f"[Telegram] SUCCESS - message sent")
    
    try:
        asyncio.run(_send())
        return True
    except Exception as e:
        print(f"[Telegram] ERROR: {e}")
        return False
