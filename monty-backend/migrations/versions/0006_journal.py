"""journal: entries (encrypted text) and per-user journal settings

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0006'
down_revision: Union[str, None] = '0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(name)


def upgrade() -> None:
    # Idempotent: a legacy DB brought to baseline via create_all already has these tables.
    if not _has_table('journal_entries'):
        op.create_table(
            'journal_entries',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('entry_date', sa.Date(), nullable=False),
            sa.Column('mood', sa.SmallInteger(), nullable=True),
            sa.Column('mood_source', sa.String(8), nullable=True),
            sa.Column('content_enc', sa.Text(), nullable=True),
            sa.Column('analysis_enc', sa.Text(), nullable=True),
            sa.Column('analysis_status', sa.String(12), nullable=False, server_default='skipped'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
        )
        op.create_index('ix_journal_entries_user_id', 'journal_entries', ['user_id'])
        op.create_index('ix_journal_entries_entry_date', 'journal_entries', ['entry_date'])
    if not _has_table('journal_settings'):
        op.create_table(
            'journal_settings',
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), primary_key=True),
            sa.Column('mood_mode', sa.String(8), nullable=False, server_default='manual'),
            sa.Column('reminder_enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column('reminder_time', sa.String(5), nullable=False, server_default='21:30'),
        )


def downgrade() -> None:
    op.drop_table('journal_settings')
    op.drop_index('ix_journal_entries_entry_date', 'journal_entries')
    op.drop_index('ix_journal_entries_user_id', 'journal_entries')
    op.drop_table('journal_entries')
