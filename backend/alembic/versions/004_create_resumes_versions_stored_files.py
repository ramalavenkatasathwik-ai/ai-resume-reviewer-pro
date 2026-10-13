"""create resumes versions and stored files tables

Revision ID: 004_resumes_and_storage
Revises: 003_users_and_auth
Create Date: 2026-10-13 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_resumes_and_storage'
down_revision: Union[str, None] = '003_users_and_auth'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create stored_files table
    op.create_table(
        'stored_files',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('storage_key', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('purpose', sa.String(length=50), nullable=False, server_default='linkedin_pdf'),
        sa.Column('storage_provider', sa.String(length=50), nullable=False, server_default='local'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_stored_files_id', 'stored_files', ['id'], unique=False)
    op.create_index('ix_stored_files_user_id', 'stored_files', ['user_id'], unique=False)
    op.create_index('ix_stored_files_storage_key', 'stored_files', ['storage_key'], unique=True)
    op.create_index('ix_stored_files_purpose', 'stored_files', ['purpose'], unique=False)
    op.create_index('ix_stored_files_is_deleted', 'stored_files', ['is_deleted'], unique=False)
    op.create_index('ix_stored_files_user_purpose', 'stored_files', ['user_id', 'purpose', 'is_deleted'], unique=False)

    # 2. Create resumes table
    op.create_table(
        'resumes',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('target_role', sa.String(length=100), nullable=False, server_default='AI Developer'),
        sa.Column('current_version_id', sa.String(length=36), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_resumes_id', 'resumes', ['id'], unique=False)
    op.create_index('ix_resumes_user_id', 'resumes', ['user_id'], unique=False)
    op.create_index('ix_resumes_target_role', 'resumes', ['target_role'], unique=False)
    op.create_index('ix_resumes_is_archived', 'resumes', ['is_archived'], unique=False)
    op.create_index('ix_resumes_user_archived', 'resumes', ['user_id', 'is_archived'], unique=False)

    # 3. Create resume_versions table
    op.create_table(
        'resume_versions',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('resume_id', sa.String(length=36), sa.ForeignKey('resumes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('resume_data', sa.JSON(), nullable=False),
        sa.Column('template_name', sa.String(length=50), nullable=False, server_default='modern'),
        sa.Column('page_format', sa.String(length=20), nullable=False, server_default='letter'),
        sa.Column('source_analysis_id', sa.String(length=36), sa.ForeignKey('analysis_history.id', ondelete='SET NULL'), nullable=True),
        sa.Column('job_description_metadata', sa.JSON(), nullable=True),
        sa.Column('version_notes', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('resume_id', 'version_number', name='uq_resume_version_number'),
    )
    op.create_index('ix_resume_versions_id', 'resume_versions', ['id'], unique=False)
    op.create_index('ix_resume_versions_resume_id', 'resume_versions', ['resume_id'], unique=False)
    op.create_index('ix_resume_versions_user_id', 'resume_versions', ['user_id'], unique=False)
    op.create_index('ix_resume_versions_source_analysis_id', 'resume_versions', ['source_analysis_id'], unique=False)
    op.create_index('ix_resume_versions_resume_version', 'resume_versions', ['resume_id', 'version_number'], unique=False)

    # 4. Add Phase 7 columns to analysis_history table with batch mode
    with op.batch_alter_table('analysis_history') as batch_op:
        batch_op.add_column(sa.Column('source_type', sa.String(length=50), nullable=False, server_default='pdf'))
        batch_op.add_column(sa.Column('model_name', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('prompt_version', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('llm_usage', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('estimated_cost', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('error_category', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('error_message', sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('stored_file_id', sa.String(length=36), nullable=True))
        batch_op.create_foreign_key(
            'fk_analysis_history_stored_file_id',
            'stored_files',
            ['stored_file_id'],
            ['id'],
            ondelete='SET NULL',
        )
        batch_op.create_index('ix_analysis_history_source_type', ['source_type'], unique=False)
        batch_op.create_index('ix_analysis_history_stored_file_id', ['stored_file_id'], unique=False)
        batch_op.create_index('ix_analysis_history_user_status', ['user_id', 'status'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('analysis_history') as batch_op:
        batch_op.drop_index('ix_analysis_history_user_status')
        batch_op.drop_index('ix_analysis_history_stored_file_id')
        batch_op.drop_index('ix_analysis_history_source_type')
        batch_op.drop_constraint('fk_analysis_history_stored_file_id', type_='foreignkey')
        batch_op.drop_column('stored_file_id')
        batch_op.drop_column('completed_at')
        batch_op.drop_column('error_message')
        batch_op.drop_column('error_category')
        batch_op.drop_column('estimated_cost')
        batch_op.drop_column('llm_usage')
        batch_op.drop_column('prompt_version')
        batch_op.drop_column('model_name')
        batch_op.drop_column('source_type')

    op.drop_table('resume_versions')
    op.drop_table('resumes')
    op.drop_table('stored_files')
