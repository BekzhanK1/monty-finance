"""Record a Finance expense for a completed Food shopping trip."""

from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.finance.models import Category, Transaction, TransactionType
from app.food.models import FoodShoppingList


GROCERY_CATEGORY_NAMES = ("Продукты", "Продукты и еда", "Еда")


def resolve_grocery_category_id(db: Session) -> int:
    for name in GROCERY_CATEGORY_NAMES:
        row = (
            db.query(Category)
            .filter(Category.name.ilike(name), Category.type == TransactionType.EXPENSE)
            .first()
        )
        if row:
            return row.id
    row = (
        db.query(Category)
        .filter(Category.type == TransactionType.EXPENSE)
        .order_by(Category.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=400, detail="Нет категории расходов в Finance")
    return row.id


def record_grocery_expense(
    db: Session,
    *,
    lst: FoodShoppingList,
    user_id: int,
    amount: int,
    items: list[str],
) -> tuple[Transaction, Category]:
    """Expense for a shopping trip with a receipt total. Flushes; the caller commits."""
    category = db.query(Category).filter(Category.id == resolve_grocery_category_id(db)).one()
    listed = ", ".join(items)
    tx = Transaction(
        user_id=user_id,
        category_id=category.id,
        amount=amount,
        comment=f"Покупки: {listed}"[:255],
        transaction_date=datetime.utcnow(),
    )
    db.add(tx)
    db.flush()
    lst.linked_transaction_id = tx.id
    return tx, category
