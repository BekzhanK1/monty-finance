"""food inventory: pantry location/expiry/min stock, cooked slots, shopping aisles

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Idempotent: a legacy DB may get these tables from create_all with the columns already present.
NEW_COLUMNS: dict[str, list[sa.Column]] = {
    'food_meal_slots': [
        sa.Column('cooked_at', sa.DateTime(), nullable=True),
    ],
    'food_pantry_items': [
        sa.Column('location', sa.String(length=16), server_default='pantry', nullable=False),
        sa.Column('expires_on', sa.Date(), nullable=True),
        sa.Column('min_quantity', sa.Numeric(precision=12, scale=4), nullable=True),
    ],
    'food_shopping_items': [
        sa.Column('category', sa.String(length=32), nullable=True),
        sa.Column('sources', sa.String(length=300), nullable=True),
    ],
}


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    for table, columns in NEW_COLUMNS.items():
        existing = {c['name'] for c in inspector.get_columns(table)}
        with op.batch_alter_table(table) as batch_op:
            for column in columns:
                if column.name not in existing:
                    batch_op.add_column(column)


def downgrade() -> None:
    for table, columns in NEW_COLUMNS.items():
        with op.batch_alter_table(table) as batch_op:
            for column in reversed(columns):
                batch_op.drop_column(column.name)
