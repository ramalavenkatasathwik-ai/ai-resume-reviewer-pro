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
    app = FastAPI(
        title="AI Resume Reviewer Pro API",
        description="Production Backend API for AI-powered Resume, ATS, and Career Analysis (BYOK)",
        version="0.2.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Attach Slowapi Rate Limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS configuration with strict origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Global handler for uncaught server errors to guarantee no credentials leak in tracebacks
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception processing request '%s': %s", request.url.path, type(exc).__name__)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred. Please try again later.",
            },
        )

    # Mount API routers at settings.API_PREFIX (/api)
    app.include_router(api_router, prefix=settings.API_PREFIX)

    # Mount root health check alias
    @app.get("/health", tags=["Health"], include_in_schema=False)
    async def root_health():
        return {"status": "healthy", "service": settings.APP_NAME}

    @app.get("/", tags=["Root"], include_in_schema=False)
    async def root():
        return {
            "name": "AI Resume Reviewer Pro API",
            "version": "0.2.0",
            "docs": "/docs",
            "health": f"{settings.API_PREFIX}/health",
            "models": f"{settings.API_PREFIX}/models",
        }

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
