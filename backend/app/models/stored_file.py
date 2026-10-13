import uuid
from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, Boolean, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class StoredFile(Base, TimestampMixin):
    """Secure private file metadata. Never exposes underlying physical storage keys publicly."""

    __tablename__ = "stored_files"

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
    storage_key: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    file_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    purpose: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="linkedin_pdf",
        index=True,
    )
    storage_provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="local",
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="stored_files",
    )

    __table_args__ = (
        Index("ix_stored_files_user_purpose", "user_id", "purpose", "is_deleted"),
    )

    def __repr__(self) -> str:
        return f"<StoredFile(id={self.id}, filename='{self.original_filename}', provider='{self.storage_provider}')>"
