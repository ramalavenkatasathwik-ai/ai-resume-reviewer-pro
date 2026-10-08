from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifecycle events."""
    # Startup actions
    yield
    # Shutdown actions


def create_application() -> FastAPI:
    """Application factory for FastAPI."""
    app = FastAPI(
        title="AI Resume Reviewer Pro API",
        description="Backend API for AI-powered Resume, ATS, and Career Analysis",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API routes mounted at settings.API_PREFIX (/api)
    app.include_router(api_router, prefix=settings.API_PREFIX)

    # Also mount health check at root /health for convenience
    @app.get("/health", tags=["Health"], include_in_schema=False)
    async def root_health():
        return {"status": "healthy", "service": settings.APP_NAME}

    @app.get("/", tags=["Root"], include_in_schema=False)
    async def root():
        return {
            "name": "AI Resume Reviewer Pro API",
            "version": "0.1.0",
            "docs": "/docs",
            "health": f"{settings.API_PREFIX}/health",
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
