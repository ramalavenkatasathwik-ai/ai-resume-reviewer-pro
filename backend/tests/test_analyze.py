import io
import json
from unittest.mock import patch, AsyncMock
from fastapi import status, HTTPException
from fastapi.testclient import TestClient

from app.schemas.analysis import AnalysisResult


def test_analyze_server_key_missing(client: TestClient, valid_pdf_bytes: bytes) -> None:
    """Verify analyze endpoint returns 503 GEMINI_NOT_CONFIGURED when server key is not configured."""
    with patch("app.core.security.settings.GEMINI_API_KEY", None):
        files = {"file": ("resume.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")}
        data = {"target_role": "Backend Engineer"}
        response = client.post("/api/analyze", files=files, data=data)
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert "GEMINI_NOT_CONFIGURED" in response.text


def test_analyze_without_client_header_success(
    client: TestClient,
    valid_pdf_bytes: bytes,
    mock_analysis_dict: dict,
) -> None:
    """Verify resume analysis succeeds using server-side key without client supplying any key."""
    expected_result = AnalysisResult.model_validate(mock_analysis_dict)

    with patch(
        "app.services.gemini_service.GeminiService.analyze_resume",
        new_callable=AsyncMock,
        return_value=expected_result,
    ):
        files = {"file": ("resume.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")}
        data = {"target_role": "Senior Backend Engineer"}
        response = client.post("/api/analyze", files=files, data=data)

        assert response.status_code == status.HTTP_200_OK
        res_json = response.json()
        assert res_json["overall_score"] == 88
        assert res_json["candidate_information"]["name"] == "Jane Doe"


def test_analyze_invalid_extension(client: TestClient, valid_headers: dict) -> None:
    """Verify analyze endpoint rejects non-PDF file extension with 400."""
    files = {"file": ("resume.docx", io.BytesIO(b"dummy docx content"), "application/octet-stream")}
    data = {"target_role": "Backend Engineer"}
    response = client.post("/api/analyze", headers=valid_headers, files=files, data=data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "INVALID_FILE_TYPE" in response.text


def test_analyze_empty_pdf(client: TestClient, valid_headers: dict) -> None:
    """Verify analyze endpoint rejects 0-byte PDF with 400."""
    files = {"file": ("resume.pdf", io.BytesIO(b""), "application/pdf")}
    data = {"target_role": "Backend Engineer"}
    response = client.post("/api/analyze", headers=valid_headers, files=files, data=data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "EMPTY_FILE" in response.text


def test_analyze_corrupt_pdf_header(client: TestClient, valid_headers: dict) -> None:
    """Verify analyze endpoint rejects files not starting with %PDF- header with 400."""
    files = {"file": ("resume.pdf", io.BytesIO(b"This is not a real PDF file!"), "application/pdf")}
    data = {"target_role": "Backend Engineer"}
    response = client.post("/api/analyze", headers=valid_headers, files=files, data=data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "CORRUPT_OR_INVALID_PDF" in response.text


def test_analyze_oversized_pdf(client: TestClient, valid_headers: dict) -> None:
    """Verify analyze endpoint rejects PDFs exceeding MAX_UPLOAD_SIZE_MB with 413."""
    # Create fake oversized content (> 10MB) starting with %PDF-
    large_content = b"%PDF-" + b"0" * (11 * 1024 * 1024)
    files = {"file": ("resume.pdf", io.BytesIO(large_content), "application/pdf")}
    data = {"target_role": "Backend Engineer"}
    response = client.post("/api/analyze", headers=valid_headers, files=files, data=data)
    assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    assert "FILE_TOO_LARGE" in response.text


def test_analyze_invalid_target_role(client: TestClient, valid_headers: dict, valid_pdf_bytes: bytes) -> None:
    """Verify analyze endpoint rejects empty or 1-char target roles with 400."""
    files = {"file": ("resume.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")}
    data = {"target_role": " "}
    response = client.post("/api/analyze", headers=valid_headers, files=files, data=data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "INVALID_TARGET_ROLE" in response.text


def test_analyze_unsupported_model(client: TestClient, valid_headers: dict, valid_pdf_bytes: bytes) -> None:
    """Verify analyze endpoint rejects unsupported model identifier with 400."""
    files = {"file": ("resume.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")}
    data = {"target_role": "Backend Engineer", "model": "invalid-gemini-model-999"}
    response = client.post("/api/analyze", headers=valid_headers, files=files, data=data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "UNSUPPORTED_MODEL" in response.text


def test_analyze_success_mocked(
    client: TestClient,
    valid_headers: dict,
    valid_pdf_bytes: bytes,
    mock_analysis_dict: dict,
) -> None:
    """Verify successful resume analysis returns validated structured JSON without leaking the key."""
    expected_result = AnalysisResult.model_validate(mock_analysis_dict)

    with patch(
        "app.services.gemini_service.GeminiService.analyze_resume",
        new_callable=AsyncMock,
        return_value=expected_result,
    ):
        files = {"file": ("resume.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")}
        data = {"target_role": "Senior Backend Engineer", "model": "gemini-2.5-flash"}
        response = client.post("/api/analyze", headers=valid_headers, files=files, data=data)

        assert response.status_code == status.HTTP_200_OK
        res_json = response.json()
        assert res_json["overall_score"] == 88
        assert res_json["ats_score"] == 92
        assert res_json["candidate_information"]["name"] == "Jane Doe"
        assert res_json["target_role"] == "Senior Backend Engineer"
        assert len(res_json["ats_keywords"]) > 0

        # Security check: User key must not appear anywhere in the response
        assert valid_headers["X-Gemini-API-Key"] not in response.text


def test_analyze_gemini_auth_error_mocked(
    client: TestClient,
    valid_headers: dict,
    valid_pdf_bytes: bytes,
) -> None:
    """Verify upstream Gemini 401/403 is translated into a sanitized 401 error."""
    with patch(
        "app.services.gemini_service.GeminiService.analyze_resume",
        new_callable=AsyncMock,
        side_effect=HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "INVALID_GEMINI_KEY", "message": "Key rejected."},
        ),
    ):
        files = {"file": ("resume.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")}
        data = {"target_role": "Software Engineer"}
        response = client.post("/api/analyze", headers=valid_headers, files=files, data=data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "INVALID_GEMINI_KEY" in response.text


def test_analyze_gemini_rate_limit_mocked(
    client: TestClient,
    valid_headers: dict,
    valid_pdf_bytes: bytes,
) -> None:
    """Verify upstream Gemini 429 is translated into a sanitized 429 error."""
    with patch(
        "app.services.gemini_service.GeminiService.analyze_resume",
        new_callable=AsyncMock,
        side_effect=HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": "GEMINI_RATE_LIMIT", "message": "Rate limit exceeded."},
        ),
    ):
        files = {"file": ("resume.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")}
        data = {"target_role": "Software Engineer"}
        response = client.post("/api/analyze", headers=valid_headers, files=files, data=data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "GEMINI_RATE_LIMIT" in response.text


def test_analyze_gemini_upstream_failure_mocked(
    client: TestClient,
    valid_headers: dict,
    valid_pdf_bytes: bytes,
) -> None:
    """Verify upstream Gemini 500/503 is translated into a sanitized 502 error."""
    with patch(
        "app.services.gemini_service.GeminiService.analyze_resume",
        new_callable=AsyncMock,
        side_effect=HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error": "GEMINI_UPSTREAM_ERROR", "message": "Upstream error."},
        ),
    ):
        files = {"file": ("resume.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")}
        data = {"target_role": "Software Engineer"}
        response = client.post("/api/analyze", headers=valid_headers, files=files, data=data)
        assert response.status_code == status.HTTP_502_BAD_GATEWAY
        assert "GEMINI_UPSTREAM_ERROR" in response.text


def test_analyze_malformed_gemini_response_mocked(
    client: TestClient,
    valid_headers: dict,
    valid_pdf_bytes: bytes,
) -> None:
    """Verify malformed JSON from Gemini is safely caught and returns 502 without traceback."""
    with patch(
        "app.services.gemini_service.GeminiService.analyze_resume",
        new_callable=AsyncMock,
        side_effect=HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error": "MALFORMED_GEMINI_RESPONSE", "message": "Invalid JSON from model."},
        ),
    ):
        files = {"file": ("resume.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")}
        data = {"target_role": "Software Engineer"}
        response = client.post("/api/analyze", headers=valid_headers, files=files, data=data)
        assert response.status_code == status.HTTP_502_BAD_GATEWAY
        assert "MALFORMED_GEMINI_RESPONSE" in response.text
