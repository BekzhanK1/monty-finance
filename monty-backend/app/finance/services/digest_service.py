from datetime import datetime, date, timedelta
from typing import List, Dict
from openai import OpenAI
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings, SessionLocal
from app.finance.models import Transaction, Category, User
from app.finance.services.database import get_financial_period

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
    
    transactions = (
        db.query(
            Category.name,
            Category.icon,
            func.sum(Transaction.amount).label("total"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(
            Transaction.transaction_date >= start_of_day,
            Transaction.transaction_date <= end_of_day,
            Category.type == "EXPENSE",
            Category.group != "SAVINGS",
        )
        .group_by(Category.id, Category.name, Category.icon)
        .all()
    )
    
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
    
    total = (
        db.query(func.sum(Transaction.amount))
        .join(Category)
        .filter(
            Transaction.transaction_date >= start_of_day,
            Transaction.transaction_date <= end_of_day,
            Category.type == "EXPENSE",
            Category.group != "SAVINGS",
        )
        .scalar()
    )
    
    return total or 0

def get_today_transactions_detail(db: Session) -> list:
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    end_of_day = datetime.combine(today, datetime.max.time())
    
    transactions = (
        db.query(Transaction)
        .join(Category)
        .filter(
            Transaction.transaction_date >= start_of_day,
            Transaction.transaction_date <= end_of_day,
        )
        .order_by(Transaction.transaction_date.desc())
        .all()
    )
    
    return [
        {
            "icon": t.category.icon,
            "name": t.category.name,
            "amount": t.amount,
            "type": t.category.type.value,
            "group": t.category.group.value,
            "comment": t.comment
        }
        for t in transactions
    ]

def send_reminder_notification() -> bool:
    import asyncio
    from telegram import Bot
    
    if not settings.TELEGRAM_CHAT_ID or not settings.TELEGRAM_BOT_TOKEN:
        print("[Telegram] SKIPPED - missing chat_id or bot_token")
        return False
    
    async def _send():
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        text = "🔔 <b>Напоминание</b>\n\n"
        text += "Не забудь записать все сегодняшние расходы и доходы! 📝"
        
        await bot.send_message(
            chat_id=settings.TELEGRAM_CHAT_ID,
            text=text,
            parse_mode="HTML"
        )
        print(f"[Telegram] Reminder sent successfully")
    
    try:
        asyncio.run(_send())
        return True
    except Exception as e:
        print(f"[Telegram] ERROR sending reminder: {e}")
        return False

def send_daily_summary() -> bool:
    import asyncio
    from telegram import Bot
    
    if not settings.TELEGRAM_CHAT_ID or not settings.TELEGRAM_BOT_TOKEN:
        print("[Telegram] SKIPPED - missing chat_id or bot_token")
        return False
    
    db = None
    try:
        db = SessionLocal()
        
        today_total = get_today_total(db)
        transactions = get_today_transactions_detail(db)
        
        expenses = [
            t for t in transactions
            if t["type"] == "EXPENSE" and t.get("group") != "SAVINGS"
        ]
        incomes = [t for t in transactions if t["type"] == "INCOME"]
        total_expenses = sum(t["amount"] for t in expenses)
        total_income = sum(t["amount"] for t in incomes)
        
        ai_summary = generate_ai_summary(db, transactions, total_expenses, total_income)
        
        async def _send():
            bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
            
            text = f"📊 <b>Сводка за день</b>\n\n"
            text += f"💰 Доходы: {total_income:,} ₸\n"
            text += f"💸 Расходы: {total_expenses:,} ₸\n"
            text += f"📈 Баланс: {total_income - total_expenses:,} ₸\n\n"
            
            if expenses:
                text += "<b>Расходы:</b>\n"
                for t in expenses[:10]:
                    text += f"{t['icon']} {t['name']}: {t['amount']:,} ₸"
                    if t['comment']:
                        text += f" ({t['comment']})"
                    text += "\n"
                text += "\n"
            
            if incomes:
                text += "<b>Доходы:</b>\n"
                for t in incomes[:5]:
                    text += f"{t['icon']} {t['name']}: {t['amount']:,} ₸\n"
                text += "\n"
            
            text += f"<i>{ai_summary}</i>"
            
            await bot.send_message(
                chat_id=settings.TELEGRAM_CHAT_ID,
                text=text,
                parse_mode="HTML"
            )
            print(f"[Telegram] Daily summary sent successfully")
        
        asyncio.run(_send())
        return True
    except Exception as e:
        print(f"[Telegram] ERROR sending daily summary: {e}")
        return False
    finally:
        if db:
            db.close()

def generate_ai_summary(db: Session, transactions: list, total_expenses: int, total_income: int) -> str:
    if not transactions:
        return "Сегодня транзакций не было 😴"
    
    try:
        client = _get_openai_client()
        
        summary = "Транзакции за день:\n"
        for t in transactions[:15]:
            summary += f"- {t['icon']} {t['name']}: {t['amount']:,} ₸"
            if t['comment']:
                summary += f" ({t['comment']})"
            summary += "\n"
        
        prompt = f"""Ты Монти — финансовый ассистент. Проанализируй день:
        
Доходы: {total_income:,} ₸
Расходы: {total_expenses:,} ₸

{summary}

Напиши короткий (2-3 предложения) комментарий с анализом и рекомендацией. Будь дружелюбным и полезным."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Ты — Монти, дружелюбный финансовый ассистент. Отвечай кратко на русском."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            temperature=0.7
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        return "Хорошего дня! 🌟"

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
