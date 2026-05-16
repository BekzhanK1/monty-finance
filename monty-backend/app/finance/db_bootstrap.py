"""Best-effort additive DDL for existing DBs (project uses create_all, not Alembic)."""

from sqlalchemy import inspect, text

from app.core.config import engine
from app.food.models._constants import MVP_HOUSEHOLD_ID


def ensure_users_household_id() -> None:
    """Add users.household_id and backfill existing rows."""
    insp = inspect(engine)
    if not insp.has_table("users"):
        return

    existing = {c["name"] for c in insp.get_columns("users")}

    def run(sql: str) -> None:
        with engine.begin() as conn:
            conn.execute(text(sql))

    if "household_id" not in existing:
        run(
            f"ALTER TABLE users ADD COLUMN household_id INTEGER NOT NULL DEFAULT {MVP_HOUSEHOLD_ID}"
        )

    run(f"UPDATE users SET household_id = {MVP_HOUSEHOLD_ID} WHERE household_id IS NULL")
