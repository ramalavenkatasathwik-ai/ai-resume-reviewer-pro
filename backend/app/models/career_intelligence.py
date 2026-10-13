import uuid
from typing import Optional, Dict, Any, List, TYPE_CHECKING
from sqlalchemy import String, Integer, Boolean, Text, JSON, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.resume import ResumeDocument, ResumeVersion


class CareerRoadmap(Base, TimestampMixin):
    """Personalized career progression roadmap based on current evidence and target role."""

    __tablename__ = "career_roadmaps"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resume_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("resumes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    resume_version_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("resume_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    target_role: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    current_level: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    target_level: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    strengths: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    skill_gaps: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    potential_undocumented_skills: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    learning_topics: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    practical_projects: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    portfolio_improvements: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    certifications: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    action_items: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    short_term_milestones: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    medium_term_milestones: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    disclaimer: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default=(
            "AI career guidance recommendations do not guarantee employment, "
            "interviews, or specific salary outcomes."
        ),
    )
    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="gemini-2.5-flash",
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="career_roadmaps",
    )
    resume: Mapped[Optional["ResumeDocument"]] = relationship(
        "ResumeDocument",
    )
    resume_version: Mapped[Optional["ResumeVersion"]] = relationship(
        "ResumeVersion",
    )

    __table_args__ = (
        Index("ix_career_roadmaps_user_target", "user_id", "target_role"),
        Index("ix_career_roadmaps_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<CareerRoadmap(id={self.id}, target_role='{self.target_role}')>"


class MultiRoleComparison(Base, TimestampMixin):
    """Evaluation matrix comparing a single resume against multiple target roles simultaneously."""

    __tablename__ = "multi_role_comparisons"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resume_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resume_version_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("resume_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    roles_evaluated: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    role_results: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    best_fit_role: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    trade_offs_summary: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )
    scoring_version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="v1.0",
    )
    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="gemini-2.5-flash",
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="multi_role_comparisons",
    )
    resume: Mapped["ResumeDocument"] = relationship(
        "ResumeDocument",
    )
    resume_version: Mapped["ResumeVersion"] = relationship(
        "ResumeVersion",
    )

    __table_args__ = (
        Index("ix_multi_role_comparisons_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<MultiRoleComparison(id={self.id}, best_fit='{self.best_fit_role}')>"


class CareerProjectRecommendation(Base, TimestampMixin):
    """Portfolio project proposals designed to demonstrate high-value target role competencies."""

    __tablename__ = "career_project_recommendations"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_role: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    problem_statement: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    skills_demonstrated: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    tech_stack: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    core_features: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    milestones: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    deliverables: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    resume_documentation_guide: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    is_proposed: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="career_projects",
    )

    __table_args__ = (
        Index("ix_career_projects_user_role", "user_id", "target_role"),
        Index("ix_career_projects_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<CareerProjectRecommendation(id={self.id}, title='{self.title}')>"
