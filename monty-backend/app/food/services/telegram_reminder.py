"""Telegram: напоминание про меню на завтра (как вечерний триггер для сводки по финансам)."""

import asyncio
from datetime import date, datetime, timedelta

import pytz
from sqlalchemy.orm import Session, selectinload

from app.core.config import SessionLocal, settings
from app.food.models import FoodMealSlot, MVP_HOUSEHOLD_ID

SLOT_LABELS_RU: dict[str, str] = {
    "breakfast": "Завтрак",
    "lunch": "Обед",
    "dinner": "Ужин",
    "snack": "Перекус",
}

SLOT_ORDER = ("breakfast", "lunch", "dinner", "snack")


def _tomorrow_almaty() -> date:
    tz = pytz.timezone("Asia/Almaty")
    return datetime.now(tz).date() + timedelta(days=1)


def build_tomorrow_menu_message(db: Session) -> str:
    tomorrow = _tomorrow_almaty()
    tomorrow_fmt = tomorrow.strftime("%d.%m.%Y")

    slots = (
        db.query(FoodMealSlot)
        .options(selectinload(FoodMealSlot.dish))
        .filter(
            FoodMealSlot.household_id == MVP_HOUSEHOLD_ID,
            FoodMealSlot.slot_date == tomorrow,
        )
        .all()
    )

    by_key: dict[str, FoodMealSlot] = {}
    for s in slots:
        prev = by_key.get(s.slot_key)
        if prev is None or prev.id < s.id:
            by_key[s.slot_key] = s

    header = "🍳 <b>Напоминание: кухня на завтра</b>\n\n"
    header += f"<i>Не забудьте подготовить продукты под меню на {tomorrow_fmt}:</i>\n\n"

    if not by_key:
        return (
            header
            + "На завтра в меню пока <b>ничего не запланировано</b>.\n\n"
            + "📅 <b>Составьте расписание</b> в приложении Monty: <b>Food → Меню</b> — "
            + "тогда сюда попадут блюда по слотам.\n\n"
            + "Посмотреть неделю без редактирования можно в <b>Food → Гид</b>."
        )

    lines: list[str] = []
    any_filled = False
    for key in SLOT_ORDER:
        slot = by_key.get(key)
        label = SLOT_LABELS_RU.get(key, key)
        if not slot:
            lines.append(f"<b>{label}</b>: —")
            continue
        title = (slot.custom_title or "").strip() if slot.custom_title else ""
        if not title and slot.dish is not None:
            title = (slot.dish.title or "").strip()
        if title:
            lines.append(f"<b>{label}</b>: {title}")
            any_filled = True
        else:
            lines.append(f"<b>{label}</b>: —")

    body = "\n".join(lines)
    if not any_filled:
        return (
            header
            + body
            + "\n\nВ слотах пока нет выбранных блюд — зайдите в <b>Food → Меню</b> и назначьте блюда на завтра."
        )

    return (
        header
        + body
        + "\n\n📝 В <b>Food → Список</b> можно собрать покупки из состава блюд на неделю."
    )


def send_tomorrow_food_telegram_reminder() -> bool:
    from telegram import Bot

    if not settings.TELEGRAM_CHAT_ID or not settings.TELEGRAM_BOT_TOKEN:
        print("[Telegram] Food tomorrow reminder SKIPPED - missing chat_id or bot_token")
        return False

    db = SessionLocal()
    try:
        message = build_tomorrow_menu_message(db)
    finally:
        db.close()

    async def _send() -> None:
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        await bot.send_message(
            chat_id=settings.TELEGRAM_CHAT_ID,
            text=message,
            parse_mode="HTML",
        )

    try:
        asyncio.run(_send())
        print("[Telegram] Tomorrow food reminder sent successfully")
        return True
    except Exception as e:
        print(f"[Telegram] ERROR sending tomorrow food reminder: {e}")
        return False
