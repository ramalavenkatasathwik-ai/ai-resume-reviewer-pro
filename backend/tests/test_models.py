from fastapi import status
from fastapi.testclient import TestClient

from app.core.config import get_settings

settings = get_settings()


def test_get_models_list(client: TestClient) -> None:
    """Verify GET /api/models returns 200 and allowed models list."""
    response = client.get("/api/models")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "models" in data
    assert "default_model" in data
    assert data["default_model"] == settings.GEMINI_MODEL

    model_ids = [m["id"] for m in data["models"]]
    for supported in settings.SUPPORTED_MODELS:
        assert supported in model_ids

    # Validate structure of each model item
    for model in data["models"]:
        assert "id" in model
        assert "name" in model
        assert "description" in model
        assert "recommended" in model
        assert "is_default" in model
        assert "context_window" in model
        if model["id"] == settings.GEMINI_MODEL:
            assert model["is_default"] is True
