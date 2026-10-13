"""create users and auth tables

Revision ID: 003_users_and_auth
Revises: 002_analysis_type
Create Date: 2026-10-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_users_and_auth'
down_revision: Union[str, None] = '002_analysis_type'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_id', 'users', ['id'], unique=False)
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # 2. Create password_reset_tokens table
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_password_reset_tokens_id', 'password_reset_tokens', ['id'], unique=False)
    op.create_index('ix_password_reset_tokens_user_id', 'password_reset_tokens', ['user_id'], unique=False)
    op.create_index('ix_password_reset_tokens_token_hash', 'password_reset_tokens', ['token_hash'], unique=False)
    op.create_index(
        'ix_password_reset_tokens_lookup',
        'password_reset_tokens',
        ['token_hash', 'is_used'],
        unique=False,
    )

    # 3. Add user_id to analysis_history table with batch mode for SQLite support in tests
    with op.batch_alter_table('analysis_history') as batch_op:
        batch_op.add_column(
            sa.Column('user_id', sa.String(length=36), nullable=True)
        )
        batch_op.create_foreign_key(
            'fk_analysis_history_user_id',
            'users',
            ['user_id'],
            ['id'],
            ondelete='CASCADE',
        )
        batch_op.create_index(
            'ix_analysis_history_user_id',
            ['user_id'],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table('analysis_history') as batch_op:
        batch_op.drop_index('ix_analysis_history_user_id')
        batch_op.drop_constraint('fk_analysis_history_user_id', type_='foreignkey')
        batch_op.drop_column('user_id')

    op.drop_table('password_reset_tokens')
    op.drop_table('users')
