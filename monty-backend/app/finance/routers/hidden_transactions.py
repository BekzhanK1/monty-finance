"""Hidden expenses: recorded now, invisible to everyone until the author reveals them.

The global filter in `app.finance.models` hides them from every other query; only these
endpoints opt in (INCLUDE_HIDDEN), and each one is scoped to the current user's own records.
No Telegram notifications here: a message in the shared chat would give the expense away.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_db
from app.finance.models import INCLUDE_HIDDEN, Category, Transaction, User
from app.finance.routers.transactions import _build_transaction
from app.finance.schemas import TransactionCreate, TransactionResponse, TransactionUpdate
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/transactions/hidden", tags=["Transactions"])


def _own_hidden(db: Session, user: User):
    return (
        db.query(Transaction)
        .execution_options(**{INCLUDE_HIDDEN: True})
        .filter(Transaction.user_id == user.id, Transaction.is_hidden.is_(True))
    )


def _get_own_hidden(db: Session, user: User, transaction_id: str) -> Transaction:
    transaction = _own_hidden(db, user).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction


def _require_category(db: Session, category_id: int) -> Category:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


@router.get("", response_model=List[TransactionResponse])
def list_hidden(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _own_hidden(db, current_user).order_by(Transaction.transaction_date.desc()).all()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_hidden(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = _require_category(db, data.category_id)
    transaction = _build_transaction(data, current_user, category)
    transaction.is_hidden = True
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_hidden(
    transaction_id: str,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = _get_own_hidden(db, current_user, transaction_id)
    if data.category_id is not None:
        transaction.category_id = _require_category(db, data.category_id).id
    if data.amount is not None:
        transaction.amount = data.amount
    if data.comment is not None:
        transaction.comment = data.comment
    db.commit()
    db.refresh(transaction)
    return transaction


@router.post("/{transaction_id}/reveal", response_model=TransactionResponse)
def reveal_hidden(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Turn into an ordinary expense on its original purchase date, silently and without a trace."""
    transaction = _get_own_hidden(db, current_user, transaction_id)
    transaction.is_hidden = False
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hidden(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(_get_own_hidden(db, current_user, transaction_id))
    db.commit()
    return None
