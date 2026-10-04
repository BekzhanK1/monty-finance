"""transactions.source and transactions.raw_text

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns() -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns("transactions")}


def upgrade() -> None:
    # Idempotent: a legacy DB may get the transactions table from create_all with these columns.
    existing = _columns()
    with op.batch_alter_table('transactions') as batch_op:
        if 'source' not in existing:
            batch_op.add_column(sa.Column('source', sa.String(length=16), server_default='manual', nullable=False))
        if 'raw_text' not in existing:
            batch_op.add_column(sa.Column('raw_text', sa.String(length=500), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.drop_column('raw_text')
        batch_op.drop_column('source')
