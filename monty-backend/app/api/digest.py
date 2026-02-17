from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import get_db, settings
from app.middleware.auth import get_current_user
from app.models.models import User
from app.services.digest_service import generate_ai_digest, send_digest_to_telegram

router = APIRouter(prefix="/digest", tags=["Digest"])

@router.post("/send")
def send_digest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    digest = generate_ai_digest(db)
    
    if settings.allowed_telegram_ids:
        for telegram_id in settings.allowed_telegram_ids:
            send_digest_to_telegram(digest, telegram_id)
    
    return {
        "success": True,
        "digest": digest
    }
