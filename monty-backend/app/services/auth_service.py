import hashlib
import hmac
import json
from datetime import datetime, timedelta
from typing import Optional

import httpx
from app.core.config import settings
from app.models.models import User
from jose import JWTError, jwt
from sqlalchemy.orm import Session


def parse_telegram_init_data(init_data: str) -> dict:
    from urllib.parse import unquote
    params = {}
    for item in init_data.split("&"):
        if "=" in item:
            key, value = item.split("=", 1)
            params[key] = unquote(value)
    return params


def validate_telegram_auth(init_data: str) -> Optional[dict]:
    try:
        params = parse_telegram_init_data(init_data)
        
        user_data = {}
        if "user" in params:
            user_data = json.loads(params["user"])

        return {
            "telegram_id": int(user_data.get("id", 0)),
            "first_name": user_data.get("first_name", "User"),
            "last_name": user_data.get("last_name"),
            "username": user_data.get("username"),
        }
    except Exception as e:
        print(f"[auth] validate_telegram_auth: exception while validating: {e}")
        return None


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def authenticate_telegram_user(db: Session, init_data: str) -> Optional[dict]:
    # NOTE: simplified auth for development: accept empty or invalid init_data
    telegram_data = validate_telegram_auth(init_data) if init_data else None

    if not telegram_data:
        print(
            "[auth] authenticate_telegram_user: no valid init_data, falling back to dev user"
        )
        telegram_data = {
            "telegram_id": 0,
            "first_name": "User",
            "last_name": None,
            "username": None,
        }

    telegram_id = telegram_data["telegram_id"]

    # TODO: FIX THIS FOR PRODUCTION
    # if telegram_id not in settings.allowed_telegram_ids:
    #     return None

    user = db.query(User).filter(User.telegram_id == telegram_id).first()

    if not user:
        user = User(
            telegram_id=telegram_id,
            first_name=telegram_data["first_name"],
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.first_name = telegram_data["first_name"]
        user.is_active = True
        db.commit()

    access_token = create_access_token(
        {"sub": str(user.id), "telegram_id": user.telegram_id}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "first_name": user.first_name,
    }
