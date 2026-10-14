from typing import Optional
from fastapi import APIRouter, Depends, Request, status

from app.core.security import get_optional_gemini_api_key, limiter
from app.schemas.keys import KeyValidationRequest, KeyValidationResponse
from app.services.gemini_service import GeminiService

router = APIRouter(prefix="/keys", tags=["API Keys"])


@router.post(
    "/validate",
    response_model=KeyValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate AI Service Connectivity",
    description="Probes Google Gemini API connectivity using the server-side key (or optional override) without logging it.",
)
@limiter.limit("20/minute")
async def validate_key(
    request: Request,
    payload: KeyValidationRequest = KeyValidationRequest(),
    api_key: Optional[str] = Depends(get_optional_gemini_api_key),
) -> KeyValidationResponse:
    """Validates the AI connection by executing a lightweight probe request against the Gemini API."""
    is_valid, model_tested, user_message = GeminiService.validate_api_key(
        api_key=api_key,
        model_name=payload.model,
    )

    return KeyValidationResponse(
        valid=is_valid,
        model=model_tested,
        message=user_message,
    )
