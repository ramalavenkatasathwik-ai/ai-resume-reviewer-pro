from app.core.config import get_settings
from app.schemas.health import HealthResponse

settings = get_settings()


def check_health() -> HealthResponse:
    """Returns the application health status."""
    return HealthResponse(
        status="healthy",
        service=settings.APP_NAME,
    )
