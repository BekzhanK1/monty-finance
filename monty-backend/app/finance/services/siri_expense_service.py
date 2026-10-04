"""Siri Shortcut flow: shared expense parser + a friendly spoken confirmation."""

from sqlalchemy.orm import Session

from app.finance.services.expense_parser import (
    AMOUNT_NOT_FOUND_MESSAGE,
    CATEGORY_NOT_FOUND_MESSAGE,
    ExpenseParseError,
    ParsedExpense,
    get_openai_client,
    parse_expenses,
)
from app.finance.services.siri_logger import SiriLog

# Backwards-compatible names for callers of the original Siri-only parser.
ParsedSiriExpense = ParsedExpense
SiriParseError = ExpenseParseError

__all__ = [
    "AMOUNT_NOT_FOUND_MESSAGE",
    "CATEGORY_NOT_FOUND_MESSAGE",
    "ParsedSiriExpense",
    "SiriParseError",
    "generate_expense_confirmation_message",
    "parse_siri_expenses",
]


def parse_siri_expenses(
    db: Session,
    raw_text: str,
    *,
    log: SiriLog,
) -> list[ParsedExpense]:
    return parse_expenses(db, raw_text, log=log, include_income=False)


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
        client = get_openai_client()
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
