"""Run Alembic migrations on startup.

Databases created before Alembic (create_all + db_bootstrap) have no
`alembic_version` table: they are brought up to the baseline with the old
bootstrap helpers, stamped as `0001`, and then upgraded like any other DB.
"""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.core.config import Base, engine

BASELINE_REVISION = "0001"
BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _alembic_config() -> Config:
    cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_ROOT / "migrations"))
    cfg.attributes["skip_logging_config"] = True
    return cfg


def _is_legacy_database() -> bool:
    insp = inspect(engine)
    return insp.has_table("users") and not insp.has_table("alembic_version")


def _bring_legacy_database_to_baseline() -> None:
    from app.finance.db_bootstrap import ensure_users_household_id
    from app.food.db_bootstrap import (
        ensure_food_dish_columns,
        ensure_food_ingredient_columns,
        ensure_food_shopping_columns,
    )

    import app.models  # noqa: F401 — register all ORM tables on Base.metadata

    # Tables that never existed are created; existing tables are left as is.
    Base.metadata.create_all(bind=engine)
    ensure_users_household_id()
    ensure_food_dish_columns()
    ensure_food_ingredient_columns()
    ensure_food_shopping_columns()


def run_migrations() -> None:
    cfg = _alembic_config()
    if _is_legacy_database():
        _bring_legacy_database_to_baseline()
        command.stamp(cfg, BASELINE_REVISION)
    command.upgrade(cfg, "head")
