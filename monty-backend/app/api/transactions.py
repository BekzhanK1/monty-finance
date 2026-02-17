from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.config import get_db
from app.models.models import User, Category, Transaction
from app.schemas.schemas import TransactionCreate, TransactionResponse
from app.middleware.auth import get_current_user
from app.services.database import get_financial_period

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.id == transaction_data.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    transaction = Transaction(
        user_id=current_user.id,
        category_id=transaction_data.category_id,
        amount=transaction_data.amount,
        comment=transaction_data.comment,
        transaction_date=datetime.utcnow()
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    return transaction

@router.get("", response_model=List[TransactionResponse])
def get_transactions(
    category_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    
    if start_date:
        try:
            start = datetime.fromisoformat(start_date)
            query = query.filter(Transaction.transaction_date >= start)
        except ValueError:
            pass
    
    if end_date:
        try:
            end = datetime.fromisoformat(end_date)
            query = query.filter(Transaction.transaction_date <= end)
        except ValueError:
            pass
    
    transactions = query.order_by(Transaction.transaction_date.desc()).all()
    
    return transactions
