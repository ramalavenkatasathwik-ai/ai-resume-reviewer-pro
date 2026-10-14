import re
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import Header, HTTPException, Request, Depends, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database.database import get_db
from app.models.user import User

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
        description="Optional client-provided Google Gemini API Key fallback",
    ),
) -> str:
    """Dependency that resolves the active server-side or request-scoped Gemini API key.
    
    Architecture & Security:
    - Primary source: Server-side configured GEMINI_API_KEY from environment variables.
    - Fallback source: Client-provided X-Gemini-API-Key header (for automated testing or admin override).
    - If neither is configured, raises safe HTTP 503 SERVICE_UNAVAILABLE.
    - Never logged, persisted, or returned in responses.
    """
    if x_gemini_api_key is not None:
        key = x_gemini_api_key.strip()
        if not key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "MISSING_API_KEY", "message": "X-Gemini-API-Key header cannot be empty."},
            )
        if not GEMINI_KEY_REGEX.match(key):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "INVALID_API_KEY_FORMAT", "message": "API key format is invalid."},
            )
        return key

    key = (settings.GEMINI_API_KEY or "").strip()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "GEMINI_NOT_CONFIGURED",
                "message": "AI service is currently unavailable. The server-side Gemini API key has not been configured by the administrator.",
            },
        )
    return key


def get_optional_gemini_api_key(
    x_gemini_api_key: Optional[str] = Header(
        None,
        alias="X-Gemini-API-Key",
        description="Optional client-provided Google Gemini API Key fallback",
    ),
) -> Optional[str]:
    """Dependency that returns server-side GEMINI_API_KEY or optional header key."""
    if x_gemini_api_key is not None:
        key = x_gemini_api_key.strip()
        if not key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "MISSING_API_KEY", "message": "X-Gemini-API-Key header cannot be empty."},
            )
        if not GEMINI_KEY_REGEX.match(key):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "INVALID_API_KEY_FORMAT", "message": "API key format is invalid."},
            )
        return key

    key = (settings.GEMINI_API_KEY or "").strip()
    return key if key else None


def mask_api_key(key: str) -> str:
    """Safely masks an API key for safe UI hints (e.g. AIza...****), never exposing the actual key."""
    if not key or len(key) < 8:
        return "********"
    return f"{key[:4]}...{key[-4:]}"


# --- Phase 6: Authentication & Password Security ---

def hash_password(password: str) -> str:
    """Hash password using bcrypt with strong salt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hash in constant time."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create signed HS256 JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate signed JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.PyJWTError:
        return None


def generate_reset_token() -> str:
    """Generate cryptographically secure high-entropy random URL-safe token."""
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    """Hash reset token using SHA-256 for secure database lookup without storing plain token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_token_from_request(request: Request) -> Optional[str]:
    """Extract auth token from Authorization header or HttpOnly cookie."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        if token:
            return token

    # Fallback to HttpOnly session cookie
    cookie_token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if cookie_token and cookie_token.strip():
        return cookie_token.strip()

    return None


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Dependency that enforces authentication and returns current active User with token revocation verification."""
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "UNAUTHORIZED", "message": "Authentication credentials were not provided."},
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "INVALID_TOKEN", "message": "Invalid or expired session token."},
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "USER_NOT_FOUND", "message": "User account was not found or is deactivated."},
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Token revocation check: if token version in payload does not match user's current version
    token_v = payload.get("v")
    if token_v is not None and token_v != getattr(user, "token_version", 1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "TOKEN_REVOKED", "message": "Session has been revoked or invalidated. Please log in again."},
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_optional_current_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Dependency that extracts current User if authenticated, or returns None without failing."""
    token = get_token_from_request(request)
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        return None

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        return None

    # Verify token revocation if token version present
    token_v = payload.get("v")
    if token_v is not None and token_v != getattr(user, "token_version", 1):
        return None

    return user


# Convenience alias for active user dependency
get_current_active_user = get_current_user


