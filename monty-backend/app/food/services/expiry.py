"""Stock status for the pantry: expiry wins over quantity because spoiling food is the urgent case."""

from datetime import date, datetime
from decimal import Decimal

import pytz

APP_TIMEZONE = pytz.timezone("Asia/Almaty")
EXPIRING_WITHIN_DAYS = 3


def local_today() -> date:
    return datetime.now(APP_TIMEZONE).date()


def stock_status(
    *,
    quantity: Decimal,
    min_quantity: Decimal | None,
    expires_on: date | None,
    today: date | None = None,
) -> tuple[str, int | None]:
    """(status, days until expiry). Status: expired | expiring | out | low | ok."""
    today = today or local_today()
    days_left = (expires_on - today).days if expires_on else None
    if quantity > 0 and days_left is not None:
        if days_left < 0:
            return "expired", days_left
        if days_left <= EXPIRING_WITHIN_DAYS:
            return "expiring", days_left
    if quantity <= 0:
        return "out", days_left
    if min_quantity is not None and quantity < min_quantity:
        return "low", days_left
    return "ok", days_left
