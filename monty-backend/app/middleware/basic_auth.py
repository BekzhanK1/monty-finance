import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.core.config import settings

security = HTTPBasic()


def verify_siri_basic_auth(
    credentials: HTTPBasicCredentials = Depends(security),
) -> None:
    if not settings.SIRI_BASIC_AUTH_USERNAME or not settings.SIRI_BASIC_AUTH_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Siri integration is not configured",
        )

    username_ok = secrets.compare_digest(
        credentials.username.encode("utf-8"),
        settings.SIRI_BASIC_AUTH_USERNAME.encode("utf-8"),
    )
    password_ok = secrets.compare_digest(
        credentials.password.encode("utf-8"),
        settings.SIRI_BASIC_AUTH_PASSWORD.encode("utf-8"),
    )
    if not (username_ok and password_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
