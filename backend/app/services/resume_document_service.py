from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_

from app.models.resume import ResumeDocument, ResumeVersion
from app.models.user import User


class ResumeAccessDeniedError(Exception):
    """Raised when an unauthenticated or unauthorized user accesses a resume."""
    pass


class ResumeNotFoundError(Exception):
    """Raised when a requested resume or version is missing."""
    pass


class ResumeDocumentService:
    """Service layer managing structured resume documents and immutable versioning."""

    @classmethod
    def create_resume(
        cls,
        db: Session,
        user: User,
        title: str,
        target_role: str,
        resume_data: Dict[str, Any],
        template_name: str = "modern",
        page_format: str = "letter",
        source_analysis_id: Optional[str] = None,
        job_description_metadata: Optional[Dict[str, Any]] = None,
        version_notes: Optional[str] = "Initial version",
    ) -> ResumeDocument:
        """Atomically initializes a resume document and its first version."""
        resume = ResumeDocument(
            user_id=user.id,
            title=title.strip(),
            target_role=target_role.strip() or "AI Developer",
            is_archived=False,
        )
        db.add(resume)
        db.flush()

        v1 = ResumeVersion(
            resume_id=resume.id,
            user_id=user.id,
            version_number=1,
            resume_data=resume_data,
            template_name=template_name or "modern",
            page_format=page_format or "letter",
            source_analysis_id=source_analysis_id,
            job_description_metadata=job_description_metadata,
            version_notes=version_notes or "Initial version",
        )
        db.add(v1)
        db.flush()

        resume.current_version_id = v1.id
        db.commit()
        db.refresh(resume)
        return resume

    @classmethod
    def list_resumes(
        cls,
        db: Session,
        user: User,
        search: Optional[str] = None,
        is_archived: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ResumeDocument]:
        """Lists user's resumes ordered by latest modification date."""
        statement = select(ResumeDocument).where(ResumeDocument.user_id == user.id)
        if is_archived is not None:
            statement = statement.where(ResumeDocument.is_archived == is_archived)

        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            statement = statement.where(
                or_(
                    func.lower(ResumeDocument.title).like(term),
                    func.lower(ResumeDocument.target_role).like(term),
                )
            )

        statement = statement.order_by(ResumeDocument.updated_at.desc()).offset(offset).limit(limit)
        return list(db.scalars(statement).all())

    @classmethod
    def get_resume(cls, db: Session, resume_id: str, user: User) -> ResumeDocument:
        """Retrieves a single resume document, verifying strict user ownership."""
        resume = db.query(ResumeDocument).filter(ResumeDocument.id == resume_id).first()
        if not resume:
            raise ResumeNotFoundError("Resume document not found.")
        if resume.user_id != user.id:
            raise ResumeAccessDeniedError("Access denied to requested resume.")
        return resume

    @classmethod
    def update_resume_metadata(
        cls,
        db: Session,
        resume_id: str,
        user: User,
        title: Optional[str] = None,
        target_role: Optional[str] = None,
        is_archived: Optional[bool] = None,
    ) -> ResumeDocument:
        """Updates top-level resume metadata without mutating version snapshots."""
        resume = cls.get_resume(db, resume_id, user)
        if title is not None:
            resume.title = title.strip()
        if target_role is not None:
            resume.target_role = target_role.strip()
        if is_archived is not None:
            resume.is_archived = is_archived

        db.commit()
        db.refresh(resume)
        return resume

    @classmethod
    def list_versions(cls, db: Session, resume_id: str, user: User) -> List[ResumeVersion]:
        """Lists all immutable versions of a resume in descending sequence."""
        # Ensure user owns the resume
        cls.get_resume(db, resume_id, user)
        statement = (
            select(ResumeVersion)
            .where(ResumeVersion.resume_id == resume_id)
            .order_by(ResumeVersion.version_number.desc())
        )
        return list(db.scalars(statement).all())

    @classmethod
    def get_version(cls, db: Session, resume_id: str, version_id: str, user: User) -> ResumeVersion:
        """Fetches a specific version snapshot with ownership verification."""
        cls.get_resume(db, resume_id, user)
        version = db.query(ResumeVersion).filter(
            ResumeVersion.id == version_id,
            ResumeVersion.resume_id == resume_id,
        ).first()
        if not version:
            raise ResumeNotFoundError("Resume version not found.")
        return version

    @classmethod
    def create_version(
        cls,
        db: Session,
        resume_id: str,
        user: User,
        resume_data: Dict[str, Any],
        template_name: str = "modern",
        page_format: str = "letter",
        source_analysis_id: Optional[str] = None,
        job_description_metadata: Optional[Dict[str, Any]] = None,
        version_notes: Optional[str] = None,
    ) -> ResumeVersion:
        """Appends a new immutable version and updates the active current pointer."""
        resume = cls.get_resume(db, resume_id, user)

        max_v = db.scalar(
            select(func.coalesce(func.max(ResumeVersion.version_number), 0))
            .where(ResumeVersion.resume_id == resume_id)
        )
        next_v = max_v + 1

        new_version = ResumeVersion(
            resume_id=resume.id,
            user_id=user.id,
            version_number=next_v,
            resume_data=resume_data,
            template_name=template_name or "modern",
            page_format=page_format or "letter",
            source_analysis_id=source_analysis_id,
            job_description_metadata=job_description_metadata,
            version_notes=version_notes,
        )
        db.add(new_version)
        db.flush()

        resume.current_version_id = new_version.id
        db.commit()
        db.refresh(new_version)
        return new_version

    @classmethod
    def restore_version(cls, db: Session, resume_id: str, version_id: str, user: User) -> ResumeVersion:
        """Restores a previous version by creating a new incremented version with old snapshot data."""
        resume = cls.get_resume(db, resume_id, user)
        target_version = cls.get_version(db, resume_id, version_id, user)

        max_v = db.scalar(
            select(func.coalesce(func.max(ResumeVersion.version_number), 0))
            .where(ResumeVersion.resume_id == resume_id)
        )
        next_v = max_v + 1

        restored_version = ResumeVersion(
            resume_id=resume.id,
            user_id=user.id,
            version_number=next_v,
            resume_data=target_version.resume_data,
            template_name=target_version.template_name,
            page_format=target_version.page_format,
            source_analysis_id=target_version.source_analysis_id,
            job_description_metadata=target_version.job_description_metadata,
            version_notes=f"Restored from version {target_version.version_number}",
        )
        db.add(restored_version)
        db.flush()

        resume.current_version_id = restored_version.id
        db.commit()
        db.refresh(restored_version)
        return restored_version

    @classmethod
    def duplicate_resume(cls, db: Session, resume_id: str, user: User) -> ResumeDocument:
        """Duplicates an existing resume into a new distinct document with copied content."""
        source_resume = cls.get_resume(db, resume_id, user)
        current_v = None
        if source_resume.current_version_id:
            current_v = db.query(ResumeVersion).filter(ResumeVersion.id == source_resume.current_version_id).first()

        copied_data = current_v.resume_data if current_v else {}
        copied_template = current_v.template_name if current_v else "modern"
        copied_format = current_v.page_format if current_v else "letter"

        new_resume = cls.create_resume(
            db=db,
            user=user,
            title=f"{source_resume.title} (Copy)",
            target_role=source_resume.target_role,
            resume_data=copied_data,
            template_name=copied_template,
            page_format=copied_format,
            source_analysis_id=current_v.source_analysis_id if current_v else None,
            version_notes=f"Cloned from '{source_resume.title}'",
        )
        return new_resume

    @classmethod
    def delete_resume(cls, db: Session, resume_id: str, user: User) -> bool:
        """Deletes a resume document and cascades to its versions."""
        resume = cls.get_resume(db, resume_id, user)
        db.delete(resume)
        db.commit()
        return True
