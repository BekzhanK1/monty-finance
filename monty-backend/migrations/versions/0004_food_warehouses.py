"""food warehouses: stock per warehouse, transfers, stock movement journal

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-04

Existing stock moves into a default warehouse «Дом» per household and is recorded
in the journal as opening balances, so movements always add up to the stock.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_UNIQUE = 'uq_food_pantry_household_ingredient'
NEW_UNIQUE = 'uq_food_pantry_warehouse_ingredient'


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade() -> None:
    bind = op.get_bind()
    insp = _inspector()

    if not insp.has_table('food_warehouses'):
        op.create_table(
            'food_warehouses',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('household_id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('emoji', sa.String(length=16), server_default='🏠', nullable=False),
            sa.Column('is_default', sa.Boolean(), server_default=sa.false(), nullable=False),
            sa.Column('is_archived', sa.Boolean(), server_default=sa.false(), nullable=False),
            sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_food_warehouses_id'), 'food_warehouses', ['id'], unique=False)
        op.create_index(op.f('ix_food_warehouses_household_id'), 'food_warehouses', ['household_id'], unique=False)

    # One default warehouse per household that already has users or food data.
    households = set()
    for table in ('users', 'food_pantry_items', 'food_ingredients'):
        if insp.has_table(table):
            households |= {r[0] for r in bind.execute(sa.text(f'SELECT DISTINCT household_id FROM {table}'))}
    for household_id in sorted(h for h in households if h is not None):
        exists = bind.execute(
            sa.text('SELECT 1 FROM food_warehouses WHERE household_id = :h'), {'h': household_id}
        ).first()
        if not exists:
            bind.execute(
                sa.text("INSERT INTO food_warehouses (household_id, name, emoji, is_default, is_archived, sort_order, created_at) "
                        "VALUES (:h, 'Дом', '🏠', :t, :f, 0, CURRENT_TIMESTAMP)"),
                {'h': household_id, 't': True, 'f': False},
            )

    pantry_cols = {c['name'] for c in insp.get_columns('food_pantry_items')}
    if 'warehouse_id' not in pantry_cols:
        with op.batch_alter_table('food_pantry_items') as batch_op:
            batch_op.add_column(sa.Column('warehouse_id', sa.Integer(), nullable=True))
    bind.execute(sa.text(
        'UPDATE food_pantry_items SET warehouse_id = ('
        '  SELECT w.id FROM food_warehouses w'
        '  WHERE w.household_id = food_pantry_items.household_id AND w.is_default = :t'
        '  ORDER BY w.id LIMIT 1'
        ') WHERE warehouse_id IS NULL'
    ), {'t': True})

    insp = _inspector()
    uniques = {u['name'] for u in insp.get_unique_constraints('food_pantry_items')}
    indexes = {i['name'] for i in insp.get_indexes('food_pantry_items')}
    fks = insp.get_foreign_keys('food_pantry_items')
    has_fk = any(fk['referred_table'] == 'food_warehouses' for fk in fks)
    with op.batch_alter_table('food_pantry_items') as batch_op:
        batch_op.alter_column('warehouse_id', existing_type=sa.Integer(), nullable=False)
        if OLD_UNIQUE in uniques:
            batch_op.drop_constraint(OLD_UNIQUE, type_='unique')
        if NEW_UNIQUE not in uniques:
            batch_op.create_unique_constraint(NEW_UNIQUE, ['warehouse_id', 'ingredient_id'])
        if 'ix_food_pantry_items_warehouse_id' not in indexes:
            batch_op.create_index('ix_food_pantry_items_warehouse_id', ['warehouse_id'], unique=False)
        if not has_fk:
            batch_op.create_foreign_key('fk_food_pantry_items_warehouse_id', 'food_warehouses', ['warehouse_id'], ['id'])

    insp = _inspector()
    if not insp.has_table('food_stock_transfers'):
        op.create_table(
            'food_stock_transfers',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('household_id', sa.Integer(), nullable=False),
            sa.Column('number', sa.Integer(), nullable=False),
            sa.Column('from_warehouse_id', sa.Integer(), nullable=False),
            sa.Column('to_warehouse_id', sa.Integer(), nullable=False),
            sa.Column('comment', sa.String(length=300), nullable=True),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('cancelled_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['from_warehouse_id'], ['food_warehouses.id']),
            sa.ForeignKeyConstraint(['to_warehouse_id'], ['food_warehouses.id']),
            sa.ForeignKeyConstraint(['user_id'], ['users.id']),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_food_stock_transfers_id'), 'food_stock_transfers', ['id'], unique=False)
        op.create_index(op.f('ix_food_stock_transfers_household_id'), 'food_stock_transfers', ['household_id'], unique=False)

    if not insp.has_table('food_stock_transfer_lines'):
        op.create_table(
            'food_stock_transfer_lines',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('transfer_id', sa.Integer(), nullable=False),
            sa.Column('ingredient_id', sa.Integer(), nullable=False),
            sa.Column('quantity', sa.Numeric(precision=12, scale=4), nullable=False),
            sa.Column('unit_id', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['ingredient_id'], ['food_ingredients.id']),
            sa.ForeignKeyConstraint(['transfer_id'], ['food_stock_transfers.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['unit_id'], ['food_units.id']),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_food_stock_transfer_lines_id'), 'food_stock_transfer_lines', ['id'], unique=False)
        op.create_index(op.f('ix_food_stock_transfer_lines_transfer_id'), 'food_stock_transfer_lines', ['transfer_id'], unique=False)

    if not insp.has_table('food_stock_movements'):
        op.create_table(
            'food_stock_movements',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('household_id', sa.Integer(), nullable=False),
            sa.Column('warehouse_id', sa.Integer(), nullable=False),
            sa.Column('ingredient_id', sa.Integer(), nullable=False),
            sa.Column('quantity', sa.Numeric(precision=12, scale=4), nullable=False),
            sa.Column('unit_id', sa.Integer(), nullable=False),
            sa.Column('kind', sa.String(length=20), nullable=False),
            sa.Column('transfer_id', sa.Integer(), nullable=True),
            sa.Column('note', sa.String(length=200), nullable=True),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['ingredient_id'], ['food_ingredients.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['transfer_id'], ['food_stock_transfers.id']),
            sa.ForeignKeyConstraint(['unit_id'], ['food_units.id']),
            sa.ForeignKeyConstraint(['user_id'], ['users.id']),
            sa.ForeignKeyConstraint(['warehouse_id'], ['food_warehouses.id']),
            sa.PrimaryKeyConstraint('id'),
        )
        for col in ('id', 'household_id', 'warehouse_id', 'ingredient_id', 'created_at'):
            op.create_index(op.f(f'ix_food_stock_movements_{col}'), 'food_stock_movements', [col], unique=False)
        # Opening balances for stock that existed before the journal.
        bind.execute(sa.text(
            "INSERT INTO food_stock_movements (household_id, warehouse_id, ingredient_id, quantity, unit_id, kind, note, created_at) "
            "SELECT household_id, warehouse_id, ingredient_id, quantity, unit_id, 'receipt', 'Начальные остатки', CURRENT_TIMESTAMP "
            "FROM food_pantry_items WHERE quantity > 0"
        ))


def downgrade() -> None:
    op.drop_table('food_stock_movements')
    op.drop_table('food_stock_transfer_lines')
    op.drop_table('food_stock_transfers')
    # Collapse stock back to one row per household and ingredient (keeps the default warehouse's rows).
    bind = op.get_bind()
    bind.execute(sa.text(
        'DELETE FROM food_pantry_items WHERE warehouse_id NOT IN '
        '(SELECT id FROM food_warehouses WHERE is_default = :t)'
    ), {'t': True})
    with op.batch_alter_table('food_pantry_items') as batch_op:
        batch_op.drop_constraint(NEW_UNIQUE, type_='unique')
        batch_op.create_unique_constraint(OLD_UNIQUE, ['household_id', 'ingredient_id'])
        batch_op.drop_index('ix_food_pantry_items_warehouse_id')
        batch_op.drop_column('warehouse_id')
    op.drop_table('food_warehouses')
