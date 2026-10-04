from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_db
from app.finance.models import User
from app.finance.schemas import VoiceDraft, VoiceParseResponse
from app.finance.services.expense_parser import (
    ExpenseParseError,
    parse_expenses,
    transcribe_audio,
)
from app.finance.services.siri_logger import SiriLog
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/voice", tags=["Voice"])

# ~1 minute of compressed speech; the client caps recordings well below this.
MAX_AUDIO_BYTES = 5 * 1024 * 1024
MAX_TEXT_LENGTH = 500


@router.post("/parse", response_model=VoiceParseResponse)
def parse_voice(
    audio: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Audio or typed text → transaction drafts. Nothing is saved; the client confirms via /transactions/bulk."""
    log = SiriLog()
    log.info("voice parse requested", user_id=current_user.id, has_audio=audio is not None)

    try:
        if audio is not None:
            content = audio.file.read(MAX_AUDIO_BYTES + 1)
            if len(content) > MAX_AUDIO_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Запись слишком длинная. Попробуйте короче.",
                )
            if not content:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Пустая запись.")
            raw_text = transcribe_audio(
                content,
                audio.filename or "voice.webm",
                audio.content_type or "audio/webm",
                log=log,
            )
        else:
            raw_text = (text or "").strip()
            if not raw_text:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Нужна запись или текст, например «500 бензин».",
                )

        raw_text = raw_text[:MAX_TEXT_LENGTH]
        parsed = parse_expenses(db, raw_text, log=log, include_income=True)
    except ExpenseParseError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.message) from exc

    return VoiceParseResponse(
        text=raw_text,
        drafts=[
            VoiceDraft(
                amount=item.amount,
                category_id=item.category.id,
                category_name=item.category.name,
                category_icon=item.category.icon,
                type=item.category.type.value,
                comment=item.comment,
                transaction_date=item.local_date,
            )
            for item in parsed
        ],
    )
