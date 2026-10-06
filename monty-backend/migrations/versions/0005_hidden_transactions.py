"""transactions.is_hidden

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0005'
down_revision: Union[str, None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns() -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns("transactions")}


def upgrade() -> None:
    # Idempotent: a legacy DB may get the transactions table from create_all with this column.
    if 'is_hidden' not in _columns():
        with op.batch_alter_table('transactions') as batch_op:
            batch_op.add_column(sa.Column('is_hidden', sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade() -> None:
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.drop_column('is_hidden')
