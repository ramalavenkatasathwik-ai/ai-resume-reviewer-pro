"""create job match reports table

Revision ID: 005_job_match_reports
Revises: 004_resumes_and_storage
Create Date: 2026-10-13 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_job_match_reports'
down_revision: Union[str, None] = '004_resumes_and_storage'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'job_match_reports',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('resume_id', sa.String(length=36), sa.ForeignKey('resumes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('resume_version_id', sa.String(length=36), sa.ForeignKey('resume_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('job_title', sa.String(length=255), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('job_description_raw', sa.Text(), nullable=False),
        sa.Column('extracted_requirements', sa.JSON(), nullable=False),
        sa.Column('comparison_result', sa.JSON(), nullable=False),
        sa.Column('recommendations', sa.JSON(), nullable=False),
        sa.Column('overall_score', sa.Integer(), nullable=False),
        sa.Column('required_skills_score', sa.Integer(), nullable=False),
        sa.Column('preferred_skills_score', sa.Integer(), nullable=False),
        sa.Column('experience_score', sa.Integer(), nullable=False),
        sa.Column('keyword_score', sa.Integer(), nullable=False),
        sa.Column('scoring_version', sa.String(length=50), nullable=False, server_default='v1.0'),
        sa.Column('model_name', sa.String(length=100), nullable=False, server_default='gemini-2.5-flash'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='completed'),
        sa.Column('retention_days', sa.Integer(), nullable=False, server_default='90'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_job_match_reports_id', 'job_match_reports', ['id'], unique=False)
    op.create_index('ix_job_match_reports_user_id', 'job_match_reports', ['user_id'], unique=False)
    op.create_index('ix_job_match_reports_resume_id', 'job_match_reports', ['resume_id'], unique=False)
    op.create_index('ix_job_match_reports_resume_version_id', 'job_match_reports', ['resume_version_id'], unique=False)
    op.create_index('ix_job_match_reports_job_title', 'job_match_reports', ['job_title'], unique=False)
    op.create_index('ix_job_match_reports_company_name', 'job_match_reports', ['company_name'], unique=False)
    op.create_index('ix_job_match_reports_status', 'job_match_reports', ['status'], unique=False)
    op.create_index('ix_job_match_reports_user_status', 'job_match_reports', ['user_id', 'status'], unique=False)
    op.create_index('ix_job_match_reports_user_created', 'job_match_reports', ['user_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('job_match_reports')
