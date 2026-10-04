"""baseline: schema as it existed before Alembic (create_all + db_bootstrap era)

Revision ID: 0001
Revises: 
Create Date: 2026-10-04 05:33:28.430237

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('categories',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=50), nullable=False),
    sa.Column('group', sa.Enum('BASE', 'COMFORT', 'SAVINGS', 'INCOME', name='categorygroup'), nullable=False),
    sa.Column('type', sa.Enum('EXPENSE', 'INCOME', name='transactiontype'), nullable=False),
    sa.Column('icon', sa.String(length=10), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('categories', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_categories_id'), ['id'], unique=False)

    op.create_table('food_meal_categories',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('household_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('food_meal_categories', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_food_meal_categories_household_id'), ['household_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_food_meal_categories_id'), ['id'], unique=False)

    op.create_table('food_reminder_sent',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('household_id', sa.Integer(), nullable=False),
    sa.Column('reminder_date', sa.Date(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('household_id', 'reminder_date', name='uq_food_reminder_household_date')
    )
    with op.batch_alter_table('food_reminder_sent', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_food_reminder_sent_household_id'), ['household_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_food_reminder_sent_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_food_reminder_sent_reminder_date'), ['reminder_date'], unique=False)

    op.create_table('food_shopping_lists',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('household_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('period_start', sa.Date(), nullable=True),
    sa.Column('period_end', sa.Date(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('linked_transaction_id', sa.String(length=36), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('food_shopping_lists', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_food_shopping_lists_household_id'), ['household_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_food_shopping_lists_id'), ['id'], unique=False)

    op.create_table('food_units',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('code', sa.String(length=32), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=False),
    sa.Column('system', sa.String(length=20), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('food_units', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_food_units_code'), ['code'], unique=True)
        batch_op.create_index(batch_op.f('ix_food_units_id'), ['id'], unique=False)

    op.create_table('settings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('key', sa.String(length=50), nullable=False),
    sa.Column('value', sa.String(length=255), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('key')
    )
    with op.batch_alter_table('settings', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_settings_id'), ['id'], unique=False)

    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('telegram_id', sa.BigInteger(), nullable=False),
    sa.Column('first_name', sa.String(length=100), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('household_id', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_users_household_id'), ['household_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_users_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_users_telegram_id'), ['telegram_id'], unique=True)

    op.create_table('food_dishes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('household_id', sa.Integer(), nullable=False),
    sa.Column('meal_category_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('recipe_text', sa.Text(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('servings_default', sa.Integer(), nullable=False),
    sa.Column('prep_minutes', sa.Integer(), nullable=True),
    sa.Column('cook_minutes', sa.Integer(), nullable=True),
    sa.Column('is_archived', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['meal_category_id'], ['food_meal_categories.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('food_dishes', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_food_dishes_household_id'), ['household_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_food_dishes_id'), ['id'], unique=False)

    op.create_table('food_ingredients',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('household_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('default_unit_id', sa.Integer(), nullable=False),
    sa.Column('category', sa.String(length=64), nullable=True),
    sa.Column('notes', sa.String(length=500), nullable=True),
    sa.Column('is_pantry_default', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['default_unit_id'], ['food_units.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('food_ingredients', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_food_ingredients_household_id'), ['household_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_food_ingredients_id'), ['id'], unique=False)

    op.create_table('monthly_budgets',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('category_id', sa.Integer(), nullable=False),
    sa.Column('period', sa.Date(), nullable=False),
    sa.Column('limit_amount', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('monthly_budgets', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_monthly_budgets_id'), ['id'], unique=False)

    op.create_table('transactions',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('category_id', sa.Integer(), nullable=False),
    sa.Column('amount', sa.Integer(), nullable=False),
    sa.Column('transaction_date', sa.DateTime(), nullable=True),
    sa.Column('comment', sa.String(length=255), nullable=True),
    sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('food_dish_ingredients',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('dish_id', sa.Integer(), nullable=False),
    sa.Column('ingredient_id', sa.Integer(), nullable=False),
    sa.Column('quantity', sa.Numeric(precision=12, scale=4), nullable=False),
    sa.Column('unit_id', sa.Integer(), nullable=False),
    sa.Column('is_optional', sa.Boolean(), nullable=False),
    sa.Column('note', sa.String(length=500), nullable=True),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['dish_id'], ['food_dishes.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['ingredient_id'], ['food_ingredients.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['unit_id'], ['food_units.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('food_dish_ingredients', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_food_dish_ingredients_dish_id'), ['dish_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_food_dish_ingredients_id'), ['id'], unique=False)

    op.create_table('food_meal_slots',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('household_id', sa.Integer(), nullable=False),
    sa.Column('slot_date', sa.Date(), nullable=False),
    sa.Column('slot_key', sa.String(length=32), nullable=False),
    sa.Column('dish_id', sa.Integer(), nullable=True),
    sa.Column('custom_title', sa.String(length=200), nullable=True),
    sa.Column('servings', sa.Integer(), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['dish_id'], ['food_dishes.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('food_meal_slots', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_food_meal_slots_household_id'), ['household_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_food_meal_slots_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_food_meal_slots_slot_date'), ['slot_date'], unique=False)
        batch_op.create_index(batch_op.f('ix_food_meal_slots_slot_key'), ['slot_key'], unique=False)

    op.create_table('food_pantry_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('household_id', sa.Integer(), nullable=False),
    sa.Column('ingredient_id', sa.Integer(), nullable=False),
    sa.Column('quantity', sa.Numeric(precision=12, scale=4), nullable=False),
    sa.Column('unit_id', sa.Integer(), nullable=False),
    sa.Column('note', sa.String(length=500), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['ingredient_id'], ['food_ingredients.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['unit_id'], ['food_units.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('household_id', 'ingredient_id', name='uq_food_pantry_household_ingredient')
    )
    with op.batch_alter_table('food_pantry_items', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_food_pantry_items_household_id'), ['household_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_food_pantry_items_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_food_pantry_items_ingredient_id'), ['ingredient_id'], unique=False)

    op.create_table('food_shopping_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('list_id', sa.Integer(), nullable=False),
    sa.Column('ingredient_id', sa.Integer(), nullable=True),
    sa.Column('label', sa.String(length=200), nullable=False),
    sa.Column('quantity', sa.Numeric(precision=12, scale=4), nullable=True),
    sa.Column('unit_id', sa.Integer(), nullable=True),
    sa.Column('checked', sa.Boolean(), nullable=False),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('actual_price', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('pantry_applied_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['ingredient_id'], ['food_ingredients.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['list_id'], ['food_shopping_lists.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['unit_id'], ['food_units.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('food_shopping_items', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_food_shopping_items_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_food_shopping_items_list_id'), ['list_id'], unique=False)



def downgrade() -> None:
    with op.batch_alter_table('food_shopping_items', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_food_shopping_items_list_id'))
        batch_op.drop_index(batch_op.f('ix_food_shopping_items_id'))

    op.drop_table('food_shopping_items')
    with op.batch_alter_table('food_pantry_items', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_food_pantry_items_ingredient_id'))
        batch_op.drop_index(batch_op.f('ix_food_pantry_items_id'))
        batch_op.drop_index(batch_op.f('ix_food_pantry_items_household_id'))

    op.drop_table('food_pantry_items')
    with op.batch_alter_table('food_meal_slots', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_food_meal_slots_slot_key'))
        batch_op.drop_index(batch_op.f('ix_food_meal_slots_slot_date'))
        batch_op.drop_index(batch_op.f('ix_food_meal_slots_id'))
        batch_op.drop_index(batch_op.f('ix_food_meal_slots_household_id'))

    op.drop_table('food_meal_slots')
    with op.batch_alter_table('food_dish_ingredients', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_food_dish_ingredients_id'))
        batch_op.drop_index(batch_op.f('ix_food_dish_ingredients_dish_id'))

    op.drop_table('food_dish_ingredients')
    op.drop_table('transactions')
    with op.batch_alter_table('monthly_budgets', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_monthly_budgets_id'))

    op.drop_table('monthly_budgets')
    with op.batch_alter_table('food_ingredients', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_food_ingredients_id'))
        batch_op.drop_index(batch_op.f('ix_food_ingredients_household_id'))

    op.drop_table('food_ingredients')
    with op.batch_alter_table('food_dishes', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_food_dishes_id'))
        batch_op.drop_index(batch_op.f('ix_food_dishes_household_id'))

    op.drop_table('food_dishes')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_telegram_id'))
        batch_op.drop_index(batch_op.f('ix_users_id'))
        batch_op.drop_index(batch_op.f('ix_users_household_id'))

    op.drop_table('users')
    with op.batch_alter_table('settings', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_settings_id'))

    op.drop_table('settings')
    with op.batch_alter_table('food_units', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_food_units_id'))
        batch_op.drop_index(batch_op.f('ix_food_units_code'))

    op.drop_table('food_units')
    with op.batch_alter_table('food_shopping_lists', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_food_shopping_lists_id'))
        batch_op.drop_index(batch_op.f('ix_food_shopping_lists_household_id'))

    op.drop_table('food_shopping_lists')
    with op.batch_alter_table('food_reminder_sent', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_food_reminder_sent_reminder_date'))
        batch_op.drop_index(batch_op.f('ix_food_reminder_sent_id'))
        batch_op.drop_index(batch_op.f('ix_food_reminder_sent_household_id'))

    op.drop_table('food_reminder_sent')
    with op.batch_alter_table('food_meal_categories', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_food_meal_categories_id'))
        batch_op.drop_index(batch_op.f('ix_food_meal_categories_household_id'))

    op.drop_table('food_meal_categories')
    with op.batch_alter_table('categories', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_categories_id'))

    op.drop_table('categories')
