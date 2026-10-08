from typing import AsyncGenerator, Generator
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    """Synchronous test client fixture."""
    with TestClient(app) as test_client:
        yield test_client


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Asynchronous test client fixture."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
