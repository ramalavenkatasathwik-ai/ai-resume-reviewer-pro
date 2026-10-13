"""create career intelligence tables
Revision ID: 007_career_intelligence
Revises: 006_email_logs
Create Date: 2026-10-13 23:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '007_career_intelligence'
down_revision: Union[str, None] = '006_email_logs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. career_roadmaps
    op.create_table(
        'career_roadmaps',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('resume_id', sa.String(length=36), sa.ForeignKey('resumes.id', ondelete='SET NULL'), nullable=True),
        sa.Column('resume_version_id', sa.String(length=36), sa.ForeignKey('resume_versions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('target_role', sa.String(length=255), nullable=False),
        sa.Column('current_level', sa.String(length=100), nullable=True),
        sa.Column('target_level', sa.String(length=100), nullable=True),
        sa.Column('strengths', sa.JSON(), nullable=False),
        sa.Column('skill_gaps', sa.JSON(), nullable=False),
        sa.Column('potential_undocumented_skills', sa.JSON(), nullable=False),
        sa.Column('learning_topics', sa.JSON(), nullable=False),
        sa.Column('practical_projects', sa.JSON(), nullable=False),
        sa.Column('portfolio_improvements', sa.JSON(), nullable=False),
        sa.Column('certifications', sa.JSON(), nullable=False),
        sa.Column('action_items', sa.JSON(), nullable=False),
        sa.Column('short_term_milestones', sa.JSON(), nullable=False),
        sa.Column('medium_term_milestones', sa.JSON(), nullable=False),
        sa.Column('disclaimer', sa.Text(), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False, server_default='gemini-2.5-flash'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_career_roadmaps_id', 'career_roadmaps', ['id'], unique=False)
    op.create_index('ix_career_roadmaps_user_id', 'career_roadmaps', ['user_id'], unique=False)
    op.create_index('ix_career_roadmaps_resume_id', 'career_roadmaps', ['resume_id'], unique=False)
    op.create_index('ix_career_roadmaps_resume_version_id', 'career_roadmaps', ['resume_version_id'], unique=False)
    op.create_index('ix_career_roadmaps_target_role', 'career_roadmaps', ['target_role'], unique=False)
    op.create_index('ix_career_roadmaps_user_target', 'career_roadmaps', ['user_id', 'target_role'], unique=False)
    op.create_index('ix_career_roadmaps_user_created', 'career_roadmaps', ['user_id', 'created_at'], unique=False)

    # 2. multi_role_comparisons
    op.create_table(
        'multi_role_comparisons',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('resume_id', sa.String(length=36), sa.ForeignKey('resumes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('resume_version_id', sa.String(length=36), sa.ForeignKey('resume_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('roles_evaluated', sa.JSON(), nullable=False),
        sa.Column('role_results', sa.JSON(), nullable=False),
        sa.Column('best_fit_role', sa.String(length=255), nullable=False),
        sa.Column('trade_offs_summary', sa.Text(), nullable=False),
        sa.Column('scoring_version', sa.String(length=50), nullable=False, server_default='v1.0'),
        sa.Column('model_name', sa.String(length=100), nullable=False, server_default='gemini-2.5-flash'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_multi_role_comparisons_id', 'multi_role_comparisons', ['id'], unique=False)
    op.create_index('ix_multi_role_comparisons_user_id', 'multi_role_comparisons', ['user_id'], unique=False)
    op.create_index('ix_multi_role_comparisons_resume_id', 'multi_role_comparisons', ['resume_id'], unique=False)
    op.create_index('ix_multi_role_comparisons_resume_version_id', 'multi_role_comparisons', ['resume_version_id'], unique=False)
    op.create_index('ix_multi_role_comparisons_user_created', 'multi_role_comparisons', ['user_id', 'created_at'], unique=False)

    # 3. career_project_recommendations
    op.create_table(
        'career_project_recommendations',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_role', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('problem_statement', sa.Text(), nullable=False),
        sa.Column('skills_demonstrated', sa.JSON(), nullable=False),
        sa.Column('tech_stack', sa.JSON(), nullable=False),
        sa.Column('core_features', sa.JSON(), nullable=False),
        sa.Column('milestones', sa.JSON(), nullable=False),
        sa.Column('deliverables', sa.JSON(), nullable=False),
        sa.Column('resume_documentation_guide', sa.JSON(), nullable=False),
        sa.Column('is_proposed', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_career_projects_id', 'career_project_recommendations', ['id'], unique=False)
    op.create_index('ix_career_projects_user_id', 'career_project_recommendations', ['user_id'], unique=False)
    op.create_index('ix_career_projects_target_role', 'career_project_recommendations', ['target_role'], unique=False)
    op.create_index('ix_career_projects_user_role', 'career_project_recommendations', ['user_id', 'target_role'], unique=False)
    op.create_index('ix_career_projects_user_created', 'career_project_recommendations', ['user_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('career_project_recommendations')
    op.drop_table('multi_role_comparisons')
    op.drop_table('career_roadmaps')
