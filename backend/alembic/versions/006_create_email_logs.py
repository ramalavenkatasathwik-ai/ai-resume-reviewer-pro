"""create email delivery logs table

Revision ID: 006_email_logs
Revises: 005_job_match_reports
Create Date: 2026-10-13 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '006_email_logs'
down_revision: Union[str, None] = '005_job_match_reports'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'email_delivery_logs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recipient_email', sa.String(length=255), nullable=False),
        sa.Column('document_type', sa.String(length=50), nullable=False),
        sa.Column('document_id', sa.String(length=36), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False, server_default='smtp'),
        sa.Column('provider_message_id', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='accepted'),
        sa.Column('error_message', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_email_delivery_logs_id', 'email_delivery_logs', ['id'], unique=False)
    op.create_index('ix_email_delivery_logs_user_id', 'email_delivery_logs', ['user_id'], unique=False)
    op.create_index('ix_email_delivery_logs_recipient_email', 'email_delivery_logs', ['recipient_email'], unique=False)
    op.create_index('ix_email_delivery_logs_document_type', 'email_delivery_logs', ['document_type'], unique=False)
    op.create_index('ix_email_delivery_logs_document_id', 'email_delivery_logs', ['document_id'], unique=False)
    op.create_index('ix_email_delivery_logs_status', 'email_delivery_logs', ['status'], unique=False)
    op.create_index('ix_email_logs_user_created', 'email_delivery_logs', ['user_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('email_delivery_logs')
