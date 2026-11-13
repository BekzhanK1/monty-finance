"""Encryption at rest for journal text (Fernet = AES-128-CBC + HMAC-SHA256).

PROD requires JOURNAL_ENCRYPTION_KEY; without it journal endpoints answer 503 and the
rest of Monty keeps working. DEV/tests fall back to a fixed, public dev key.
Generate a key: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

import json
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

# Public on purpose: only ever used outside PROD.
_DEV_KEY = b"bW9udHktam91cm5hbC1kZXYta2V5LW5vdC1zZWNyZXQ="


class JournalKeyMissing(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    key = settings.JOURNAL_ENCRYPTION_KEY.strip()
    if not key:
        if settings.STAGE == "PROD":
            raise JournalKeyMissing("JOURNAL_ENCRYPTION_KEY is not set")
        return Fernet(_DEV_KEY)
    return Fernet(key.encode())


def ensure_key() -> None:
    _fernet()


def encrypt_text(text: str | None) -> str | None:
    if text is None:
        return None
    return _fernet().encrypt(text.encode("utf-8")).decode("ascii")


def decrypt_text(token: str | None) -> str | None:
    if token is None:
        return None
    try:
        return _fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("journal ciphertext cannot be decrypted with the current key") from exc


def encrypt_json(value: dict | None) -> str | None:
    return None if value is None else encrypt_text(json.dumps(value, ensure_ascii=False))


def decrypt_json(token: str | None) -> dict | None:
    text = decrypt_text(token)
    return None if text is None else json.loads(text)
