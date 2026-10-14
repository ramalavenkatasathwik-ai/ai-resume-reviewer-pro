import logging
import re
from typing import Any

# Regex pattern matching Google API keys (typically AIza followed by 35 chars)
GEMINI_KEY_PATTERN = re.compile(r"AIza[0-9A-Za-z\-_]{30,45}", re.IGNORECASE)
# Generic API key header patterns
HEADER_KEY_PATTERN = re.compile(
    r"(x-gemini-api-key|authorization|bearer)[\s:=]+([^\s,;'\"]+)",
    re.IGNORECASE,
)


class SecretMaskingFilter(logging.Filter):
    """Logging filter that scrubs API keys and sensitive tokens from all log messages."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = self.mask_secrets(record.msg)
        if record.args:
            if isinstance(record.args, dict):
                record.args = {
                    k: (self.mask_secrets(v) if isinstance(v, str) else v)
                    for k, v in record.args.items()
                }
            elif isinstance(record.args, tuple):
                record.args = tuple(
                    (self.mask_secrets(arg) if isinstance(arg, str) else arg)
                    for arg in record.args
                )
        return True

    @classmethod
    def mask_secrets(cls, text: str) -> str:
        """Replace detected API keys or secret tokens with [REDACTED]."""
        if not isinstance(text, str):
            return text
        # Mask Google API keys
        sanitized = GEMINI_KEY_PATTERN.sub("[REDACTED_API_KEY]", text)
        # Mask header key appearances
        sanitized = HEADER_KEY_PATTERN.sub(r"\1: [REDACTED]", sanitized)
        return sanitized


def setup_logging(level: int = logging.INFO) -> None:
    """Configures structured, secret-safe logging across the application."""
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Avoid duplicate handlers if already attached
    if not any(isinstance(f, SecretMaskingFilter) for f in root_logger.filters):
        masking_filter = SecretMaskingFilter()
        root_logger.addFilter(masking_filter)

        # Also attach filter to existing handlers
        for handler in root_logger.handlers:
            handler.addFilter(masking_filter)

        # Also attach to uvicorn and fastapi loggers
        for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error", "fastapi"):
            l = logging.getLogger(logger_name)
            l.addFilter(masking_filter)


logger = logging.getLogger("ai-resume-reviewer")
