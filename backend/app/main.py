from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import setup_logging, logger
from app.core.security import limiter

settings = get_settings()
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifecycle events."""
    logger.info("Initializing AI Resume Reviewer Pro API (Environment: %s)", settings.APP_ENV)
    if settings.is_production and "*" in settings.CORS_ORIGINS:
        logger.warning("SECURITY ALERT: Wildcard CORS origin is configured in production environment!")
    yield
    logger.info("Shutting down AI Resume Reviewer Pro API.")


def create_application() -> FastAPI:
    """Application factory for FastAPI."""
    docs_url = "/docs" if not settings.is_production else None
    redoc_url = "/redoc" if not settings.is_production else None
    openapi_url = "/openapi.json" if not settings.is_production else None

    app = FastAPI(
        title="AI Resume Reviewer Pro API",
        description="Production Backend API for AI-powered Resume, ATS, and Career Analysis (BYOK)",
        version="0.2.0",
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        lifespan=lifespan,
    )

    # Attach Slowapi Rate Limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Security & Request Correlation Middleware
    @app.middleware("http")
    async def security_and_correlation_middleware(request: Request, call_next):
        import uuid
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; sandbox;"

        if settings.is_production or request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        return response

    # CORS configuration with strict origins + Vercel origin regex
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_origin_regex=settings.CORS_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Global handler for uncaught server errors to guarantee no credentials leak in tracebacks
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", "unknown")
        logger.error(
            "Unhandled exception [req_id=%s] processing '%s': %s",
            request_id,
            request.url.path,
            type(exc).__name__,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred. Please try again later.",
                "request_id": request_id,
            },
            headers={"X-Request-ID": request_id},
        )

    # Mount API routers at settings.API_PREFIX (/api)
    app.include_router(api_router, prefix=settings.API_PREFIX)

    # Mount root health check alias
    @app.get("/health", tags=["Health"], include_in_schema=False)
    async def root_health():
        return {"status": "healthy", "service": settings.APP_NAME}

    @app.get("/", tags=["Root"], include_in_schema=False)
    async def root():
        info = {
            "name": "AI Resume Reviewer Pro API",
            "version": "0.2.0",
            "health": f"{settings.API_PREFIX}/health",
            "models": f"{settings.API_PREFIX}/models",
        }
        if not settings.is_production:
            info["docs"] = "/docs"
        return info

    return app


app = create_application()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
