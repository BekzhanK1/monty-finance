"""Heuristics for analytics (large one-off expenses, etc.)."""

from app.finance.models import CategoryGroup, Transaction, TransactionType


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
