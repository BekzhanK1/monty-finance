from fastapi import HTTPException, status

from app.journal.crypto import JournalKeyMissing, ensure_key


def require_journal_key() -> None:
    """Journal endpoints refuse to work (instead of storing plaintext) without a key."""
    try:
        ensure_key()
    except JournalKeyMissing:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Дневник недоступен: на сервере не задан JOURNAL_ENCRYPTION_KEY",
        )
