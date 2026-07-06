from datetime import datetime

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_db
from app.finance.models import Transaction, User
from app.finance.schemas import SiriExpenseRequest, SiriExpenseResponse
from app.finance.services.digest_service import send_transaction_notification
from app.finance.services.siri_expense_service import (
    CATEGORY_NOT_FOUND_MESSAGE,
    generate_expense_confirmation_message,
    match_expense_category,
)
from app.middleware.basic_auth import verify_siri_basic_auth

router = APIRouter(prefix="/integrations/siri", tags=["Integrations"])


@router.post("/expense", response_model=SiriExpenseResponse)
def siri_expense(
    body: SiriExpenseRequest,
    response: Response,
    db: Session = Depends(get_db),
    _: None = Depends(verify_siri_basic_auth),
):
    category_text = body.category_text.strip()
    if not category_text:
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        return SiriExpenseResponse(message=CATEGORY_NOT_FOUND_MESSAGE)

    user = (
        db.query(User)
        .filter(User.id == body.user_id, User.is_active.is_(True))
        .first()
    )
    if not user:
        response.status_code = status.HTTP_404_NOT_FOUND
        return SiriExpenseResponse(message="Пользователь не найден.")

    category = match_expense_category(db, category_text)
    if not category:
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        return SiriExpenseResponse(message=CATEGORY_NOT_FOUND_MESSAGE)

    transaction = Transaction(
        user_id=user.id,
        category_id=category.id,
        amount=body.amount,
        comment=category_text,
        transaction_date=datetime.utcnow(),
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    send_transaction_notification(
        db=db,
        category_icon=category.icon,
        category_name=category.name,
        amount=body.amount,
        user_name=user.first_name or "Пользователь",
        comment=category_text,
    )

    message = generate_expense_confirmation_message(
        category_name=category.name,
        category_icon=category.icon,
        amount=body.amount,
        category_text=category_text,
        user_name=user.first_name or "Пользователь",
    )
    return SiriExpenseResponse(message=message)
