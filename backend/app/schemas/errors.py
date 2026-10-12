from typing import Optional, Any, Dict
from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """Sanitized, standardized error response structure."""
    error: str = Field(..., description="Machine-readable error classification code")
    message: str = Field(..., description="Human-readable sanitized error description")
    details: Optional[Dict[str, Any]] = Field(None, description="Optional non-sensitive diagnostic details")
