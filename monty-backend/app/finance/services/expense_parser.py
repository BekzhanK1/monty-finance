"""Shared natural-language parser for transactions (Siri, in-app voice, bot).

Text → OpenAI (JSON mode) → validated `ParsedExpense` items. Nothing is saved here.
"""

import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta

import pytz
from openai import OpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
from app.finance.models import Category, TransactionType
from app.finance.services.siri_logger import SiriLog

APP_TIMEZONE = pytz.timezone("Asia/Almaty")
PARSE_MODEL = "gpt-4o-mini"
TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe"
# Older dates are almost certainly a mis-parse ("в 2019 году купил…").
MAX_BACKDATE_DAYS = 62

CATEGORY_NOT_FOUND_MESSAGE = (
    "Извините, я не нашёл по вашей категории ничего похожего."
)
AMOUNT_NOT_FOUND_MESSAGE = (
    "Не понял сумму. Скажите, например: «500 бензин» или «2000 на пирожки»."
)
TRANSCRIBE_FAILED_MESSAGE = "Не удалось распознать запись. Попробуйте ещё раз или введите текстом."

_WEEKDAYS_RU = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"]

_openai_client: OpenAI | None = None


@dataclass(frozen=True)
class ParsedExpense:
    category: Category
    amount: int
    comment: str
    # None means "now"; otherwise a past local date the user mentioned ("вчера").
    local_date: date | None = None


class ExpenseParseError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY or None)
    return _openai_client


def local_today() -> date:
    return datetime.now(APP_TIMEZONE).date()


def transcribe_audio(content: bytes, filename: str, content_type: str, *, log: SiriLog) -> str:
    log.info("transcribing audio", size=len(content), content_type=content_type)
    try:
        result = get_openai_client().audio.transcriptions.create(
            model=TRANSCRIBE_MODEL,
            file=(filename, content, content_type),
            language="ru",
            prompt="Расходы и доходы в тенге: «500 бензин», «вчера 3 тыщи продукты», «зарплата 450 тысяч».",
        )
    except Exception as exc:
        log.error("transcription failed", exc=exc)
        raise ExpenseParseError(TRANSCRIBE_FAILED_MESSAGE) from exc
    text = (getattr(result, "text", "") or "").strip()
    log.info("transcription done", text=text)
    if not text:
        raise ExpenseParseError(TRANSCRIBE_FAILED_MESSAGE)
    return text


def _load_categories(db: Session, *, include_income: bool, log: SiriLog) -> list[Category]:
    query = db.query(Category)
    if not include_income:
        query = query.filter(Category.type == TransactionType.EXPENSE)
    categories = query.order_by(Category.id).all()
    log.info(
        "loaded categories",
        categories_count=len(categories),
        categories=[{"id": c.id, "name": c.name} for c in categories],
    )
    return categories


def build_prompt(raw_text: str, categories: list[Category], today: date, *, include_income: bool) -> str:
    catalog = [
        {"id": c.id, "name": c.name, "type": c.type.value if hasattr(c.type, "value") else c.type}
        for c in categories
    ]
    kinds = "расходы или доходы" if include_income else "расходы"
    return f"""Пользователь надиктовал {kinds} на русском языке.
Сегодня {today.isoformat()}, {_WEEKDAYS_RU[today.weekday()]}.
Суммы всегда в тенге (₸). Верни amount целым числом в тенге.
Разговорные суммы: «тыща»/«тыс»/«к» = 1000 («5к» = 5000, «3 тыщи» = 3000), «косарь» = 1000, «лям» = 1000000, «полторы тысячи» = 1500.

Текст пользователя: "{raw_text}"

Доступные категории (type EXPENSE — расход, INCOME — доход):
{json.dumps(catalog, ensure_ascii=False, indent=2)}

Задача:
1. Извлеки одну или несколько транзакций, если в тексте явно несколько сумм.
2. Для каждой транзакции определи amount, category_id из списка и короткий comment.
3. date: если пользователь назвал день («вчера», «позавчера», «в пятницу», «12 числа») — верни дату в формате YYYY-MM-DD (всегда в прошлом или сегодня), иначе null.
4. Если сумму понять нельзя — верни {{"error": "amount"}}.
5. Если для какой-то транзакции нет подходящей категории — верни {{"error": "category"}}.

Ответь строго JSON одного из видов:
{{"transactions": [{{"amount": 500, "category_id": 5, "comment": "бензин", "date": null}}]}}
или
{{"error": "amount"}}
или
{{"error": "category"}}"""


def _parse_date(value: object, today: date) -> date | None:
    if not value or not isinstance(value, str):
        return None
    try:
        parsed = date.fromisoformat(value[:10])
    except ValueError:
        return None
    if parsed >= today or parsed < today - timedelta(days=MAX_BACKDATE_DAYS):
        return None
    return parsed


def validate_llm_payload(
    data: dict,
    *,
    raw_text: str,
    categories_by_id: dict[int, Category],
    today: date,
    log: SiriLog,
) -> list[ParsedExpense]:
    error = data.get("error")
    if error == "amount":
        raise ExpenseParseError(AMOUNT_NOT_FOUND_MESSAGE)
    if error == "category":
        raise ExpenseParseError(CATEGORY_NOT_FOUND_MESSAGE)

    raw_transactions = data.get("transactions")
    if not isinstance(raw_transactions, list) or not raw_transactions:
        raise ExpenseParseError(AMOUNT_NOT_FOUND_MESSAGE)

    parsed: list[ParsedExpense] = []
    for index, item in enumerate(raw_transactions):
        if not isinstance(item, dict):
            log.info("invalid transaction item", index=index, item=item)
            raise ExpenseParseError(AMOUNT_NOT_FOUND_MESSAGE)

        try:
            amount = int(item.get("amount"))
        except (TypeError, ValueError):
            log.info("invalid amount in transaction", index=index, amount=item.get("amount"))
            raise ExpenseParseError(AMOUNT_NOT_FOUND_MESSAGE)
        if amount <= 0:
            raise ExpenseParseError(AMOUNT_NOT_FOUND_MESSAGE)

        try:
            category = categories_by_id.get(int(item.get("category_id")))
        except (TypeError, ValueError):
            category = None
        if category is None:
            log.info("category not resolved", index=index, item=item)
            raise ExpenseParseError(CATEGORY_NOT_FOUND_MESSAGE)

        comment = str(item.get("comment") or "").strip()[:255] or raw_text[:255]
        parsed.append(
            ParsedExpense(
                category=category,
                amount=amount,
                comment=comment,
                local_date=_parse_date(item.get("date"), today),
            )
        )
        log.info(
            "transaction parsed",
            index=index,
            amount=amount,
            category_id=category.id,
            category_name=category.name,
            comment=comment,
        )
    return parsed


def parse_expenses(
    db: Session,
    raw_text: str,
    *,
    log: SiriLog,
    include_income: bool = False,
    today: date | None = None,
) -> list[ParsedExpense]:
    today = today or local_today()
    categories = _load_categories(db, include_income=include_income, log=log)
    if not categories:
        raise ExpenseParseError(CATEGORY_NOT_FOUND_MESSAGE)

    prompt = build_prompt(raw_text, categories, today, include_income=include_income)
    log.info("calling OpenAI to parse raw_text", raw_text=raw_text)
    try:
        response = get_openai_client().chat.completions.create(
            model=PARSE_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Ты парсер финансовых операций для семейного бюджета в Казахстане. "
                        "Суммы только в тенге. Отвечай только валидным JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=400,
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw_content = response.choices[0].message.content or "{}"
        log.info("OpenAI parse response", raw_response=raw_content)
        data = json.loads(raw_content)
    except Exception as exc:
        log.error("OpenAI parse failed", exc=exc)
        raise ExpenseParseError(AMOUNT_NOT_FOUND_MESSAGE) from exc

    return validate_llm_payload(
        data,
        raw_text=raw_text,
        categories_by_id={c.id: c for c in categories},
        today=today,
        log=log,
    )


def transaction_datetime(local_date: date | None) -> datetime:
    """Stored timestamps are naive UTC; a past local date is pinned to local noon."""
    if local_date is None or local_date >= local_today():
        return datetime.utcnow()
    local_noon = APP_TIMEZONE.localize(datetime.combine(local_date, datetime.min.time()).replace(hour=12))
    return local_noon.astimezone(pytz.utc).replace(tzinfo=None)
