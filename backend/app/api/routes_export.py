import re
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user, get_optional_current_user
from app.database.database import get_db
from app.models.user import User
from app.models.analysis import AnalysisHistory
from app.models.job_match import JobMatchReport
from app.schemas.export import UnsavedExportRequest
from app.services.resume_document_service import (
    ResumeDocumentService,
    ResumeNotFoundError,
    ResumeAccessDeniedError,
)
from app.services.pdf_export_service import PdfExportService
from app.services.docx_export_service import DocxExportService
from app.services.job_match_service import JobMatchService

router = APIRouter(tags=["Document Export"])


def _clean_filename(text: str, default: str = "document") -> str:
    """Produces a safe, ASCII filename slug without path traversal characters."""
    slug = re.sub(r"[^\w\s-]", "", text).strip().replace(" ", "-")
    slug = re.sub(r"[-]+", "-", slug)
    return slug or default


# ==============================================================================
# Resume Exports (PDF & DOCX)
# ==============================================================================


@router.get(
    "/resumes/{resume_id}/versions/{version_id}/export/pdf",
    summary="Export Resume Version to PDF",
    description="Generates and downloads a text-selectable PDF for the exact selected resume version snapshot.",
    response_class=Response,
)
async def export_resume_version_pdf(
    resume_id: str,
    version_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        resume = ResumeDocumentService.get_resume(db=db, resume_id=resume_id, user=current_user)
        version = ResumeDocumentService.get_version(
            db=db,
            resume_id=resume.id,
            version_id=version_id,
            user=current_user,
        )
    except ResumeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND", "message": "Resume or version snapshot not found."},
        )
    except ResumeAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume."},
        )

    try:
        pdf_bytes = PdfExportService.generate_resume_pdf(
            resume_data=version.resume_data,
            template_name=version.template_name or "modern",
            page_format=version.page_format or "letter",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "PDF_GENERATION_FAILED", "message": f"Failed to render resume PDF: {str(e)}"},
        )

    slug = _clean_filename(f"{resume.title}-v{version.version_number}", "resume")
    filename = f"{slug}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    )


@router.get(
    "/resumes/{resume_id}/versions/{version_id}/export/docx",
    summary="Export Resume Version to DOCX",
    description="Generates and downloads an editable Microsoft Word DOCX file for the exact selected resume version.",
    response_class=Response,
)
async def export_resume_version_docx(
    resume_id: str,
    version_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        resume = ResumeDocumentService.get_resume(db=db, resume_id=resume_id, user=current_user)
        version = ResumeDocumentService.get_version(
            db=db,
            resume_id=resume.id,
            version_id=version_id,
            user=current_user,
        )
    except ResumeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND", "message": "Resume or version snapshot not found."},
        )
    except ResumeAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "Access denied to requested resume."},
        )

    try:
        docx_bytes = DocxExportService.generate_resume_docx(
            resume_data=version.resume_data,
            template_name=version.template_name or "modern",
            page_format=version.page_format or "letter",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DOCX_GENERATION_FAILED", "message": f"Failed to render resume DOCX: {str(e)}"},
        )

    slug = _clean_filename(f"{resume.title}-v{version.version_number}", "resume")
    filename = f"{slug}.docx"

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    )


@router.post(
    "/resumes/{resume_id}/export/pdf-preview",
    summary="Export Unsaved Resume Editor Content to PDF",
    description="Allows downloading the current in-memory editor content as PDF without requiring a persistent save.",
    response_class=Response,
)
async def export_unsaved_resume_pdf(
    resume_id: str,
    payload: UnsavedExportRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
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

    try:
        pdf_bytes = PdfExportService.generate_resume_pdf(
            resume_data=payload.resume_data,
            template_name=payload.template_name or "modern",
            page_format=payload.page_format or "letter",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "PDF_GENERATION_FAILED", "message": f"Failed to render preview PDF: {str(e)}"},
        )

    slug = _clean_filename(f"{resume.title}-draft", "resume-draft")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{slug}.pdf"',
            "Content-Type": "application/pdf",
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    )


@router.post(
    "/resumes/{resume_id}/export/docx-preview",
    summary="Export Unsaved Resume Editor Content to DOCX",
    description="Allows downloading the current in-memory editor content as DOCX without requiring a persistent save.",
    response_class=Response,
)
async def export_unsaved_resume_docx(
    resume_id: str,
    payload: UnsavedExportRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
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

    try:
        docx_bytes = DocxExportService.generate_resume_docx(
            resume_data=payload.resume_data,
            template_name=payload.template_name or "modern",
            page_format=payload.page_format or "letter",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DOCX_GENERATION_FAILED", "message": f"Failed to render preview DOCX: {str(e)}"},
        )

    slug = _clean_filename(f"{resume.title}-draft", "resume-draft")
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{slug}.docx"',
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    )


# ==============================================================================
# Analysis Report Export (PDF)
# ==============================================================================


@router.get(
    "/analyses/{analysis_id}/export/pdf",
    summary="Export Analysis Report to PDF",
    description="Renders a multi-page PDF summary of an executive resume or LinkedIn analysis report.",
    response_class=Response,
)
async def export_analysis_report_pdf(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    record = db.query(AnalysisHistory).filter(AnalysisHistory.id == analysis_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "REPORT_NOT_FOUND", "message": "Analysis report not found."},
        )

    if record.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "Access denied to this analysis report."},
        )

    try:
        pdf_bytes = PdfExportService.generate_analysis_report_pdf(
            report_id=record.id,
            target_role=record.target_role,
            original_filename=record.original_filename,
            created_at=record.created_at,
            overall_score=record.overall_score,
            ats_score=record.ats_score,
            result_json=record.result_json,
            source_type=record.source_type or "pdf",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "PDF_GENERATION_FAILED", "message": f"Failed to render analysis report PDF: {str(e)}"},
        )

    slug = _clean_filename(f"analysis-{record.target_role}", "analysis-report")
    filename = f"{slug}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    )


# ==============================================================================
# Job Match Report Export (PDF)
# ==============================================================================


@router.get(
    "/job-matches/{match_id}/export/pdf",
    summary="Export Job Match Report to PDF",
    description="Renders a multi-page PDF summary of a job description fit evaluation.",
    response_class=Response,
)
async def export_job_match_report_pdf(
    match_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        report = JobMatchService.get_report(db=db, report_id=match_id, user=current_user)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "REPORT_NOT_FOUND", "message": "Job match report not found."},
        )

    comp = report.comparison_result or {}
    score_bd = comp.get("score_breakdown", {})
    items = comp.get("items", [])
    recommendations = report.recommendations or []

    try:
        pdf_bytes = PdfExportService.generate_job_match_report_pdf(
            report_id=report.id,
            job_title=report.job_title,
            company_name=report.company_name,
            overall_score=report.overall_score,
            required_skills_score=report.required_skills_score,
            preferred_skills_score=report.preferred_skills_score,
            experience_score=report.experience_score,
            keyword_score=report.keyword_score,
            comparison_items=items,
            recommendations=recommendations,
            matched_keywords=score_bd.get("matched_keywords", []),
            missing_keywords=score_bd.get("missing_keywords", []),
            created_at=report.created_at,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "PDF_GENERATION_FAILED", "message": f"Failed to render job match PDF: {str(e)}"},
        )

    slug = _clean_filename(f"job-fit-{report.job_title}", "job-match-report")
    filename = f"{slug}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    )
