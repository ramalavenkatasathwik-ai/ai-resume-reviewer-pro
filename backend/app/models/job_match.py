import uuid
from typing import Optional, Dict, Any, TYPE_CHECKING
from sqlalchemy import String, Integer, Text, JSON, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.resume import ResumeDocument, ResumeVersion


class JobMatchReport(Base, TimestampMixin):
    """Stores full job description analysis, requirement extraction, match comparison, and recommendations."""

    __tablename__ = "job_match_reports"

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
    job_title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    company_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    job_description_raw: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    extracted_requirements: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
    )
    comparison_result: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
    )
    recommendations: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
    )
    overall_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    required_skills_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    preferred_skills_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    experience_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    keyword_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
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
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="completed",
        index=True,
    )
    retention_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=90,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="job_matches",
    )
    resume: Mapped["ResumeDocument"] = relationship(
        "ResumeDocument",
        back_populates="job_matches",
    )
    resume_version: Mapped["ResumeVersion"] = relationship(
        "ResumeVersion",
    )

    __table_args__ = (
        Index("ix_job_match_reports_user_status", "user_id", "status"),
        Index("ix_job_match_reports_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<JobMatchReport(id={self.id}, job_title='{self.job_title}', score={self.overall_score})>"
