import pytest
from fastapi import status
from fastapi.testclient import TestClient
from httpx import AsyncClient


def test_health_endpoint_sync(client: TestClient) -> None:
    """Verify synchronous GET /api/health returns correct payload and 200 OK."""
    response = client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data == {
        "status": "healthy",
        "service": "ai-resume-reviewer-api",
    }
    assert data["status"] == "healthy"
    assert data["service"] == "ai-resume-reviewer-api"


@pytest.mark.asyncio
async def test_health_endpoint_async(async_client: AsyncClient) -> None:
    """Verify asynchronous GET /api/health returns correct payload and 200 OK."""
    response = await async_client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data == {
        "status": "healthy",
        "service": "ai-resume-reviewer-api",
    }


def test_root_health_alias(client: TestClient) -> None:
    """Verify root GET /health alias also responds correctly."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "healthy"
