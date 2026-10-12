import os
import pytest

from app.services.gemini_service import GeminiService


@pytest.mark.integration
def test_real_gemini_api_key_validation_live():
    """Optional live integration test. Only executed when GEMINI_INTEGRATION_TEST_KEY is provided."""
    real_key = os.getenv("GEMINI_INTEGRATION_TEST_KEY")
    if not real_key:
        pytest.skip("Skipping live Gemini integration test: GEMINI_INTEGRATION_TEST_KEY environment variable is not set.")

    is_valid, model, message = GeminiService.validate_api_key(real_key)
    assert is_valid is True
    assert "Successfully validated" in message
