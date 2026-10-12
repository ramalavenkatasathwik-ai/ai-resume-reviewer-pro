from typing import Optional
from pydantic import BaseModel, Field


class KeyValidationRequest(BaseModel):
    """Optional payload for key validation."""
    model: Optional[str] = Field(
        None,
        description="Optional model identifier to validate key against (defaults to server default)",
    )


class KeyValidationResponse(BaseModel):
    """Sanitized validation result for user-provided Gemini API key."""
    valid: bool = Field(..., description="Whether the key is valid and authenticated against Gemini")
    model: str = Field(..., description="The Gemini model tested")
    message: str = Field(..., description="User-friendly explanation of validation result")
