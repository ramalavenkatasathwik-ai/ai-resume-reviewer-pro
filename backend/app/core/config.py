from functools import lru_cache
from typing import List, Union, Optional
import json

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application settings
    APP_NAME: str = "ai-resume-reviewer-api"
    APP_ENV: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    API_PREFIX: str = "/api"

    # Database settings
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/resume_reviewer"

    # CORS settings
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # Server-Side Gemini LLM Configuration (Shared Admin Key)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-4-argon"
    SUPPORTED_MODELS: List[str] = [
        "gemini-4-argon",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
    ]

    # AI Cost Protection & Emergency Killswitch
    AI_EMERGENCY_DISABLE: bool = False
    AI_DAILY_QUOTA_PER_USER: int = 100
    MAX_INPUT_TEXT_CHARS: int = 50000

    # Upload configuration
    MAX_UPLOAD_SIZE_MB: int = 10
    MAX_UPLOAD_PAGES: int = 30

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_ANALYZE_PER_MINUTE: int = 10
    REDIS_URL: Optional[str] = None

    # Authentication and Session Security
    SECRET_KEY: str = "ai-resume-reviewer-pro-secret-key-development-minimum-32-chars-long"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    AUTH_COOKIE_NAME: str = "auth_token"
    AUTH_COOKIE_SECURE: bool = False  # Set to True in production (HTTPS)
    AUTH_COOKIE_SAMESITE: str = "lax"

    # Password Reset & Email Delivery Configuration
    EMAIL_PROVIDER: str = "smtp"  # "smtp", "resend", "sendgrid", "none"
    EMAIL_API_KEY: Optional[str] = None
    EMAIL_FROM_ADDRESS: Optional[str] = None
    EMAIL_FROM_NAME: str = "AI Resume Reviewer Pro"
    PUBLIC_APP_URL: str = "http://localhost:5173"
    MAX_EMAIL_ATTACHMENT_SIZE_MB: int = 15
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@resume-reviewer.local"
    SMTP_USE_TLS: bool = True
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 15

    # Official LinkedIn API settings (optional, enabled only when approved permissions are configured)
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None
    LINKEDIN_ACCESS_TOKEN: Optional[str] = None

    # Storage settings
    STORAGE_PROVIDER: str = "local"  # "local" or "supabase"
    STORAGE_LOCAL_DIR: str = "storage/private"
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_STORAGE_BUCKET: str = "resumes-private"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return ["http://localhost:5173", "http://localhost:3000"]
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed]
                except json.JSONDecodeError:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return [str(item).strip() for item in v]
        return ["http://localhost:5173", "http://localhost:3000"]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"

    @property
    def is_smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_PORT)

    @property
    def is_email_configured(self) -> bool:
        provider = (self.EMAIL_PROVIDER or "none").strip().lower()
        if provider == "none":
            return False
        if provider in ("resend", "sendgrid"):
            return bool(self.EMAIL_API_KEY and self.EMAIL_API_KEY.strip())
        if provider == "smtp":
            return bool(self.SMTP_HOST and self.SMTP_PORT)
        return False

    @property
    def is_gemini_configured(self) -> bool:
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip())

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    return Settings()
