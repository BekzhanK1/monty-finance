import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.core.config import settings
from app.finance.services.siri_logger import append_siri_log

security = HTTPBasic()


def verify_siri_basic_auth(
    credentials: HTTPBasicCredentials = Depends(security),
) -> None:
    if not settings.SIRI_BASIC_AUTH_USERNAME or not settings.SIRI_BASIC_AUTH_PASSWORD:
        append_siri_log(
            "basic auth rejected: integration not configured",
            username=credentials.username,
        )
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
        append_siri_log(
            "basic auth failed",
            username=credentials.username,
            username_ok=username_ok,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )

    append_siri_log("basic auth ok", username=credentials.username)
