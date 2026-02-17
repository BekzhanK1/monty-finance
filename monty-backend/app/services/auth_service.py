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
    params = {}
    for item in init_data.split("&"):
        if "=" in item:
            key, value = item.split("=", 1)
            params[key] = value
    return params


def validate_telegram_auth(init_data: str) -> Optional[dict]:
    try:
        params = parse_telegram_init_data(init_data)
        print("[auth] raw init_data length:", len(init_data))
        print("[auth] parsed params keys:", sorted(list(params.keys())))

        if "hash" not in params:
            print("[auth] validate_telegram_auth: no hash in params")
            return None

        hash_from_telegram = params.pop("hash")
        
        # Remove signature from validation (it's for third-party, not for bot validation)
        params.pop("signature", None)

        data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(params.items())])
        
        print("[auth] data_check_string (first 200 chars):", data_check_string[:200])
        print("[auth] hash from telegram:", hash_from_telegram)
        print("[auth] bot token length:", len(settings.TELEGRAM_BOT_TOKEN))

        secret_key = hashlib.sha256(settings.TELEGRAM_BOT_TOKEN.encode()).digest()
        hash_result = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()
        
        print("[auth] calculated hash:", hash_result)
        print("[auth] hashes match:", hash_result == hash_from_telegram)

        if hash_result != hash_from_telegram:
            print("[auth] validate_telegram_auth: hash mismatch")
            return None

        auth_date = int(params.get("auth_date", 0))
        if datetime.now().timestamp() - auth_date > 86400:
            print("[auth] validate_telegram_auth: auth_date too old")
            return None

        user_data = {}
        if "user" in params:
            user_json = params["user"]
            user_data = json.loads(user_json)

        return {
            "telegram_id": int(params.get("user_id", 0)),
            "first_name": user_data.get("first_name", "User"),
            "last_name": user_data.get("last_name"),
            "username": user_data.get("username"),
        }
    except Exception:
        print("[auth] validate_telegram_auth: exception while validating")
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
