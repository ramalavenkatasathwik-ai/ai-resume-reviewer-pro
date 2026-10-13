import os
import uuid
from abc import ABC, abstractmethod
from typing import Optional, Tuple
from pathlib import Path
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import logger
from app.models.stored_file import StoredFile
from app.models.user import User


class StorageError(Exception):
    """Base exception for file storage operations."""
    pass


class StorageNotConfiguredError(StorageError):
    """Raised when the requested storage provider is missing required configuration."""
    pass


class FileNotFoundInStorageError(StorageError):
    """Raised when a requested file is missing from physical storage or database."""
    pass


class StorageAccessDeniedError(StorageError):
    """Raised when an unauthorized user attempts to access a private file."""
    pass


class InvalidFileError(StorageError):
    """Raised when an uploaded file fails validation (magic signature, size, format)."""
    pass


class StorageProvider(ABC):
    """Abstract base class for persistent file storage providers."""

    @abstractmethod
    def save(self, storage_key: str, file_bytes: bytes, mime_type: str) -> str:
        """Saves file bytes and returns the stored identifier or key."""
        pass

    @abstractmethod
    def get(self, storage_key: str) -> Optional[bytes]:
        """Retrieves raw file bytes by storage key."""
        pass

    @abstractmethod
    def delete(self, storage_key: str) -> bool:
        """Deletes a file from physical storage."""
        pass


class LocalStorageProvider(StorageProvider):
    """Stores files privately in a local filesystem directory inaccessible to public web servers."""

    def __init__(self, base_dir: Optional[str] = None):
        settings = get_settings()
        self.base_dir = Path(base_dir or settings.STORAGE_LOCAL_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_safe_path(self, storage_key: str) -> Path:
        """Ensures the resolved file path resides strictly inside the base directory."""
        safe_key = Path(storage_key).name  # Strips any directory traversal attempts
        full_path = (self.base_dir / safe_key).resolve()
        if not str(full_path).startswith(str(self.base_dir)):
            raise StorageAccessDeniedError("Attempted path traversal outside storage directory.")
        return full_path

    def save(self, storage_key: str, file_bytes: bytes, mime_type: str) -> str:
        path = self._resolve_safe_path(storage_key)
        path.write_bytes(file_bytes)
        return storage_key

    def get(self, storage_key: str) -> Optional[bytes]:
        path = self._resolve_safe_path(storage_key)
        if not path.is_file():
            return None
        return path.read_bytes()

    def delete(self, storage_key: str) -> bool:
        path = self._resolve_safe_path(storage_key)
        if path.is_file():
            try:
                path.unlink()
                return True
            except OSError as e:
                logger.error("Failed to delete local file %s: %s", storage_key, e)
                return False
        return False


class SupabaseStorageProvider(StorageProvider):
    """Stores files in Supabase Storage with private bucket access controls."""

    def __init__(self):
        settings = get_settings()
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise StorageNotConfiguredError(
                "Supabase Storage is not configured. Please supply SUPABASE_URL "
                "and SUPABASE_SERVICE_ROLE_KEY environment variables."
            )
        self.url = settings.SUPABASE_URL.rstrip("/")
        self.key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.bucket = settings.SUPABASE_STORAGE_BUCKET

    def save(self, storage_key: str, file_bytes: bytes, mime_type: str) -> str:
        import httpx
        target_url = f"{self.url}/storage/v1/object/{self.bucket}/{storage_key}"
        headers = {
            "Authorization": f"Bearer {self.key}",
            "apiKey": self.key,
            "Content-Type": mime_type,
        }
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(target_url, content=file_bytes, headers=headers)
            if resp.status_code not in (200, 201):
                logger.error("Supabase upload failed: %d %s", resp.status_code, resp.text)
                raise StorageError(f"Supabase upload failed: {resp.status_code}")
        return storage_key

    def get(self, storage_key: str) -> Optional[bytes]:
        import httpx
        target_url = f"{self.url}/storage/v1/object/authenticated/{self.bucket}/{storage_key}"
        headers = {
            "Authorization": f"Bearer {self.key}",
            "apiKey": self.key,
        }
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(target_url, headers=headers)
            if resp.status_code == 404:
                return None
            if resp.status_code != 200:
                raise StorageError(f"Supabase download failed: {resp.status_code}")
            return resp.content

    def delete(self, storage_key: str) -> bool:
        import httpx
        target_url = f"{self.url}/storage/v1/object/{self.bucket}/{storage_key}"
        headers = {
            "Authorization": f"Bearer {self.key}",
            "apiKey": self.key,
        }
        with httpx.Client(timeout=30.0) as client:
            resp = client.delete(target_url, headers=headers)
            return resp.status_code in (200, 204)


def get_storage_provider() -> StorageProvider:
    """Factory creating the configured storage provider singleton or instance."""
    settings = get_settings()
    provider_name = (settings.STORAGE_PROVIDER or "local").lower()
    if provider_name == "supabase":
        return SupabaseStorageProvider()
    return LocalStorageProvider()


class StorageService:
    """Orchestrates file validation, metadata persistence, and provider interaction."""

    PDF_SIGNATURE = b"%PDF-"

    @classmethod
    def validate_file(
        cls,
        filename: str,
        file_bytes: bytes,
        declared_mime_type: Optional[str] = None,
    ) -> str:
        """Validates file constraints: non-empty, size within limits, and magic signature for PDFs."""
        settings = get_settings()
        if not file_bytes:
            raise InvalidFileError("Uploaded file is empty (0 bytes).")

        if len(file_bytes) > settings.max_upload_size_bytes:
            raise InvalidFileError(
                f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )

        # Check PDF signature if filename indicates PDF or declared mime is pdf
        is_pdf = filename.lower().endswith(".pdf") or (declared_mime_type and "pdf" in declared_mime_type.lower())
        if is_pdf:
            if not file_bytes.startswith(cls.PDF_SIGNATURE):
                raise InvalidFileError("File signature does not match a valid PDF document.")
            return "application/pdf"

        return declared_mime_type or "application/octet-stream"

    @classmethod
    def save_user_file(
        cls,
        db: Session,
        user: User,
        original_filename: str,
        file_bytes: bytes,
        purpose: str = "linkedin_pdf",
        declared_mime_type: Optional[str] = None,
    ) -> StoredFile:
        """Validates, stores physical bytes with a random key, and records StoredFile metadata."""
        mime_type = cls.validate_file(original_filename, file_bytes, declared_mime_type)
        provider = get_storage_provider()

        # Random UUID-based key with safe extension
        ext = ".pdf" if mime_type == "application/pdf" else ".bin"
        storage_key = f"{uuid.uuid4().hex}{ext}"

        # Save to physical storage
        provider.save(storage_key, file_bytes, mime_type)

        stored_file = StoredFile(
            user_id=user.id,
            storage_key=storage_key,
            original_filename=Path(original_filename).name[:250],
            mime_type=mime_type,
            file_size=len(file_bytes),
            purpose=purpose,
            storage_provider=get_settings().STORAGE_PROVIDER or "local",
            is_deleted=False,
        )
        db.add(stored_file)
        db.commit()
        db.refresh(stored_file)
        return stored_file

    @classmethod
    def get_user_file_bytes(
        cls,
        db: Session,
        file_id: str,
        user: User,
    ) -> Tuple[StoredFile, bytes]:
        """Retrieves file bytes verifying strict ownership."""
        stored_file = db.query(StoredFile).filter(
            StoredFile.id == file_id,
            StoredFile.is_deleted == False,
        ).first()

        if not stored_file:
            raise FileNotFoundInStorageError("Requested file was not found.")

        if stored_file.user_id != user.id:
            raise StorageAccessDeniedError("Access denied to requested file.")

        provider = get_storage_provider()
        content = provider.get(stored_file.storage_key)
        if content is None:
            raise FileNotFoundInStorageError("File content not found in storage provider.")

        return stored_file, content

    @classmethod
    def delete_user_file(
        cls,
        db: Session,
        file_id: str,
        user: User,
    ) -> bool:
        """Soft-deletes file metadata and cleans up underlying physical storage."""
        stored_file = db.query(StoredFile).filter(
            StoredFile.id == file_id,
            StoredFile.is_deleted == False,
        ).first()

        if not stored_file:
            raise FileNotFoundInStorageError("Requested file was not found.")

        if stored_file.user_id != user.id:
            raise StorageAccessDeniedError("Access denied to requested file.")

        stored_file.is_deleted = True
        db.commit()

        # Remove physical file
        try:
            provider = get_storage_provider()
            provider.delete(stored_file.storage_key)
        except Exception as e:
            logger.warning("Failed to remove physical storage object %s: %s", stored_file.storage_key, e)

        return True
