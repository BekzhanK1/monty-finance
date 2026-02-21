from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
import io
import csv

from app.core.config import get_db
from app.models.models import User, Category, Transaction
from app.schemas.schemas import TransactionCreate, TransactionResponse, TransactionUpdate
from app.middleware.auth import get_current_user
from app.services.database import get_financial_period
from app.services.digest_service import send_transaction_notification

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
    
    send_transaction_notification(
        db=db,
        category_icon=category.icon,
        category_name=category.name,
        amount=transaction_data.amount,
        user_name=current_user.first_name or "Пользователь",
        comment=transaction_data.comment
    )
    
    return transaction

@router.get("", response_model=List[TransactionResponse])
def get_transactions(
    category_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)

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

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.join(Category).filter(
            or_(
                Transaction.comment.ilike(term),
                Category.name.ilike(term),
            )
        )

    transactions = query.order_by(Transaction.transaction_date.desc()).all()

    return transactions


@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: str,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    if data.category_id is not None:
        category = db.query(Category).filter(Category.id == data.category_id).first()
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        transaction.category_id = data.category_id
    if data.amount is not None:
        transaction.amount = data.amount
    if data.comment is not None:
        transaction.comment = data.comment

    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    db.delete(transaction)
    db.commit()
    return None


@router.get("/export/csv")
def export_transactions_csv(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).join(Category).join(User)
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
    rows = query.order_by(Transaction.transaction_date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Дата", "Категория", "Сумма", "Тип", "Кто", "Комментарий"])
    for t in rows:
        writer.writerow([
            t.transaction_date.strftime("%Y-%m-%d %H:%M"),
            t.category.name,
            t.amount,
            t.category.type.value,
            t.user.first_name or "",
            (t.comment or ""),
        ])
    output.seek(0)
    filename = f"transactions_{datetime.utcnow().strftime('%Y-%m-%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
