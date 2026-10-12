from fastapi import APIRouter, Depends, Request, status

from app.core.security import get_gemini_api_key, limiter
from app.schemas.keys import KeyValidationRequest, KeyValidationResponse
from app.services.gemini_service import GeminiService

router = APIRouter(prefix="/keys", tags=["API Keys"])


@router.post(
    "/validate",
    response_model=KeyValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate User-Provided Gemini API Key",
    description="Probes the user's BYOK Gemini key against Google Gemini without saving or logging it.",
)
@limiter.limit("20/minute")
async def validate_key(
    request: Request,
    payload: KeyValidationRequest = KeyValidationRequest(),
    api_key: str = Depends(get_gemini_api_key),
) -> KeyValidationResponse:
    """Validates an API key by executing a lightweight probe request against the Gemini API."""
    is_valid, model_tested, user_message = GeminiService.validate_api_key(
        api_key=api_key,
        model_name=payload.model,
    )

    return KeyValidationResponse(
        valid=is_valid,
        model=model_tested,
        message=user_message,
    )
