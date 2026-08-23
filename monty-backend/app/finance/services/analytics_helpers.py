"""Heuristics for analytics (large one-off expenses, etc.)."""

from typing import Optional

from app.finance.models import CategoryGroup, Transaction, TransactionType


def change_pct(current: int, previous: int) -> Optional[int]:
    if previous == 0:
        return None
    return round((current - previous) * 100 / previous)


def aggregate_by_category(transactions: list[Transaction]) -> dict[str, dict]:
    by_category: dict[str, dict] = {}
    for t in transactions:
        cat_name = t.category.name
        if cat_name not in by_category:
            by_category[cat_name] = {
                "name": cat_name,
                "icon": t.category.icon,
                "income": 0,
                "expense": 0,
                "savings": 0,
            }
        if t.category.type == TransactionType.INCOME:
            by_category[cat_name]["income"] += t.amount
        elif t.category.group == CategoryGroup.SAVINGS:
            by_category[cat_name]["savings"] += t.amount
        else:
            by_category[cat_name]["expense"] += t.amount
    return by_category


def _category_amount_and_type(row: dict) -> tuple[int, str]:
    if row["income"] > 0:
        return row["income"], "income"
    if row["savings"] > 0:
        return row["savings"], "savings"
    return row["expense"], "expense"


def category_breakdown(
    transactions: list[Transaction],
    prev_transactions: Optional[list[Transaction]] = None,
) -> list[dict]:
    current = aggregate_by_category(transactions)
    previous = aggregate_by_category(prev_transactions or [])
    items: list[dict] = []
    for row in current.values():
        amount, cat_type = _category_amount_and_type(row)
        prev_row = previous.get(row["name"])
        previous_amount = _category_amount_and_type(prev_row)[0] if prev_row else 0
        items.append({
            "name": row["name"],
            "icon": row["icon"],
            "amount": amount,
            "type": cat_type,
            "previous_amount": previous_amount,
            "change_pct": change_pct(amount, previous_amount),
        })
    items.sort(key=lambda x: x["amount"], reverse=True)
    return items


def large_one_off_expense_total(transactions: list[Transaction]) -> int:
    """
    Sum of non-savings expense transactions at or above a dynamic threshold.
    Threshold = max(30_000, 3 * median amount) when there are at least 3 such
    transactions; otherwise 30_000 only.
    """
    amounts = [
        t.amount
        for t in transactions
        if t.category.type == TransactionType.EXPENSE
        and t.category.group != CategoryGroup.SAVINGS
    ]
    if not amounts:
        return 0
    sorted_amts = sorted(amounts)
    n = len(sorted_amts)
    mid = n // 2
    if n % 2 == 1:
        median = sorted_amts[mid]
    else:
        median = (sorted_amts[mid - 1] + sorted_amts[mid]) // 2
    threshold = max(30_000, 3 * median) if n >= 3 else 30_000
    return sum(a for a in amounts if a >= threshold)
