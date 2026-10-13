import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.analysis import AnalysisHistory
    from app.models.resume import ResumeDocument
    from app.models.stored_file import StoredFile
    from app.models.job_match import JobMatchReport
    from app.models.email_log import EmailDeliveryLog
    from app.models.career_intelligence import CareerRoadmap, MultiRoleComparison, CareerProjectRecommendation


class User(Base, TimestampMixin):
    """User account entity for authentication and ownership."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    display_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Relationships with cascade delete on user removal
    analyses: Mapped[List["AnalysisHistory"]] = relationship(
        "AnalysisHistory",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    reset_tokens: Mapped[List["PasswordResetToken"]] = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    resumes: Mapped[List["ResumeDocument"]] = relationship(
        "ResumeDocument",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    stored_files: Mapped[List["StoredFile"]] = relationship(
        "StoredFile",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    job_matches: Mapped[List["JobMatchReport"]] = relationship(
        "JobMatchReport",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    email_logs: Mapped[List["EmailDeliveryLog"]] = relationship(
        "EmailDeliveryLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    career_roadmaps: Mapped[List["CareerRoadmap"]] = relationship(
        "CareerRoadmap",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    multi_role_comparisons: Mapped[List["MultiRoleComparison"]] = relationship(
        "MultiRoleComparison",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    career_projects: Mapped[List["CareerProjectRecommendation"]] = relationship(
        "CareerProjectRecommendation",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}')>"


class PasswordResetToken(Base, TimestampMixin):
    """Secure tokens for password reset verification."""

    __tablename__ = "password_reset_tokens"

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
    token_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    is_used: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="reset_tokens",
    )

    __table_args__ = (
        Index("ix_password_reset_tokens_lookup", "token_hash", "is_used"),
    )

    def __repr__(self) -> str:
        return f"<PasswordResetToken(id={self.id}, user_id='{self.user_id}', is_used={self.is_used})>"
