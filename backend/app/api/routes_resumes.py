from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user
from app.database.database import get_db
from app.models.resume import ResumeDocument, ResumeVersion
from app.models.user import User
from app.schemas.resume import (
    ResumeCreate,
    ResumeUpdate,
    ResumeSummary,
    ResumeDetail,
    ResumeVersionCreate,
    ResumeVersionSummary,
    ResumeVersionDetail,
)
from app.services.resume_document_service import (
    ResumeDocumentService,
    ResumeNotFoundError,
    ResumeAccessDeniedError,
)

router = APIRouter(prefix="/resumes", tags=["Resume Library"])


def _to_version_detail(v: ResumeVersion) -> ResumeVersionDetail:
    return ResumeVersionDetail(
        id=v.id,
        resume_id=v.resume_id,
        version_number=v.version_number,
        template_name=v.template_name,
        page_format=v.page_format,
        version_notes=v.version_notes,
        created_at=v.created_at,
        resume_data=v.resume_data,
        source_analysis_id=v.source_analysis_id,
        job_description_metadata=v.job_description_metadata,
    )


def _to_resume_detail(resume: ResumeDocument, db: Session) -> ResumeDetail:
    current_version = None
    if resume.current_version_id:
        v = db.query(ResumeVersion).filter(ResumeVersion.id == resume.current_version_id).first()
        if v:
            current_version = _to_version_detail(v)

    versions_count = db.query(ResumeVersion).filter(ResumeVersion.resume_id == resume.id).count()

    return ResumeDetail(
        id=resume.id,
        user_id=resume.user_id,
        title=resume.title,
        target_role=resume.target_role,
        current_version_id=resume.current_version_id,
        is_archived=resume.is_archived,
        versions_count=versions_count,
        created_at=resume.created_at,
        updated_at=resume.updated_at,
        current_version=current_version,
    )


@router.get(
    "",
    response_model=List[ResumeSummary],
    summary="List User Resumes",
    description="Retrieves all resumes in the authenticated user's library with filtering.",
)
async def list_resumes(
    search: Optional[str] = Query(None, description="Search query across title and target role"),
    is_archived: Optional[bool] = Query(None, description="Filter by archived status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[ResumeSummary]:
    resumes = ResumeDocumentService.list_resumes(
        db=db,
        user=current_user,
        search=search,
        is_archived=is_archived,
        limit=limit,
        offset=offset,
    )

    result = []
    for r in resumes:
        v_count = db.query(ResumeVersion).filter(ResumeVersion.resume_id == r.id).count()
        result.append(
            ResumeSummary(
                id=r.id,
                user_id=r.user_id,
                title=r.title,
                target_role=r.target_role,
                current_version_id=r.current_version_id,
                is_archived=r.is_archived,
                versions_count=v_count,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
        )
    return result


@router.post(
    "",
    response_model=ResumeDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Resume Document",
    description="Creates a resume document and its first immutable version snapshot.",
)
async def create_resume(
    payload: ResumeCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ResumeDetail:
    resume = ResumeDocumentService.create_resume(
        db=db,
        user=current_user,
        title=payload.title,
        target_role=payload.target_role,
        resume_data=payload.resume_data,
        template_name=payload.template_name or "modern",
        page_format=payload.page_format or "letter",
        source_analysis_id=payload.source_analysis_id,
        job_description_metadata=payload.job_description_metadata,
        version_notes=payload.version_notes or "Initial version",
    )
    return _to_resume_detail(resume, db)


@router.get(
    "/{resume_id}",
    response_model=ResumeDetail,
    summary="Get Resume with Active Version",
    description="Retrieves a specific resume document and its active version data.",
)
async def get_resume(
    resume_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ResumeDetail:
    try:
        resume = ResumeDocumentService.get_resume(db=db, resume_id=resume_id, user=current_user)
    except ResumeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "RESUME_NOT_FOUND", "message": "Resume document not found."},
        )
    except ResumeAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume."},
        )

    return _to_resume_detail(resume, db)


@router.patch(
    "/{resume_id}",
    response_model=ResumeDetail,
    summary="Update Resume Metadata",
    description="Updates document metadata such as title, target role, or archive status.",
)
async def update_resume(
    resume_id: str,
    payload: ResumeUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ResumeDetail:
    try:
        resume = ResumeDocumentService.update_resume_metadata(
            db=db,
            resume_id=resume_id,
            user=current_user,
            title=payload.title,
            target_role=payload.target_role,
            is_archived=payload.is_archived,
        )
    except ResumeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "RESUME_NOT_FOUND", "message": "Resume document not found."},
        )
    except ResumeAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume."},
        )

    return _to_resume_detail(resume, db)


@router.delete(
    "/{resume_id}",
    summary="Delete Resume Document",
    description="Deletes a resume document and all its versions from the user's library.",
)
async def delete_resume(
    resume_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        ResumeDocumentService.delete_resume(db=db, resume_id=resume_id, user=current_user)
    except ResumeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "RESUME_NOT_FOUND", "message": "Resume document not found."},
        )
    except ResumeAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume."},
        )

    return {"success": True, "message": "Resume deleted successfully."}


@router.post(
    "/{resume_id}/duplicate",
    response_model=ResumeDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Duplicate Resume Document",
    description="Creates a duplicate copy of a resume document with its current active version.",
)
async def duplicate_resume(
    resume_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ResumeDetail:
    try:
        duplicate = ResumeDocumentService.duplicate_resume(db=db, resume_id=resume_id, user=current_user)
    except ResumeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "RESUME_NOT_FOUND", "message": "Resume document not found."},
        )
    except ResumeAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume."},
        )

    return _to_resume_detail(duplicate, db)


# --- Version Endpoints ---


@router.get(
    "/{resume_id}/versions",
    response_model=List[ResumeVersionSummary],
    summary="List Resume Versions",
    description="Lists all version snapshots for the specified resume in descending order.",
)
async def list_resume_versions(
    resume_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[ResumeVersionSummary]:
    try:
        versions = ResumeDocumentService.list_versions(db=db, resume_id=resume_id, user=current_user)
    except ResumeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "RESUME_NOT_FOUND", "message": "Resume document not found."},
        )
    except ResumeAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume."},
        )

    return [
        ResumeVersionSummary(
            id=v.id,
            resume_id=v.resume_id,
            version_number=v.version_number,
            template_name=v.template_name,
            page_format=v.page_format,
            version_notes=v.version_notes,
            created_at=v.created_at,
        )
        for v in versions
    ]


@router.post(
    "/{resume_id}/versions",
    response_model=ResumeVersionDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Save New Resume Version",
    description="Appends a new immutable version snapshot to the resume and activates it.",
)
async def create_resume_version(
    resume_id: str,
    payload: ResumeVersionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ResumeVersionDetail:
    try:
        version = ResumeDocumentService.create_version(
            db=db,
            resume_id=resume_id,
            user=current_user,
            resume_data=payload.resume_data,
            template_name=payload.template_name or "modern",
            page_format=payload.page_format or "letter",
            source_analysis_id=payload.source_analysis_id,
            job_description_metadata=payload.job_description_metadata,
            version_notes=payload.version_notes,
        )
    except ResumeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "RESUME_NOT_FOUND", "message": "Resume document not found."},
        )
    except ResumeAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume."},
        )

    return _to_version_detail(version)


@router.get(
    "/{resume_id}/versions/{version_id}",
    response_model=ResumeVersionDetail,
    summary="Get Specific Resume Version Snapshot",
    description="Retrieves the full structured data for a specific historical version snapshot.",
)
async def get_resume_version(
    resume_id: str,
    version_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ResumeVersionDetail:
    try:
        version = ResumeDocumentService.get_version(
            db=db,
            resume_id=resume_id,
            version_id=version_id,
            user=current_user,
        )
    except ResumeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "VERSION_NOT_FOUND", "message": "Resume version snapshot not found."},
        )
    except ResumeAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume."},
        )

    return _to_version_detail(version)


@router.post(
    "/{resume_id}/restore/{version_id}",
    response_model=ResumeVersionDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Restore Historical Resume Version",
    description="Creates a new version with the content of the historical version, preserving full immutable history.",
)
async def restore_resume_version(
    resume_id: str,
    version_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ResumeVersionDetail:
    try:
        new_version = ResumeDocumentService.restore_version(
            db=db,
            resume_id=resume_id,
            version_id=version_id,
            user=current_user,
        )
    except ResumeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "VERSION_NOT_FOUND", "message": "Resume version snapshot not found."},
        )
    except ResumeAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume."},
        )

    return _to_version_detail(new_version)
