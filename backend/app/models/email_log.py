import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class EmailDeliveryLog(Base, TimestampMixin):
    """Tracks document email delivery requests and provider submission status."""

    __tablename__ = "email_delivery_logs"

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
    recipient_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    document_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )  # resume_pdf, resume_docx, analysis_pdf, job_match_pdf
    document_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    subject: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="smtp",
    )
    provider_message_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="accepted",
        index=True,
    )  # accepted, queued, failed
    error_message: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="email_logs",
    )

    __table_args__ = (
        Index("ix_email_logs_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<EmailDeliveryLog(id={self.id}, recipient='{self.recipient_email}', status='{self.status}')>"
