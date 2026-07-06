from datetime import datetime

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_db, settings
from app.finance.models import Transaction, User
from app.finance.schemas import SiriExpenseRequest, SiriExpenseResponse
from app.finance.services.digest_service import send_transaction_notification
from app.finance.services.siri_expense_service import (
    CATEGORY_NOT_FOUND_MESSAGE,
    generate_expense_confirmation_message,
    match_expense_category,
)
from app.finance.services.siri_logger import SiriLog
from app.middleware.basic_auth import verify_siri_basic_auth

router = APIRouter(prefix="/integrations/siri", tags=["Integrations"])


@router.post("/expense", response_model=SiriExpenseResponse)
def siri_expense(
    body: SiriExpenseRequest,
    response: Response,
    db: Session = Depends(get_db),
    _: None = Depends(verify_siri_basic_auth),
):
    log = SiriLog()
    log.info(
        "request received",
        endpoint="/integrations/siri/expense",
        body=body.model_dump(),
        stage=settings.STAGE,
        database_url_host=(
            settings.DATABASE_URL.split("@")[-1].split("/")[0]
            if "@" in settings.DATABASE_URL
            else settings.DATABASE_URL
        ),
    )

    try:
        category_text = body.category_text.strip()
        if not category_text:
            response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
            result = SiriExpenseResponse(message=CATEGORY_NOT_FOUND_MESSAGE)
            log.info(
                "rejected empty category_text",
                http_status=response.status_code,
                response=result.model_dump(),
            )
            return result

        user = (
            db.query(User)
            .filter(User.id == body.user_id, User.is_active.is_(True))
            .first()
        )
        if not user:
            response.status_code = status.HTTP_404_NOT_FOUND
            result = SiriExpenseResponse(message="Пользователь не найден.")
            log.info(
                "user not found",
                user_id=body.user_id,
                http_status=response.status_code,
                response=result.model_dump(),
            )
            return result

        log.info(
            "user resolved",
            user_id=user.id,
            user_name=user.first_name,
            household_id=user.household_id,
        )

        category = match_expense_category(db, category_text, log=log)
        if not category:
            response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
            result = SiriExpenseResponse(message=CATEGORY_NOT_FOUND_MESSAGE)
            log.info(
                "category not matched",
                category_text=category_text,
                http_status=response.status_code,
                response=result.model_dump(),
            )
            return result

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

        log.info(
            "transaction saved",
            transaction_id=transaction.id,
            user_id=transaction.user_id,
            category_id=transaction.category_id,
            amount=transaction.amount,
            comment=transaction.comment,
            transaction_date=transaction.transaction_date.isoformat(),
        )

        notification_sent = send_transaction_notification(
            db=db,
            category_icon=category.icon,
            category_name=category.name,
            amount=body.amount,
            user_name=user.first_name or "Пользователь",
            comment=category_text,
        )
        log.info("telegram notification", sent=notification_sent)

        message = generate_expense_confirmation_message(
            category_name=category.name,
            category_icon=category.icon,
            amount=body.amount,
            category_text=category_text,
            user_name=user.first_name or "Пользователь",
            log=log,
        )
        result = SiriExpenseResponse(message=message)
        log.info(
            "request completed",
            http_status=200,
            response=result.model_dump(),
        )
        return result
    except Exception as exc:
        db.rollback()
        log.error("unexpected failure", exc=exc)
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return SiriExpenseResponse(
            message="Произошла ошибка при записи расхода. Попробуйте ещё раз."
        )
