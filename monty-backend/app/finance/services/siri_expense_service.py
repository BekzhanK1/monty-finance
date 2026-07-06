import json
from dataclasses import dataclass

from openai import OpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
from app.finance.models import Category, TransactionType
from app.finance.services.siri_logger import SiriLog

_openai_client: OpenAI | None = None

CATEGORY_NOT_FOUND_MESSAGE = (
    "Извините, я не нашёл по вашей категории ничего похожего."
)
AMOUNT_NOT_FOUND_MESSAGE = (
    "Не понял сумму. Скажите, например: «500 бензин» или «2000 на пирожки»."
)


@dataclass(frozen=True)
class ParsedSiriExpense:
    category: Category
    amount: int
    comment: str


class SiriParseError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def _get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY or None)
    return _openai_client


def _load_expense_categories(db: Session, log: SiriLog) -> list[Category]:
    categories = (
        db.query(Category)
        .filter(Category.type == TransactionType.EXPENSE)
        .order_by(Category.id)
        .all()
    )
    log.info(
        "loaded expense categories",
        categories_count=len(categories),
        categories=[{"id": category.id, "name": category.name} for category in categories],
    )
    return categories


def parse_siri_expenses(
    db: Session,
    raw_text: str,
    *,
    log: SiriLog,
) -> list[ParsedSiriExpense]:
    categories = _load_expense_categories(db, log)
    if not categories:
        raise SiriParseError(CATEGORY_NOT_FOUND_MESSAGE)

    categories_by_id = {category.id: category for category in categories}
    catalog = [{"id": category.id, "name": category.name} for category in categories]
    prompt = f"""Пользователь надиктовал расход(ы) на русском языке.
Суммы всегда в тенге (₸). Верни amount целым числом в тенге.

Текст пользователя: "{raw_text}"

Доступные категории расходов:
{json.dumps(catalog, ensure_ascii=False, indent=2)}

Задача:
1. Извлеки одну или несколько транзакций, если в тексте явно несколько расходов.
2. Для каждой транзакции определи amount, category_id из списка категорий и короткий comment.
3. Если сумму понять нельзя — верни {{"error": "amount"}}.
4. Если для какой-то транзакции нет подходящей категории — верни {{"error": "category"}}.
5. Если transactions пустой — верни {{"error": "amount"}}.

Ответь строго JSON одного из видов:
{{"transactions": [{{"amount": 500, "category_id": 5, "comment": "бензин"}}]}}
или
{{"error": "amount"}}
или
{{"error": "category"}}"""

    log.info("calling OpenAI to parse raw_text", raw_text=raw_text)

    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Ты парсер финансовых расходов для семейного бюджета в Казахстане. "
                        "Суммы только в тенге. Отвечай только валидным JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=300,
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw_content = response.choices[0].message.content or "{}"
        log.info("OpenAI parse response", raw_response=raw_content)
        data = json.loads(raw_content)
    except Exception as exc:
        log.error("OpenAI parse failed", exc=exc)
        raise SiriParseError(AMOUNT_NOT_FOUND_MESSAGE) from exc

    error = data.get("error")
    if error == "amount":
        log.info("OpenAI could not parse amount")
        raise SiriParseError(AMOUNT_NOT_FOUND_MESSAGE)
    if error == "category":
        log.info("OpenAI could not match category")
        raise SiriParseError(CATEGORY_NOT_FOUND_MESSAGE)

    raw_transactions = data.get("transactions")
    if not isinstance(raw_transactions, list) or not raw_transactions:
        log.info("OpenAI returned empty transactions")
        raise SiriParseError(AMOUNT_NOT_FOUND_MESSAGE)

    parsed: list[ParsedSiriExpense] = []
    for index, item in enumerate(raw_transactions):
        if not isinstance(item, dict):
            log.info("invalid transaction item", index=index, item=item)
            raise SiriParseError(AMOUNT_NOT_FOUND_MESSAGE)

        amount = item.get("amount")
        category_id = item.get("category_id")
        comment = str(item.get("comment") or raw_text).strip()[:255]

        try:
            amount_int = int(amount)
        except (TypeError, ValueError):
            log.info("invalid amount in transaction", index=index, amount=amount)
            raise SiriParseError(AMOUNT_NOT_FOUND_MESSAGE)

        if amount_int <= 0:
            log.info("non-positive amount in transaction", index=index, amount=amount_int)
            raise SiriParseError(AMOUNT_NOT_FOUND_MESSAGE)

        if category_id is None:
            log.info("null category_id in transaction", index=index, item=item)
            raise SiriParseError(CATEGORY_NOT_FOUND_MESSAGE)

        category = categories_by_id.get(int(category_id))
        if category is None:
            log.info(
                "category_id not found in database",
                index=index,
                category_id=category_id,
            )
            raise SiriParseError(CATEGORY_NOT_FOUND_MESSAGE)

        parsed.append(
            ParsedSiriExpense(
                category=category,
                amount=amount_int,
                comment=comment or raw_text[:255],
            )
        )
        log.info(
            "transaction parsed",
            index=index,
            amount=amount_int,
            category_id=category.id,
            category_name=category.name,
            comment=comment,
        )

    return parsed


def _format_saved_items(saved_items: list[ParsedSiriExpense]) -> str:
    lines = []
    for item in saved_items:
        lines.append(
            f"- {item.amount:,} ₸ → {item.category.icon} {item.category.name}"
            + (f" ({item.comment})" if item.comment else "")
        )
    return "\n".join(lines)


def _fallback_confirmation_message(
    *,
    saved_items: list[ParsedSiriExpense],
) -> str:
    if len(saved_items) == 1:
        item = saved_items[0]
        return (
            f"Готово! Записал {item.amount:,} ₸ в "
            f"«{item.category.icon} {item.category.name}»."
        )

    total = sum(item.amount for item in saved_items)
    details = ", ".join(
        f"{item.amount:,} ₸ {item.category.name}" for item in saved_items
    )
    return f"Готово! Записал {len(saved_items)} расхода на {total:,} ₸: {details}."


def generate_expense_confirmation_message(
    *,
    saved_items: list[ParsedSiriExpense],
    raw_text: str,
    user_name: str,
    log: SiriLog,
) -> str:
    log.info("calling OpenAI for confirmation message", transactions_count=len(saved_items))
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
                        "Подтверди, что записал расход или несколько расходов."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Исходный текст пользователя: {raw_text}\n"
                        f"От имени: {user_name}\n\n"
                        f"Записанные транзакции:\n{_format_saved_items(saved_items)}\n\n"
                        "Скажи пользователю дружелюбно, что расход(ы) записан(ы)."
                    ),
                },
            ],
            max_tokens=160,
            temperature=0.7,
        )
        message = (response.choices[0].message.content or "").strip()
        if message:
            log.info("OpenAI confirmation message generated", response_text=message)
            return message
        log.info("OpenAI confirmation message empty, using fallback")
    except Exception as exc:
        log.error("OpenAI confirmation message failed", exc=exc)

    fallback = _fallback_confirmation_message(saved_items=saved_items)
    log.info("using fallback confirmation message", response_text=fallback)
    return fallback
