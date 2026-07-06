import json

from openai import OpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
from app.finance.models import Category, TransactionType
from app.finance.services.siri_logger import SiriLog

_openai_client: OpenAI | None = None

CATEGORY_NOT_FOUND_MESSAGE = (
    "Извините, я не нашёл по вашей категории ничего похожего."
)


def _get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY or None)
    return _openai_client


def match_expense_category(
    db: Session,
    category_text: str,
    *,
    log: SiriLog,
) -> Category | None:
    categories = (
        db.query(Category)
        .filter(Category.type == TransactionType.EXPENSE)
        .order_by(Category.id)
        .all()
    )
    log.info(
        "loaded expense categories",
        categories_count=len(categories),
        categories=[{"id": c.id, "name": c.name} for c in categories],
    )
    if not categories:
        log.info("no expense categories in database")
        return None

    catalog = [{"id": category.id, "name": category.name} for category in categories]
    prompt = f"""Пользователь описал расход: "{category_text}"

Доступные категории расходов:
{json.dumps(catalog, ensure_ascii=False, indent=2)}

Выбери одну категорию, которая лучше всего подходит по смыслу.
Если ни одна категория не подходит достаточно хорошо, верни category_id: null.

Ответь строго JSON: {{"category_id": <number или null>}}"""

    log.info("calling OpenAI for category match", category_text=category_text)

    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Ты классификатор финансовых расходов. Отвечай только валидным JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=50,
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw_content = response.choices[0].message.content or "{}"
        log.info("OpenAI category match response", raw_response=raw_content)

        data = json.loads(raw_content)
        category_id = data.get("category_id")
        if category_id is None:
            log.info("OpenAI returned null category_id")
            return None

        matched = (
            db.query(Category)
            .filter(
                Category.id == int(category_id),
                Category.type == TransactionType.EXPENSE,
            )
            .first()
        )
        if matched:
            log.info(
                "category matched",
                category_id=matched.id,
                category_name=matched.name,
            )
        else:
            log.info(
                "OpenAI category_id not found in database",
                category_id=category_id,
            )
        return matched
    except Exception as exc:
        log.error("OpenAI category match failed", exc=exc)
        return None


def _fallback_confirmation_message(
    *,
    category_name: str,
    category_icon: str,
    amount: int,
) -> str:
    return f"Готово! Записал {amount:,} ₸ в «{category_icon} {category_name}»."


def generate_expense_confirmation_message(
    *,
    category_name: str,
    category_icon: str,
    amount: int,
    category_text: str,
    user_name: str,
    log: SiriLog,
) -> str:
    log.info("calling OpenAI for confirmation message")
    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Ты — Монти, дружелюбный финансовый ассистент. "
                        "Отвечай кратко на русском, одним-двумя предложениями. "
                        "Подтверди, что записал расход."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Записал расход:\n"
                        f"- Сумма: {amount:,} ₸\n"
                        f"- Категория: {category_icon} {category_name}\n"
                        f"- Описание пользователя: {category_text}\n"
                        f"- От имени: {user_name}\n\n"
                        "Скажи пользователю дружелюбно, что расход записан."
                    ),
                },
            ],
            max_tokens=120,
            temperature=0.7,
        )
        message = (response.choices[0].message.content or "").strip()
        if message:
            log.info("OpenAI confirmation message generated", message=message)
            return message
        log.info("OpenAI confirmation message empty, using fallback")
    except Exception as exc:
        log.error("OpenAI confirmation message failed", exc=exc)

    fallback = _fallback_confirmation_message(
        category_name=category_name,
        category_icon=category_icon,
        amount=amount,
    )
    log.info("using fallback confirmation message", message=fallback)
    return fallback
