import uuid
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from sqlalchemy import String, Integer, Boolean, JSON, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class ResumeDocument(Base, TimestampMixin):
    """Resume document parent entity in the user's resume library."""

    __tablename__ = "resumes"

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
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    target_role: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="AI Developer",
        index=True,
    )
    current_version_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        nullable=True,
    )
    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="resumes",
    )
    versions: Mapped[List["ResumeVersion"]] = relationship(
        "ResumeVersion",
        back_populates="resume",
        cascade="all, delete-orphan",
        order_by="ResumeVersion.version_number.desc()",
        foreign_keys="ResumeVersion.resume_id",
    )

    __table_args__ = (
        Index("ix_resumes_user_archived", "user_id", "is_archived"),
    )

    def __repr__(self) -> str:
        return f"<ResumeDocument(id={self.id}, title='{self.title}', target_role='{self.target_role}')>"


class ResumeVersion(Base, TimestampMixin):
    """Immutable version snapshot of a structured resume."""

    __tablename__ = "resume_versions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    resume_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    resume_data: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
    )
    template_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="modern",
    )
    page_format: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="letter",
    )
    source_analysis_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("analysis_history.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    job_description_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
    )
    version_notes: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    resume: Mapped["ResumeDocument"] = relationship(
        "ResumeDocument",
        back_populates="versions",
        foreign_keys=[resume_id],
    )

    __table_args__ = (
        UniqueConstraint("resume_id", "version_number", name="uq_resume_version_number"),
        Index("ix_resume_versions_resume_version", "resume_id", "version_number"),
    )

    def __repr__(self) -> str:
        return f"<ResumeVersion(id={self.id}, resume_id={self.resume_id}, version={self.version_number})>"
