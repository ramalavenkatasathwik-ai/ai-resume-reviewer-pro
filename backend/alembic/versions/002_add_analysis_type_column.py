"""add analysis_type column to analysis_history table

Revision ID: 002_analysis_type
Revises: 001_analysis_history
Create Date: 2026-10-12 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_analysis_type'
down_revision: Union[str, None] = '001_analysis_history'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('analysis_history') as batch_op:
        batch_op.add_column(
            sa.Column('analysis_type', sa.String(length=50), nullable=False, server_default='resume')
        )
        batch_op.create_index(
            'ix_analysis_history_analysis_type',
            ['analysis_type'],
            unique=False
        )


def downgrade() -> None:
    with op.batch_alter_table('analysis_history') as batch_op:
        batch_op.drop_index('ix_analysis_history_analysis_type')
        batch_op.drop_column('analysis_type')
