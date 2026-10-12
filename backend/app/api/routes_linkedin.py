from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import logger
from app.core.security import get_gemini_api_key, limiter
from app.database.database import get_db
from app.schemas.linkedin import (
    LinkedInAnalysisResult,
    LinkedInUrlRequest,
    LinkedInTextRequest,
)
from app.services.analysis_history_service import AnalysisHistoryService
from app.services.linkedin_profile_provider import (
    LinkedInProfileAcquisitionService,
    ProfileAcquisitionResult,
)
from app.services.linkedin_service import LinkedInService
from app.services.linkedin_url_service import LinkedInUrlService
from app.services.resume_service import ResumeService

settings = get_settings()
router = APIRouter(prefix="/linkedin", tags=["LinkedIn Analyzer"])
profile_acquisition_service = LinkedInProfileAcquisitionService()


@router.post(
    "/analyze-url",
    response_model=LinkedInAnalysisResult,
    status_code=status.HTTP_200_OK,
    summary="Analyze LinkedIn Profile via URL",
    description="Validates a public LinkedIn URL, acquires profile content through authorized providers or user text, and performs role-benchmarked analysis using BYOK Gemini.",
)
@limiter.limit("10/minute")
async def analyze_linkedin_url(
    request: Request,
    payload: LinkedInUrlRequest,
    api_key: str = Depends(get_gemini_api_key),
    db: Session = Depends(get_db),
) -> LinkedInAnalysisResult:
    """Evaluates a public LinkedIn profile from URL using authorized providers without unauthorized scrapers."""
    # 1. Validate & normalize URL
    target_url = payload.linkedin_url or payload.url
    if not target_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "EMPTY_URL",
                "message": "LinkedIn profile URL is required.",
            },
        )

    normalized_url, username = LinkedInUrlService.validate_and_normalize_url(target_url)

    # 2. Acquire profile data via authorized provider
    profile_text = payload.profile_text or payload.fallback_text
    acquisition: ProfileAcquisitionResult = await profile_acquisition_service.acquire_profile(
        url=normalized_url,
        username=username,
        profile_text=profile_text,
    )

    # 3. If profile content cannot be retrieved, return clear 422 with actionable guidance
    if not acquisition.success or not acquisition.content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "PROFILE_DATA_UNAVAILABLE",
                "message": acquisition.actionable_message or (
                    "LinkedIn profile content cannot be retrieved directly from the URL alone. "
                    "Due to LinkedIn's strict access controls, direct public scraping is restricted without authorized API permissions. "
                    "Please provide your profile text using the 'profile_text' field or upload your official LinkedIn profile PDF using the LinkedIn PDF Analyzer."
                ),
                "limitations": acquisition.limitations,
                "suggested_actions": [
                    "Provide your profile text using the 'profile_text' field.",
                    "Export your profile as PDF from LinkedIn ('More' -> 'Save to PDF') and use the /api/linkedin/analyze-pdf endpoint.",
                ],
                "normalized_profile_url": normalized_url,
            },
        )

    # 4. Execute analysis with Gemini
    result = await LinkedInService.analyze_profile(
        api_key=api_key,
        profile_content=acquisition.content,
        target_role=payload.target_role,
        input_type="url",
        profile_url=normalized_url,
        model_name=payload.model,
        extra_limitations=acquisition.limitations,
    )

    # 5. Record to analysis history
    try:
        ats_score_val = (
            result.target_role_alignment.alignment_score
            if result.target_role_alignment
            else result.section_scores.target_role_alignment.score
        )
        AnalysisHistoryService.record_analysis(
            db=db,
            filename=f"url:{normalized_url}",
            target_role=payload.target_role,
            status="completed",
            analysis_type="linkedin",
            overall_score=result.overall_score.score,
            ats_score=ats_score_val,
            result_json=result.model_dump(),
        )
    except Exception as e:
        logger.warning("Failed to record LinkedIn URL analysis to DB: %s", type(e).__name__)

    return result


@router.post(
    "/analyze-pdf",
    response_model=LinkedInAnalysisResult,
    status_code=status.HTTP_200_OK,
    summary="Analyze LinkedIn Profile via Official PDF Export",
    description="Validates and extracts content from a LinkedIn 'Save to PDF' export in-memory and analyzes with BYOK Gemini.",
)
@limiter.limit("10/minute")
async def analyze_linkedin_pdf(
    request: Request,
    file: UploadFile = File(..., description="LinkedIn-generated PDF export (max 10MB)"),
    target_role: str = Form(..., description="Target job title / role"),
    model: Optional[str] = Form(None, description="Optional chosen Gemini model"),
    profile_url: Optional[str] = Form(None, description="Optional profile URL"),
    api_key: str = Depends(get_gemini_api_key),
    db: Session = Depends(get_db),
) -> LinkedInAnalysisResult:
    """Validates the PDF, extracts content in-memory, and evaluates with Google Gemini."""
    # 1. Validate PDF and extract text in-memory
    _pdf_bytes, profile_text, _page_count = await ResumeService.validate_and_extract_pdf(file)

    # 2. Normalize optional profile URL if provided
    normalized_url = None
    if profile_url and profile_url.strip():
        try:
            normalized_url, _ = LinkedInUrlService.validate_and_normalize_url(profile_url)
        except HTTPException:
            normalized_url = profile_url.strip()

    # 3. Execute analysis with Gemini
    result = await LinkedInService.analyze_profile(
        api_key=api_key,
        profile_content=profile_text,
        target_role=target_role,
        input_type="pdf",
        profile_url=normalized_url,
        model_name=model,
    )

    # 4. Record to database
    try:
        AnalysisHistoryService.record_analysis(
            db=db,
            filename=file.filename or "linkedin_profile.pdf",
            target_role=target_role,
            status="completed",
            analysis_type="linkedin",
            overall_score=result.overall_score.score,
            ats_score=result.target_role_alignment.alignment_score,
            result_json=result.model_dump(),
        )
    except Exception as e:
        logger.warning("Failed to record LinkedIn PDF analysis to DB: %s", type(e).__name__)

    return result


@router.post(
    "/analyze-text",
    response_model=LinkedInAnalysisResult,
    status_code=status.HTTP_200_OK,
    summary="Analyze LinkedIn Profile via Pasted Text",
    description="Evaluates pasted LinkedIn profile sections against target role using BYOK Gemini.",
)
@limiter.limit("10/minute")
async def analyze_linkedin_text(
    request: Request,
    payload: LinkedInTextRequest,
    api_key: str = Depends(get_gemini_api_key),
    db: Session = Depends(get_db),
) -> LinkedInAnalysisResult:
    """Analyzes raw pasted profile text as an accessible fallback for incomplete PDFs or blocked URLs."""
    if len(payload.profile_text.strip()) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "INSUFFICIENT_TEXT",
                "message": "Pasted profile text must contain at least 50 characters of verifiable profile information.",
            },
        )

    normalized_url = None
    if payload.profile_url and payload.profile_url.strip():
        try:
            normalized_url, _ = LinkedInUrlService.validate_and_normalize_url(payload.profile_url)
        except HTTPException:
            normalized_url = payload.profile_url.strip()

    # Execute analysis with Gemini
    result = await LinkedInService.analyze_profile(
        api_key=api_key,
        profile_content=payload.profile_text.strip(),
        target_role=payload.target_role,
        input_type="text",
        profile_url=normalized_url,
        model_name=payload.model,
    )

    # Record to database
    try:
        AnalysisHistoryService.record_analysis(
            db=db,
            filename="pasted_profile_text",
            target_role=payload.target_role,
            status="completed",
            analysis_type="linkedin",
            overall_score=result.overall_score.score,
            ats_score=result.target_role_alignment.alignment_score,
            result_json=result.model_dump(),
        )
    except Exception as e:
        logger.warning("Failed to record LinkedIn text analysis to DB: %s", type(e).__name__)

    return result


@router.post(
    "/connect",
    summary="Official LinkedIn OAuth Initialization",
    description="Initializes official LinkedIn OAuth workflow if developer credentials are configured.",
)
async def linkedin_connect() -> Dict[str, Any]:
    """Returns official LinkedIn OAuth connection status and authorization URL if configured."""
    client_id = getattr(settings, "LINKEDIN_CLIENT_ID", None)
    if not client_id:
        return {
            "status": "not_configured",
            "message": (
                "Official LinkedIn API integration requires an approved LinkedIn Developer App "
                "with Member Data Portability / Sign In with LinkedIn permissions. "
                "To enable direct OAuth, set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in backend configuration."
            ),
            "auth_url": None,
            "alternative_options": [
                "Mode 1: Enter public LinkedIn profile URL",
                "Mode 2: Upload LinkedIn 'Save to PDF' export",
                "Mode 3: Paste profile text directly",
            ],
        }

    redirect_uri = getattr(settings, "LINKEDIN_REDIRECT_URI", "http://localhost:8000/api/linkedin/callback")
    auth_url = (
        f"https://www.linkedin.com/oauth/v2/authorization?"
        f"response_type=code&client_id={client_id}&redirect_uri={redirect_uri}&scope=openid%20profile%20email"
    )
    return {
        "status": "configured",
        "auth_url": auth_url,
    }


@router.get(
    "/callback",
    summary="Official LinkedIn OAuth Callback Handler",
    description="Handles OAuth authorization code exchange for official LinkedIn profile integration.",
)
async def linkedin_callback(code: Optional[str] = None, error: Optional[str] = None) -> Dict[str, Any]:
    """Handles OAuth redirect callback from LinkedIn."""
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "LINKEDIN_AUTH_DENIED", "message": f"LinkedIn OAuth was denied: {error}"},
        )
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "MISSING_OAUTH_CODE", "message": "Missing authorization code from LinkedIn callback."},
        )

    return {
        "status": "authorized",
        "message": "Authorization code received. Official token exchange requires backend client secret.",
    }
