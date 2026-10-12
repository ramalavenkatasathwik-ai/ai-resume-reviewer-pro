"""create analysis_history table

Revision ID: 001_analysis_history
Revises: 
Create Date: 2026-10-12 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_analysis_history'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'analysis_history',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('target_role', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='completed'),
        sa.Column('overall_score', sa.Integer(), nullable=True),
        sa.Column('ats_score', sa.Integer(), nullable=True),
        sa.Column('result_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            'overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)',
            name='ck_analysis_history_overall_score',
        ),
        sa.CheckConstraint(
            'ats_score IS NULL OR (ats_score >= 0 AND ats_score <= 100)',
            name='ck_analysis_history_ats_score',
        ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_index('ix_analysis_history_id', 'analysis_history', ['id'], unique=False)
    op.create_index('ix_analysis_history_target_role', 'analysis_history', ['target_role'], unique=False)
    op.create_index('ix_analysis_history_status', 'analysis_history', ['status'], unique=False)
    op.create_index('ix_analysis_history_created_at', 'analysis_history', ['created_at'], unique=False)
    op.create_index('ix_analysis_history_target_role_status', 'analysis_history', ['target_role', 'status'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_analysis_history_target_role_status', table_name='analysis_history')
    op.drop_index('ix_analysis_history_created_at', table_name='analysis_history')
    op.drop_index('ix_analysis_history_status', table_name='analysis_history')
    op.drop_index('ix_analysis_history_target_role', table_name='analysis_history')
    op.drop_index('ix_analysis_history_id', table_name='analysis_history')
    op.drop_table('analysis_history')
