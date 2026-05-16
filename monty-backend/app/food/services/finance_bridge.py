"""Create a Finance expense from a finalized Food shopping list."""

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


def shopping_list_total_amount(lst: FoodShoppingList) -> int:
    total = Decimal(0)
    for it in lst.items or []:
        if it.actual_price is not None:
            total += Decimal(it.actual_price)
    return int(total.quantize(Decimal("1")))


def finalize_shopping_list_to_finance(
    db: Session,
    *,
    lst: FoodShoppingList,
    user_id: int,
    user_name: str,
) -> tuple[Transaction, int]:
    if lst.linked_transaction_id:
        raise HTTPException(status_code=400, detail="Список уже оформлен в Finance")

    total = shopping_list_total_amount(lst)
    if total <= 0:
        raise HTTPException(
            status_code=400,
            detail="Укажите цены на позициях списка перед оформлением в Finance",
        )

    category_id = resolve_grocery_category_id(db)
    comment = f"Food: {lst.title}"[:255]

    tx = Transaction(
        user_id=user_id,
        category_id=category_id,
        amount=total,
        comment=comment,
        transaction_date=datetime.utcnow(),
    )
    db.add(tx)
    db.flush()
    lst.status = "done"
    lst.linked_transaction_id = tx.id
    db.commit()
    db.refresh(tx)
    db.refresh(lst)
    return tx, total
