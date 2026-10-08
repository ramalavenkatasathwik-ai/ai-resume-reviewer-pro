from fastapi import APIRouter, status

from app.schemas.health import HealthResponse
from app.services.health import check_health

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Application Health Check",
    description="Returns current operational status of the service.",
)
async def get_health() -> HealthResponse:
    """Endpoint for uptime monitoring and connectivity verification."""
    return check_health()
