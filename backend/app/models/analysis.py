import uuid
from datetime import datetime
from typing import Optional, Any, Dict, TYPE_CHECKING

from sqlalchemy import String, Integer, Float, DateTime, JSON, CheckConstraint, Index, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.stored_file import StoredFile


class AnalysisHistory(Base, TimestampMixin):
    """Stores metadata and results of resume reviews without ever persisting API keys or raw files."""

    __tablename__ = "analysis_history"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    target_role: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="completed",
        index=True,
    )
    analysis_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="resume",
        index=True,
    )
    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pdf",
        index=True,
    )
    overall_score: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    ats_score: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    result_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
    )
    model_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    prompt_version: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    llm_usage: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
    )
    estimated_cost: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    error_category: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    stored_file_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("stored_files.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    @property
    def token_usage(self) -> Optional[Dict[str, Any]]:
        return self.llm_usage

    @token_usage.setter
    def token_usage(self, val: Optional[Dict[str, Any]]) -> None:
        self.llm_usage = val

    user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="analyses",
    )
    stored_file: Mapped[Optional["StoredFile"]] = relationship(
        "StoredFile",
        foreign_keys=[stored_file_id],
    )

    __table_args__ = (
        CheckConstraint(
            "overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)",
            name="ck_analysis_history_overall_score",
        ),
        CheckConstraint(
            "ats_score IS NULL OR (ats_score >= 0 AND ats_score <= 100)",
            name="ck_analysis_history_ats_score",
        ),
        Index("ix_analysis_history_created_at", "created_at"),
        Index("ix_analysis_history_target_role_status", "target_role", "status"),
        Index("ix_analysis_history_user_status", "user_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<AnalysisHistory(id={self.id}, target_role='{self.target_role}', status='{self.status}')>"


# AnalysisReport alias for domain clarity and Phase 7 compliance
AnalysisReport = AnalysisHistory
