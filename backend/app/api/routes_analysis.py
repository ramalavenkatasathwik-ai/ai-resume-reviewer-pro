from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status

from app.core.security import get_gemini_api_key, limiter
from app.schemas.analysis import AnalysisResult
from app.services.gemini_service import GeminiService
from app.services.resume_service import ResumeService

router = APIRouter(tags=["Analysis"])


@router.post(
    "/analyze",
    response_model=AnalysisResult,
    status_code=status.HTTP_200_OK,
    summary="Analyze Resume PDF against Target Role",
    description="Uploads a resume PDF in-memory and evaluates it with Google Gemini using the caller's BYOK key.",
)
@limiter.limit("10/minute")
async def analyze_resume(
    request: Request,
    file: UploadFile = File(..., description="Resume PDF file (max 10MB)"),
    target_role: str = Form(..., description="Target job title / role for benchmark analysis"),
    model: Optional[str] = Form(None, description="Optional chosen Gemini model from supported allowlist"),
    api_key: str = Depends(get_gemini_api_key),
) -> AnalysisResult:
    """Validates the PDF, extracts content in-memory, and evaluates it using Google Gemini."""
    # 1. Validate PDF and extract text in-memory
    _pdf_bytes, resume_text, _page_count = await ResumeService.validate_and_extract_pdf(file)

    # 2. Execute analysis via Gemini using caller's ephemeral key
    analysis_result = await GeminiService.analyze_resume(
        api_key=api_key,
        resume_text=resume_text,
        target_role=target_role,
        model_name=model,
    )

    return analysis_result
