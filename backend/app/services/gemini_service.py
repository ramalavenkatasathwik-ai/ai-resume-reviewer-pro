import json
import re
import time
from typing import Optional, Tuple, Dict, Any

from fastapi import HTTPException, status
from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from pydantic import ValidationError

from app.core.config import get_settings
from app.core.logging import logger
from app.schemas.analysis import AnalysisResult

settings = get_settings()


class GeminiService:
    """Service handling all Google Gemini LLM interactions via the official Google GenAI SDK.
    
    Security & Architecture Guarantees:
    - BYOK request-scoped execution: Client is initialized per request using the user's ephemeral key.
    - Zero key persistence: Keys are never saved to disk, DB, logs, or responses.
    - Controlled model selection: Strictly enforced server-side allowlist.
    - Exponential backoff: Limited retries for transient 429/503 errors only.
    - Sanitized error translation: Never exposes raw Google SDK tracebacks or tokens.
    """

    @classmethod
    def resolve_model(cls, model_name: Optional[str] = None) -> str:
        """Validates and resolves the model identifier against the allowed server list."""
        chosen = (model_name or settings.GEMINI_MODEL).strip()
        if chosen not in settings.SUPPORTED_MODELS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "UNSUPPORTED_MODEL",
                    "message": f"Model '{chosen}' is not supported. Allowed models: {', '.join(settings.SUPPORTED_MODELS)}",
                },
            )
        return chosen

    @classmethod
    def validate_api_key(cls, api_key: str, model_name: Optional[str] = None) -> Tuple[bool, str, str]:
        """Probes the user-provided Gemini API key with a minimal request to verify validity.
        
        Returns:
            Tuple of (is_valid: bool, model_used: str, message: str)
        """
        model = cls.resolve_model(model_name)
        try:
            client = genai.Client(api_key=api_key)
            # Minimal probe to verify authentication without consuming significant tokens
            client.models.generate_content(
                model=model,
                contents="Ping",
                config=types.GenerateContentConfig(
                    max_output_tokens=5,
                    temperature=0.0,
                ),
            )
            return True, model, f"Successfully validated API key with {model}."
        except genai_errors.APIError as e:
            logger.warning("Gemini API key validation failed: code=%s", getattr(e, "code", None))
            code = getattr(e, "code", 400)
            if code in (400, 401, 403):
                return False, model, "The provided Google Gemini API key is invalid, inactive, or unauthorized."
            elif code == 429:
                return False, model, "Google Gemini rate limit or quota exceeded for this API key."
            return False, model, "Upstream Gemini service error during key validation."
        except Exception as e:
            logger.warning("Unexpected error during key validation: %s", type(e).__name__)
            return False, model, "Validation request failed due to an unexpected upstream error."

    @classmethod
    async def analyze_resume(
        cls,
        api_key: str,
        resume_text: str,
        target_role: str,
        model_name: Optional[str] = None,
    ) -> AnalysisResult:
        """Executes a structured resume analysis against Google Gemini using the caller's key."""
        model = cls.resolve_model(model_name)

        # Sanitize target role
        clean_target_role = target_role.strip()
        if not clean_target_role or len(clean_target_role) < 2 or len(clean_target_role) > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "INVALID_TARGET_ROLE",
                    "message": "Target role must be a descriptive job title between 2 and 100 characters.",
                },
            )

        client = genai.Client(api_key=api_key)

        prompt = f"""You are an elite executive recruiter and Applicant Tracking System (ATS) expert.
Evaluate the candidate's resume strictly and specifically for the target role: "{clean_target_role}".

STRICT EVALUATION RULES:
1. Base all scores, feedback, and candidate details strictly on verifiable evidence in the resume text.
2. Do NOT invent, fabricate, or hallucinate candidate names, contact details, experiences, or degrees.
3. If candidate contact info is not found, leave fields null.
4. Calculate integer scores (0-100) reflecting realistic ATS match and industry competitive benchmarks.
5. Provide actionable, high-impact suggestions tailored to the target role.
6. Output MUST strictly conform to the requested JSON schema.

RESUME CONTENT:
\"\"\"
{resume_text}
\"\"\"
"""

        max_retries = 3
        retry_delay = 1.0

        for attempt in range(1, max_retries + 1):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        response_mime_type="application/json",
                    ),
                )
                raw_text = response.text or ""
                return cls._parse_and_validate_response(raw_text, clean_target_role, model)

            except genai_errors.APIError as e:
                code = getattr(e, "code", 500)
                logger.warning("Gemini API error during analysis attempt %d/%d (code=%s)", attempt, max_retries, code)

                # Never retry client-side authentication or bad request errors
                if code in (400, 401, 403):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail={
                            "error": "INVALID_GEMINI_KEY",
                            "message": "The provided Gemini API key was rejected by Google Gemini as invalid or unauthorized.",
                        },
                    )

                # Rate limiting (429) or transient server errors (503)
                if code in (429, 503) and attempt < max_retries:
                    time.sleep(retry_delay)
                    retry_delay *= 2.0
                    continue

                if code == 429:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={
                            "error": "GEMINI_RATE_LIMIT",
                            "message": "Google Gemini API rate limit or quota exceeded. Please check your Gemini quota or try again in a few moments.",
                        },
                    )

                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail={
                        "error": "GEMINI_UPSTREAM_ERROR",
                        "message": "Google Gemini service encountered an error while processing the analysis. Please retry.",
                    },
                )

            except HTTPException:
                raise

            except Exception as e:
                logger.warning("Unexpected error during analysis attempt %d/%d: %s", attempt, max_retries, type(e).__name__)
                if attempt < max_retries:
                    time.sleep(retry_delay)
                    retry_delay *= 2.0
                    continue
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail={
                        "error": "GEMINI_COMMUNICATION_ERROR",
                        "message": "An unexpected error occurred while communicating with the Gemini service.",
                    },
                )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "GEMINI_TIMEOUT_OR_EXHAUSTED",
                "message": "Exhausted retries connecting to Google Gemini. Please try again later.",
            },
        )

    @classmethod
    def _parse_and_validate_response(cls, raw_text: str, target_role: str, model_used: str) -> AnalysisResult:
        """Safely parses model output and validates it against the AnalysisResult Pydantic schema."""
        cleaned = raw_text.strip()

        # Strip markdown fences if present
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned)
            cleaned = cleaned.strip()

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.warning("Failed to decode model JSON output: %s", e)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "error": "MALFORMED_GEMINI_RESPONSE",
                    "message": "Google Gemini returned a response that could not be parsed as valid JSON.",
                },
            )

        if not isinstance(data, dict):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "error": "MALFORMED_GEMINI_RESPONSE",
                    "message": "Google Gemini response did not contain a root JSON object.",
                },
            )

        # Inject context metadata
        data["target_role"] = target_role
        data["model_used"] = model_used

        try:
            return AnalysisResult.model_validate(data)
        except ValidationError as ve:
            logger.warning("Model output failed Pydantic schema validation: %s", ve.error_count())
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "error": "INVALID_ANALYSIS_SCHEMA",
                    "message": "The structured evaluation from Gemini failed schema verification.",
                },
            )
