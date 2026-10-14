from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.core.security import get_gemini_api_key, limiter, get_optional_current_user
from app.core.logging import logger
from app.database.database import get_db
from app.models.user import User
from app.schemas.analysis import AnalysisResult
from app.services.analysis_history_service import AnalysisHistoryService
from app.services.gemini_service import GeminiService
from app.services.resume_service import ResumeService

router = APIRouter(tags=["Analysis"])


@router.post(
    "/analyze",
    response_model=AnalysisResult,
    status_code=status.HTTP_200_OK,
    summary="Analyze Resume PDF against Target Role",
    description="Uploads a resume PDF in-memory and evaluates it with Google Gemini using server-side AI configuration.",
)
@limiter.limit("10/minute")
async def analyze_resume(
    request: Request,
    file: UploadFile = File(..., description="Resume PDF file (max 10MB)"),
    target_role: str = Form(..., description="Target job title / role for benchmark analysis"),
    model: Optional[str] = Form(None, description="Optional chosen Gemini model from supported allowlist"),
    api_key: str = Depends(get_gemini_api_key),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> AnalysisResult:
    """Validates the PDF, extracts content in-memory, and evaluates it using Google Gemini."""
    # 1. Validate PDF and extract text in-memory
    _pdf_bytes, resume_text, _page_count = await ResumeService.validate_and_extract_pdf(file)

    # 2. Execute analysis via Gemini using server-side key
    analysis_result = await GeminiService.analyze_resume(
        resume_text=resume_text,
        target_role=target_role,
        api_key=api_key,
        model_name=model,
    )

    # 3. Record analysis to database
    try:
        AnalysisHistoryService.record_analysis(
            db=db,
            filename=file.filename or "resume.pdf",
            target_role=target_role,
            status="completed",
            analysis_type="resume",
            overall_score=analysis_result.overall_score,
            ats_score=analysis_result.ats_score,
            result_json=analysis_result.model_dump(),
            user_id=current_user.id if current_user else None,
            source_type="pdf",
            model_name=analysis_result.model_used or model or "gemini-2.5-flash",
        )
    except Exception as e:
        logger.warning("Failed to record resume analysis to DB: %s", type(e).__name__)

    return analysis_result


@router.get(
    "/history",
    summary="List Analysis History Records",
    description="Retrieves past resume and LinkedIn analysis records from the database.",
)
async def list_history(
    limit: int = 20,
    offset: int = 0,
    analysis_type: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Lists history records ordered by creation date descending with user isolation."""
    user_id = current_user.id if current_user else None
    only_unauthenticated = current_user is None

    records = AnalysisHistoryService.list_records(
        db=db,
        limit=limit,
        offset=offset,
        analysis_type=analysis_type,
        user_id=user_id,
        only_unauthenticated=only_unauthenticated,
    )
    return [
        {
            "id": r.id,
            "filename": r.original_filename,
            "target_role": r.target_role,
            "status": r.status,
            "analysis_type": getattr(r, "analysis_type", "resume"),
            "overall_score": r.overall_score,
            "ats_score": r.ats_score,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


