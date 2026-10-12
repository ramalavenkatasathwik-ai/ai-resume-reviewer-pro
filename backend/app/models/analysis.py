import uuid
from typing import Optional, Any, Dict

from sqlalchemy import String, Integer, JSON, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class AnalysisHistory(Base, TimestampMixin):
    """Stores metadata and results of resume reviews without ever persisting API keys or raw files."""

    __tablename__ = "analysis_history"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
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
    )

    def __repr__(self) -> str:
        return f"<AnalysisHistory(id={self.id}, target_role='{self.target_role}', status='{self.status}')>"
