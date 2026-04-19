"""Best-effort additive DDL for existing DBs (project uses create_all, not Alembic)."""

from sqlalchemy import inspect, text

from app.core.config import engine


def ensure_food_dish_columns() -> None:
    """Add v2 columns to food_dishes if the table predates them."""
    insp = inspect(engine)
    if not insp.has_table("food_dishes"):
        return
    existing = {c["name"] for c in insp.get_columns("food_dishes")}
    dialect = engine.dialect.name

    def add(sql: str) -> None:
        with engine.begin() as conn:
            conn.execute(text(sql))

    if "description" not in existing:
        add("ALTER TABLE food_dishes ADD COLUMN description TEXT")

    if "servings_default" not in existing:
        add("ALTER TABLE food_dishes ADD COLUMN servings_default INTEGER NOT NULL DEFAULT 4")

    if "prep_minutes" not in existing:
        add("ALTER TABLE food_dishes ADD COLUMN prep_minutes INTEGER")

    if "cook_minutes" not in existing:
        add("ALTER TABLE food_dishes ADD COLUMN cook_minutes INTEGER")

    if "is_archived" not in existing:
        if dialect == "sqlite":
            add("ALTER TABLE food_dishes ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0")
        else:
            add("ALTER TABLE food_dishes ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE")

    if "updated_at" not in existing:
        if dialect == "sqlite":
            add("ALTER TABLE food_dishes ADD COLUMN updated_at DATETIME")
        else:
            add("ALTER TABLE food_dishes ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE")
