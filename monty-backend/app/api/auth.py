from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.config import get_db
from app.services.auth_service import authenticate_telegram_user
from app.middleware.auth import get_current_user
from app.models.models import User

router = APIRouter(prefix="/auth", tags=["Auth"])

class TelegramAuthRequest(BaseModel):
    initData: str

class TelegramAuthResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    first_name: str

@router.post("/telegram", response_model=TelegramAuthResponse)
def telegram_auth(
    request: TelegramAuthRequest,
    db: Session = Depends(get_db)
):
    result = authenticate_telegram_user(db, request.initData)
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Telegram credentials or user not allowed"
        )
    
    return result

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "user_id": current_user.id,
        "telegram_id": current_user.telegram_id,
        "first_name": current_user.first_name,
        "is_active": current_user.is_active
    }
