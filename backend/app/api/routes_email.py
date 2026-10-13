from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_current_active_user, limiter
from app.database.database import get_db
from app.models.user import User
from app.models.analysis import AnalysisHistory
from app.models.job_match import JobMatchReport
from app.schemas.export import (
    DocumentEmailRequest,
    DocumentEmailResponse,
    EmailConfigStatusResponse,
)
from app.services.resume_document_service import (
    ResumeDocumentService,
    ResumeNotFoundError,
    ResumeAccessDeniedError,
)
from app.services.pdf_export_service import PdfExportService
from app.services.docx_export_service import DocxExportService
from app.services.job_match_service import JobMatchService
from app.services.email_service import (
    EmailService,
    EmailNotConfiguredError,
    EmailValidationError,
    EmailDuplicateSendError,
    EmailDeliveryError,
)

router = APIRouter(prefix="/email", tags=["Email Delivery"])


@router.get(
    "/status",
    response_model=EmailConfigStatusResponse,
    summary="Check Server Email Delivery Configuration",
    description="Returns whether an email provider is configured to send outgoing attachments.",
)
async def get_email_status(
    current_user: User = Depends(get_current_active_user),
) -> EmailConfigStatusResponse:
    settings = get_settings()
    from_addr = settings.EMAIL_FROM_ADDRESS or settings.SMTP_FROM_EMAIL
    return EmailConfigStatusResponse(
        is_configured=settings.is_email_configured,
        provider=settings.EMAIL_PROVIDER or "none",
        from_address=from_addr if settings.is_email_configured else None,
    )


@router.post(
    "/send",
    response_model=DocumentEmailResponse,
    status_code=status.HTTP_200_OK,
    summary="Send Document via Email Attachment",
    description="Renders the selected resume version or report and dispatches it as an attachment to the recipient.",
)
@limiter.limit("5/minute")
async def send_document_email(
    request: Request,
    payload: DocumentEmailRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> DocumentEmailResponse:
    settings = get_settings()

    if not settings.is_email_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "EMAIL_NOT_CONFIGURED",
                "message": (
                    "Email delivery is not configured on this server. "
                    "Please configure SMTP or Resend/SendGrid credentials in backend environment variables."
                ),
            },
        )

    file_bytes: bytes = b""
    filename: str = "document.pdf"

    # 1. Resolve Document and Render Attachment Bytes
    doc_type = payload.document_type.lower().strip()

    if doc_type in ("resume_pdf", "resume_docx"):
        try:
            resume = ResumeDocumentService.get_resume(
                db=db, resume_id=payload.document_id, user=current_user
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

        if payload.unsaved_resume_data:
            resume_data = payload.unsaved_resume_data
            v_num = "draft"
        else:
            v_id = payload.version_id or resume.current_version_id
            if not v_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error": "NO_VERSION", "message": "Resume has no active versions to send."},
                )
            version = ResumeDocumentService.get_version(
                db=db, resume_id=resume.id, version_id=v_id, user=current_user
            )
            resume_data = version.resume_data
            v_num = f"v{version.version_number}"

        clean_title = (resume.title or "resume").strip().replace(" ", "-")

        if doc_type == "resume_docx":
            filename = f"{clean_title}-{v_num}.docx"
            file_bytes = DocxExportService.generate_resume_docx(
                resume_data=resume_data,
                template_name=payload.template_name or "modern",
                page_format=payload.page_format or "letter",
            )
        else:
            filename = f"{clean_title}-{v_num}.pdf"
            file_bytes = PdfExportService.generate_resume_pdf(
                resume_data=resume_data,
                template_name=payload.template_name or "modern",
                page_format=payload.page_format or "letter",
            )

    elif doc_type == "analysis_pdf":
        record = db.query(AnalysisHistory).filter(AnalysisHistory.id == payload.document_id).first()
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "REPORT_NOT_FOUND", "message": "Analysis report not found."},
            )
        if record.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "ACCESS_DENIED", "message": "Access denied to this report."},
            )

        filename = f"analysis-{record.target_role.replace(' ', '-')}.pdf"
        file_bytes = PdfExportService.generate_analysis_report_pdf(
            report_id=record.id,
            target_role=record.target_role,
            original_filename=record.original_filename,
            created_at=record.created_at,
            overall_score=record.overall_score,
            ats_score=record.ats_score,
            result_json=record.result_json,
            source_type=record.source_type or "pdf",
        )

    elif doc_type == "job_match_pdf":
        try:
            report = JobMatchService.get_report(
                db=db, report_id=payload.document_id, user=current_user
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "REPORT_NOT_FOUND", "message": "Job match report not found."},
            )

        comp = report.comparison_result or {}
        score_bd = comp.get("score_breakdown", {})

        filename = f"job-fit-{report.job_title.replace(' ', '-')}.pdf"
        file_bytes = PdfExportService.generate_job_match_report_pdf(
            report_id=report.id,
            job_title=report.job_title,
            company_name=report.company_name,
            overall_score=report.overall_score,
            required_skills_score=report.required_skills_score,
            preferred_skills_score=report.preferred_skills_score,
            experience_score=report.experience_score,
            keyword_score=report.keyword_score,
            comparison_items=comp.get("items", []),
            recommendations=report.recommendations or [],
            matched_keywords=score_bd.get("matched_keywords", []),
            missing_keywords=score_bd.get("missing_keywords", []),
            created_at=report.created_at,
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "INVALID_DOCUMENT_TYPE", "message": f"Unsupported document type '{doc_type}'."},
        )

    # 2. Dispatch Email Attachment
    try:
        log_entry = await EmailService.send_document_email(
            db=db,
            user=current_user,
            recipient_email=payload.recipient_email,
            document_type=doc_type,
            document_id=payload.document_id,
            filename=filename,
            file_bytes=file_bytes,
            subject=payload.subject,
            custom_message=payload.custom_message,
        )
    except EmailNotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "EMAIL_NOT_CONFIGURED", "message": str(e)},
        )
    except EmailValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "VALIDATION_ERROR", "message": str(e)},
        )
    except EmailDuplicateSendError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": "DUPLICATE_SEND_BLOCKED", "message": str(e)},
        )
    except EmailDeliveryError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error": "DELIVERY_FAILED", "message": str(e)},
        )

    return DocumentEmailResponse(
        success=True,
        log_id=log_entry.id,
        recipient_email=log_entry.recipient_email,
        status=log_entry.status,
        provider=log_entry.provider,
        message=f"Document '{filename}' successfully accepted for delivery to {log_entry.recipient_email}.",
    )
