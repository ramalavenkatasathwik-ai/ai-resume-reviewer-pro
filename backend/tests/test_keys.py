from unittest.mock import patch
from fastapi import status
from fastapi.testclient import TestClient


def test_validate_key_missing_header(client: TestClient) -> None:
    """Verify endpoint rejects request without X-Gemini-API-Key header with 401."""
    response = client.post("/api/keys/validate", json={})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    data = response.json()
    assert "error" in data["detail"]
    assert data["detail"]["error"] == "MISSING_API_KEY"


def test_validate_key_empty_header(client: TestClient) -> None:
    """Verify endpoint rejects empty or whitespace-only API keys with 401."""
    response = client.post(
        "/api/keys/validate",
        headers={"X-Gemini-API-Key": "   "},
        json={},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_validate_key_malformed_header(client: TestClient) -> None:
    """Verify endpoint rejects control characters or excessively short keys with 400."""
    response = client.post(
        "/api/keys/validate",
        headers={"X-Gemini-API-Key": "short\nkey"},
        json={},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_validate_key_unsupported_model(client: TestClient, valid_headers: dict) -> None:
    """Verify endpoint rejects unsupported model identifier with 400."""
    response = client.post(
        "/api/keys/validate",
        headers=valid_headers,
        json={"model": "unsupported-fake-model-xyz"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "UNSUPPORTED_MODEL" in response.text


def test_validate_key_success_mocked(client: TestClient, valid_headers: dict) -> None:
    """Verify successful key validation returns valid: True and never returns the key."""
    with patch(
        "app.services.gemini_service.GeminiService.validate_api_key",
        return_value=(True, "gemini-2.5-flash", "Successfully validated API key."),
    ):
        response = client.post(
            "/api/keys/validate",
            headers=valid_headers,
            json={"model": "gemini-2.5-flash"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is True
        assert data["model"] == "gemini-2.5-flash"
        assert "Successfully validated" in data["message"]

        # Critical security check: Key is never returned in response body or headers
        raw_response_text = response.text
        assert valid_headers["X-Gemini-API-Key"] not in raw_response_text


def test_validate_key_invalid_credentials_mocked(client: TestClient, valid_headers: dict) -> None:
    """Verify invalid credentials return valid: False with a sanitized user-friendly message."""
    with patch(
        "app.services.gemini_service.GeminiService.validate_api_key",
        return_value=(False, "gemini-2.5-flash", "The provided Google Gemini API key is invalid, inactive, or unauthorized."),
    ):
        response = client.post(
            "/api/keys/validate",
            headers=valid_headers,
            json={"model": "gemini-2.5-flash"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is False
        assert "invalid" in data["message"].lower()
