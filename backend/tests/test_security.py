import logging
from app.core.logging import SecretMaskingFilter
from app.models.analysis import AnalysisHistory


def test_log_masking_filter_scrubs_gemini_key() -> None:
    """Verify SecretMaskingFilter redacts standard Gemini API keys."""
    raw_message = "Calling Gemini API with key AIzaSyD1234567890abcdefghijklmnopqrstuv"
    sanitized = SecretMaskingFilter.mask_secrets(raw_message)
    assert "AIzaSyD1234567890abcdefghijklmnopqrstuv" not in sanitized
    assert "[REDACTED_API_KEY]" in sanitized


def test_log_masking_filter_scrubs_header() -> None:
    """Verify SecretMaskingFilter redacts X-Gemini-API-Key headers."""
    raw_message = "Headers: X-Gemini-API-Key: AIzaFakeKeySecretToken1234567890"
    sanitized = SecretMaskingFilter.mask_secrets(raw_message)
    assert "AIzaFakeKeySecretToken1234567890" not in sanitized
    assert "[REDACTED" in sanitized


def test_database_model_has_no_key_columns() -> None:
    """Verify AnalysisHistory model contains zero credentials or key persistence columns."""
    column_names = [c.name for c in AnalysisHistory.__table__.columns]
    for col in column_names:
        assert "key" not in col.lower()
        assert "secret" not in col.lower()
        assert "token" not in col.lower()
        assert "password" not in col.lower()


def test_logging_record_redaction() -> None:
    """Verify SecretMaskingFilter works seamlessly when attached to a logging.Logger."""
    logger = logging.getLogger("test_security_redactor")
    logger.handlers.clear()
    logger.filters.clear()

    filter_instance = SecretMaskingFilter()
    logger.addFilter(filter_instance)

    record = logger.makeRecord(
        name="test_security_redactor",
        level=logging.INFO,
        fn="test_security.py",
        lno=42,
        msg="Authenticated user with AIzaSyD999999999999999999999999999999999",
        args=(),
        exc_info=None,
    )
    filter_instance.filter(record)
    assert "AIzaSyD999999999999999999999999999999999" not in record.msg
    assert "[REDACTED_API_KEY]" in record.msg
