from datetime import datetime

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_db, settings
from app.finance.models import Transaction, User
from app.finance.schemas import SiriExpenseRequest, SiriExpenseResponse
from app.finance.services.digest_service import send_transaction_notification
from app.finance.services.siri_expense_service import (
    SiriParseError,
    generate_expense_confirmation_message,
    parse_siri_expenses,
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
        raw_text = body.raw_text.strip()
        if not raw_text:
            response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
            result = SiriExpenseResponse(
                message="Не понял запрос. Скажите, например: «500 бензин»."
            )
            log.info(
                "rejected empty raw_text",
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

        try:
            parsed_items = parse_siri_expenses(db, raw_text, log=log)
        except SiriParseError as exc:
            response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
            result = SiriExpenseResponse(message=exc.message)
            log.info(
                "parse failed",
                raw_text=raw_text,
                http_status=response.status_code,
                response=result.model_dump(),
            )
            return result

        saved_transactions: list[Transaction] = []
        for item in parsed_items:
            transaction = Transaction(
                user_id=user.id,
                category_id=item.category.id,
                amount=item.amount,
                comment=item.comment,
                transaction_date=datetime.utcnow(),
            )
            db.add(transaction)
            saved_transactions.append(transaction)

        db.commit()

        for transaction, item in zip(saved_transactions, parsed_items, strict=True):
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
                category_icon=item.category.icon,
                category_name=item.category.name,
                amount=item.amount,
                user_name=user.first_name or "Пользователь",
                comment=item.comment,
            )
            log.info(
                "telegram notification",
                transaction_id=transaction.id,
                sent=notification_sent,
            )

        message = generate_expense_confirmation_message(
            saved_items=parsed_items,
            raw_text=raw_text,
            user_name=user.first_name or "Пользователь",
            log=log,
        )
        result = SiriExpenseResponse(message=message)
        log.info(
            "request completed",
            http_status=200,
            transactions_count=len(parsed_items),
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
