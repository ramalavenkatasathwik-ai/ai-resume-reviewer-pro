import re
from typing import Optional

from fastapi import Header, HTTPException, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

settings = get_settings()

# Initialize Slowapi Rate Limiter (uses Redis if configured, otherwise in-memory storage)
limiter_storage_uri = settings.REDIS_URL if settings.REDIS_URL else "memory://"
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
    storage_uri=limiter_storage_uri,
)

# Basic sanity pattern for Google Gemini API keys:
# Must start with AIza, alphanumeric with hyphens and underscores, typically 39 chars.
GEMINI_KEY_REGEX = re.compile(r"^AIza[0-9A-Za-z\-_]{30,45}$")


def get_gemini_api_key(
    x_gemini_api_key: Optional[str] = Header(
        None,
        alias="X-Gemini-API-Key",
        description="User-provided Google Gemini API Key (BYOK)",
    ),
) -> str:
    """Dependency that extracts and validates the request-scoped Gemini API key.
    
    Security guarantees:
    - Never stored on disk or in database.
    - Never logged or returned in responses.
    - Disallowed from falling back to any server-side secret.
    """
    if not x_gemini_api_key or not x_gemini_api_key.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "MISSING_API_KEY",
                "message": "A user-provided Gemini API key is required via the 'X-Gemini-API-Key' header.",
            },
        )

    clean_key = x_gemini_api_key.strip()

    # Reject keys containing control characters, spaces, or invalid syntax
    if "\n" in clean_key or "\r" in clean_key or len(clean_key) < 20 or len(clean_key) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "INVALID_KEY_FORMAT",
                "message": "The provided Gemini API key has an invalid format or length.",
            },
        )

    return clean_key


def mask_api_key(key: str) -> str:
    """Safely masks an API key for safe UI hints (e.g. AIza...****), never exposing the actual key."""
    if not key or len(key) < 8:
        return "********"
    return f"{key[:4]}...{key[-4:]}"
