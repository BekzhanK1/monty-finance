from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_db
from app.finance.models import User
from app.journal.schemas import JournalSettingsResponse, JournalSettingsUpdate
from app.journal.services.common import get_settings
from app.journal.services.reminders import apply_user_reminder, send_reminder
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/settings")


@router.get("", response_model=JournalSettingsResponse)
def read_settings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_settings(db, user.id)


@router.put("", response_model=JournalSettingsResponse)
def update_settings(body: JournalSettingsUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.finance.services.scheduler import scheduler

    row = get_settings(db, user.id)
    for field in body.model_fields_set:
        value = getattr(body, field)
        if value is not None:
            setattr(row, field, value)
    db.commit()
    db.refresh(row)
    apply_user_reminder(scheduler, db, user.id)
    return row


@router.post("/test-reminder")
def test_reminder(user: User = Depends(get_current_user)):
    if not send_reminder(user.id, force=True):
        raise HTTPException(
            status_code=502,
            detail="Не удалось отправить. Откройте бота в Telegram и нажмите «Start», затем попробуйте снова.",
        )
    return {"status": "sent"}
