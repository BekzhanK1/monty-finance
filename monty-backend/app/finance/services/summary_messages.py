"""Template-based morning / evening Telegram summaries — plain rules over DayBudget, no AI."""

import random
from html import escape

from app.finance.services.daily_budget import SPENDING_GROUPS, DayBudget

# Share of a category limit (and of the period) from which a category counts as "almost used up".
NEAR_LIMIT_PERCENT = 85


def money(amount: int) -> str:
    return f"{amount:,}".replace(",", " ") + " ₸"


def days_word(n: int) -> str:
    n = abs(n)
    if n % 10 == 1 and n % 100 != 11:
        return "день"
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return "дня"
    return "дней"


def _rng(b: DayBudget, salt: int) -> random.Random:
    # Deterministic per day: the same day always reads the same, consecutive days vary.
    return random.Random(b.day.toordinal() * 10 + salt)


def _over_limit_category(b: DayBudget):
    over = [x for x in b.budgets if x.group in SPENDING_GROUPS and x.limit_amount > 0 and x.spent > x.limit_amount]
    return max(over, key=lambda x: x.spent - x.limit_amount, default=None)


def _near_limit_category(b: DayBudget):
    if b.time_percent >= NEAR_LIMIT_PERCENT:
        return None
    near = [
        x for x in b.budgets
        if x.group in SPENDING_GROUPS and x.limit_amount > 0
        and NEAR_LIMIT_PERCENT <= x.spent / x.limit_amount * 100 <= 100
    ]
    return max(near, key=lambda x: x.spent / x.limit_amount, default=None)


def _percent_line(b: DayBudget) -> str:
    return f"потрачено {b.spent_percent:.0f}% бюджета, прошло {b.time_percent:.0f}% периода"


def period_advice(b: DayBudget, rng: random.Random) -> str:
    """One piece of advice about the period as a whole; the first matching rule wins."""
    if b.remaining <= 0:
        return rng.choice([
            f"Бюджет исчерпан. До зарплаты {b.days_left} {days_word(b.days_left)} — только самое необходимое.",
            f"Лимит периода уже потрачен. Держимся {b.days_left} {days_word(b.days_left)} на минимуме, без спонтанных покупок.",
        ])
    category = _over_limit_category(b)
    if category:
        over = money(category.spent - category.limit_amount)
        return rng.choice([
            f"{category.category_icon} {escape(category.category_name)} уже вышли за лимит на {over}. Перебор идёт из общего бюджета — в этой категории лучше пауза.",
            f"Категория {category.category_icon} {escape(category.category_name)} превысила лимит на {over}. До конца периода лучше её не трогать.",
        ])
    if b.pace == "over":
        return rng.choice([
            f"Тратим быстрее плана: при таком темпе выйдет {money(b.forecast)} при лимите {money(b.limit)}. Пара спокойных дней всё выровняет.",
            f"Темп выше плана — прогноз {money(b.forecast)} против {money(b.limit)}. Сегодня хороший день, чтобы потратить меньше лимита.",
        ])
    category = _near_limit_category(b)
    if category:
        percent = category.spent / category.limit_amount * 100
        return rng.choice([
            f"{category.category_icon} {escape(category.category_name)}: использовано {percent:.0f}% лимита — осталось {money(category.limit_amount - category.spent)}.",
            f"Категория {category.category_icon} {escape(category.category_name)} почти исчерпана ({percent:.0f}%). Притормозим с ней.",
        ])
    comfort_limit, comfort_spent = b.group_totals("COMFORT")
    if comfort_limit and comfort_spent / comfort_limit * 100 > b.time_percent + 15:
        return rng.choice([
            f"Комфорт уже на {comfort_spent / comfort_limit * 100:.0f}% — эту неделю можно провести без кафе и доставки.",
            f"На комфорт ушло {comfort_spent / comfort_limit * 100:.0f}% лимита при {b.time_percent:.0f}% периода. Стоит чуть сбавить.",
        ])
    if b.pace == "under":
        reserve = money(b.planned_spent - b.spent)
        return rng.choice([
            f"Идём с запасом {reserve} относительно плана. Часть можно отложить в копилку 🐷",
            f"Запас к плану — {reserve}. Отличная работа, так держать!",
            f"Тратим меньше плана на {reserve}. Если так продолжится, в конце периода будет что отложить.",
        ])
    return rng.choice([
        "Всё идёт по плану — держим темп 💪",
        "Бюджет под контролем. Продолжаем в том же духе!",
        "Ровно по плану. Главное — записывать все траты 📝",
    ])


def build_morning_message(b: DayBudget) -> str:
    if not b.has_budget:
        return (
            "🌅 <b>Доброе утро!</b>\n\n"
            "Лимиты бюджета не настроены — задайте их в Настройках, и я буду каждый день считать, сколько можно потратить."
        )

    lines = ["🌅 <b>Доброе утро!</b>", ""]
    if b.remaining <= 0:
        lines.append(f"🚨 Бюджет периода превышен на <b>{money(-b.remaining)}</b>")
        lines.append(f"📅 До зарплаты: {b.days_left} {days_word(b.days_left)}")
    else:
        if b.spent_today:
            lines.append(f"💳 Сегодня можно потратить: <b>{money(max(0, b.left_today))}</b> из {money(b.daily_limit)}")
        else:
            lines.append(f"💳 Сегодня можно потратить: <b>{money(b.daily_limit)}</b>")
        lines.append(f"💰 Осталось в бюджете: {money(b.remaining)} на {b.days_left} {days_word(b.days_left)}")
        pace_line = {
            "under": "📈 Идём с запасом",
            "on": "📊 Идём по плану",
            "over": "⚠️ Тратим быстрее плана",
        }[b.pace]
        lines.append(f"{pace_line}: {_percent_line(b)}")

    if b.yesterday_in_period:
        if b.spent_yesterday == 0:
            lines.append("🗓 Вчера без трат 👏")
        elif b.spent_yesterday <= b.yesterday_limit:
            lines.append(f"🗓 Вчера: {money(b.spent_yesterday)} из {money(b.yesterday_limit)} ✅")
        else:
            lines.append(
                f"🗓 Вчера: {money(b.spent_yesterday)} при лимите {money(b.yesterday_limit)} — "
                f"перебор {money(b.spent_yesterday - b.yesterday_limit)}"
            )

    lines += ["", f"💡 {period_advice(b, _rng(b, 1))}"]
    if b.remaining > 0 and b.days_left == 1:
        lines.append("🏁 Сегодня последний день периода — завтра зарплата!")
    elif b.remaining > 0 and b.days_left <= 3:
        lines.append(f"🏁 До зарплаты {b.days_left} {days_word(b.days_left)} — финишная прямая.")
    return "\n".join(lines)


def _day_remark(b: DayBudget, rng: random.Random) -> str:
    if b.spent_today == 0:
        return rng.choice([
            "День без трат — отлично! Весь лимит переходит на следующие дни.",
            "Ноль трат за день 👏 Завтрашний лимит от этого только вырос.",
        ])
    if b.left_today < 0:
        if b.tomorrow_limit is None:
            return "Последний день периода закрыт с перебором — в новом периоде начнём с чистого листа."
        return rng.choice([
            f"Сегодня вышли за дневной лимит. Завтра постараемся уложиться в {money(b.tomorrow_limit)}.",
            f"Перебор за день — не страшно, если завтра потратить не больше {money(b.tomorrow_limit)}.",
        ])
    return rng.choice([
        "Уложились в дневной лимит — хороший день!",
        "День в рамках бюджета ✅ Так держать.",
        "Дневной лимит соблюдён, остаток работает на следующие дни.",
    ])


def build_evening_message(b: DayBudget, transactions: list[dict], ai_comment: str | None = None) -> str:
    expenses = [t for t in transactions if t["type"] == "EXPENSE" and t["group"] != "SAVINGS"]
    savings = [t for t in transactions if t["type"] == "EXPENSE" and t["group"] == "SAVINGS"]
    incomes = [t for t in transactions if t["type"] == "INCOME"]

    lines = ["🌙 <b>Итоги дня</b>", ""]
    if b.has_budget:
        if b.daily_limit:
            lines.append(f"💸 Потрачено сегодня: <b>{money(b.spent_today)}</b> из {money(b.daily_limit)}")
        else:
            lines.append(f"💸 Потрачено сегодня: <b>{money(b.spent_today)}</b>")
        if b.left_today > 0:
            lines.append(f"✅ Сэкономили {money(b.left_today)} — они переходят на следующие дни")
        elif b.left_today < 0:
            lines.append(f"⚠️ Перебор за день: {money(-b.left_today)}")
        if b.tomorrow_limit is None:
            lines.append("🎉 Завтра новый период — зарплата!")
        elif b.remaining > 0:
            days = b.days_left - 1
            lines.append(f"📅 Лимит на завтра: <b>{money(b.tomorrow_limit)}</b>")
            lines.append(f"💰 Осталось в бюджете: {money(b.remaining)} на {days} {days_word(days)}")
        else:
            lines.append(f"🚨 Бюджет периода превышен на {money(-b.remaining)}")
    else:
        total = sum(t["amount"] for t in expenses)
        lines.append(f"💸 Потрачено сегодня: <b>{money(total)}</b>")

    if expenses:
        lines += ["", "<b>Траты:</b>"]
        for t in sorted(expenses, key=lambda t: -t["amount"])[:10]:
            line = f"{t['icon']} {escape(t['name'])}: {money(t['amount'])}"
            if t.get("comment"):
                line += f" ({escape(t['comment'])})"
            lines.append(line)
        if len(expenses) > 10:
            lines.append(f"… и ещё {len(expenses) - 10}")
    if savings:
        lines.append(f"🐷 В копилку: {money(sum(t['amount'] for t in savings))}")
    if incomes:
        lines.append(f"💰 Доходы: {money(sum(t['amount'] for t in incomes))}")

    if b.has_budget:
        rng = _rng(b, 2)
        advice = _day_remark(b, rng)
        # A period-level problem matters more than praise for the day.
        if b.remaining <= 0 or _over_limit_category(b) or b.pace == "over":
            advice = period_advice(b, rng)
        lines += ["", f"💡 {advice}"]

    if ai_comment:
        lines += ["", f"<i>{escape(ai_comment)}</i>"]
    return "\n".join(lines)
