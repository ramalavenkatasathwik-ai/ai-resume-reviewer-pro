import json
import re
import time
import uuid
from typing import Optional, List, Dict, Any

from fastapi import HTTPException, status
from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from pydantic import ValidationError

from app.core.config import get_settings
from app.core.logging import logger
from app.schemas.linkedin import (
    LinkedInAnalysisResult,
    CoverageInformation,
    ScoreDetail,
)
from app.services.gemini_service import GeminiService

settings = get_settings()


class LinkedInService:
    """Service orchestrating deep LinkedIn profile evaluation using the official Google GenAI SDK.
    
    Security & Architecture Guarantees:
    - BYOK request-scoped execution: Keys are ephemeral and never logged, persisted, or returned.
    - Honest coverage: Inaccessible sections are explicitly marked as unavailable rather than penalized as zero-quality.
    - Zero hallucination: Never creates fake positions, employers, or metrics.
    - Robust schema verification: Ensures 100% compliant structured responses.
    """

    STANDARD_SECTIONS = [
        "identity",
        "headline",
        "about",
        "experience",
        "education",
        "skills",
        "projects",
        "certifications",
        "keyword_optimization",
        "target_role_alignment",
    ]

    @classmethod
    async def analyze_profile(
        cls,
        api_key: str,
        profile_content: str,
        target_role: str,
        input_type: str,
        profile_url: Optional[str] = None,
        model_name: Optional[str] = None,
        extra_limitations: Optional[List[str]] = None,
        original_filename: Optional[str] = None,
        extraction_method: Optional[str] = "embedded_text",
        pdf_bytes: Optional[bytes] = None,
    ) -> LinkedInAnalysisResult:
        """Executes a structured LinkedIn profile review against Google Gemini."""
        model = GeminiService.resolve_model(model_name)

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

        prompt = f"""You are a World-Class Executive Career Coach, Principal Tech Recruiter, and LinkedIn Profile Optimization Authority.
Analyze the following candidate's LinkedIn profile thoroughly and specifically benchmark it for the target role: "{clean_target_role}".

STRICT EVALUATION & ETHICAL PRINCIPLES:
1. Base all scores, extracted details, and suggestions strictly on verifiable facts present in the profile content.
2. NEVER invent, fabricate, or hallucinate candidate names, employers, job titles, education, or metrics.
3. If a section (e.g. About, Experience, Projects, Certifications) is NOT present or was inaccessible in the input:
   - Set "is_available": false for that section.
   - List that section name in "unavailable_sections".
   - In its score card, clearly explain that this section could not be assessed due to lack of provided profile evidence.
   - Do NOT give an unfair 0 score that drags down the overall score if the section was simply inaccessible; score based on what was available.
   - For "profile_completeness", score accurately based on how many standard profile elements are present.
4. "overall_score" must be an integer (0-100) reflecting a balanced composite of available sections.
5. All 10 section scores must have integer "score" (0-100), "explanation", "supporting_evidence" (list of strings), and "recommended_actions" (list of strings).
6. Provide concrete, high-impact suggestions tailored to "{clean_target_role}":
   - Suggested improved headlines (at least 3 variations).
   - Suggested rewritten About summary.
   - Suggested rewritten experience bullet points with action verbs and quantifiable placeholders.
   - 4-week prioritized 30-day action plan.
7. Return a single strictly valid JSON object matching the requested schema.

PROFILE CONTENT TO EVALUATE:
\"\"\"
{profile_content}
\"\"\"

JSON Output Schema Specification:
{{
  "profile_identity": {{
    "name": "string or null",
    "headline": "string or null",
    "current_position": "string or null",
    "industry": "string or null",
    "location": "string or null",
    "profile_url": "string or null",
    "professional_positioning": "string or null"
  }},
  "available_sections": ["list of section strings present"],
  "unavailable_sections": ["list of section strings absent"],
  "overall_score": {{
    "score": 85,
    "explanation": "summary explanation",
    "supporting_evidence": ["evidence point 1"],
    "recommended_actions": ["action 1"]
  }},
  "section_scores": {{
    "headline": {{ "score": 80, "explanation": "...", "supporting_evidence": [], "recommended_actions": [] }},
    "about": {{ "score": 75, "explanation": "...", "supporting_evidence": [], "recommended_actions": [] }},
    "experience": {{ "score": 85, "explanation": "...", "supporting_evidence": [], "recommended_actions": [] }},
    "skills": {{ "score": 80, "explanation": "...", "supporting_evidence": [], "recommended_actions": [] }},
    "education": {{ "score": 90, "explanation": "...", "supporting_evidence": [], "recommended_actions": [] }},
    "projects": {{ "score": 70, "explanation": "...", "supporting_evidence": [], "recommended_actions": [] }},
    "certifications": {{ "score": 65, "explanation": "...", "supporting_evidence": [], "recommended_actions": [] }},
    "keyword_optimization": {{ "score": 78, "explanation": "...", "supporting_evidence": [], "recommended_actions": [] }},
    "profile_completeness": {{ "score": 80, "explanation": "...", "supporting_evidence": [], "recommended_actions": [] }},
    "target_role_alignment": {{ "score": 82, "explanation": "...", "supporting_evidence": [], "recommended_actions": [] }}
  }},
  "headline_analysis": {{
    "clarity_and_specificity": "analysis text",
    "relevant_keywords": ["keyword1"],
    "target_role_alignment": "analysis text",
    "value_proposition": "analysis text",
    "suggested_improved_headlines": ["headline suggestion 1", "headline suggestion 2", "headline suggestion 3"],
    "strengths": ["strength 1"],
    "weaknesses": ["weakness 1"]
  }},
  "about_analysis": {{
    "is_available": true,
    "introduction_and_identity": "...",
    "career_narrative": "...",
    "evidence_of_impact": "...",
    "keyword_coverage": "...",
    "grammar_and_readability": "...",
    "missing_information": ["missing point"],
    "suggested_rewritten_about": "rewritten about text",
    "strengths": [],
    "weaknesses": []
  }},
  "experience_analysis": {{
    "is_available": true,
    "roles_analyzed_count": 1,
    "roles": [
      {{
        "job_title": "string",
        "organization": "string",
        "dates": "string or null",
        "description": "string or null",
        "responsibilities": [],
        "achievements": [],
        "quantifiable_outcomes": [],
        "relevant_skills": [],
        "keyword_coverage": [],
        "missing_metrics": [],
        "suggested_rewritten_description": "string or null"
      }}
    ],
    "overall_experience_strengths": [],
    "overall_experience_weaknesses": [],
    "missing_evidence_summary": []
  }},
  "education_analysis": {{
    "is_available": true,
    "items": [
      {{
        "institution": "string",
        "degree": "string or null",
        "field_of_study": "string or null",
        "dates": "string or null",
        "achievements": [],
        "relevance_to_target_role": "string or null"
      }}
    ],
    "strengths": [],
    "weaknesses": []
  }},
  "skills_analysis": {{
    "is_available": true,
    "listed_skills": [],
    "role_relevant_skills": [],
    "missing_or_weakly_evidenced_skills": [],
    "duplicate_or_redundant_skills": [],
    "suggested_skill_prioritization": [],
    "skills_supported_by_evidence": []
  }},
  "project_analysis": {{
    "is_available": true,
    "items": [
      {{
        "title": "string",
        "technical_stack": [],
        "problem_and_solution": "string or null",
        "outcomes_and_impact": "string or null",
        "missing_details": [],
        "suggested_rewritten_description": "string or null"
      }}
    ],
    "strengths": [],
    "weaknesses": []
  }},
  "additional_sections": {{
    "certifications": [],
    "courses": [],
    "publications": [],
    "recommendations_summary": null,
    "volunteer_experience": [],
    "honors_and_awards": [],
    "languages": [],
    "unavailable_sections_notes": []
  }},
  "keyword_analysis": {{
    "found_keywords": [],
    "missing_critical_keywords": [],
    "keyword_density_assessment": "string",
    "strategic_placement_advice": []
  }},
  "target_role_alignment": {{
    "target_role": "{clean_target_role}",
    "alignment_score": 82,
    "demonstrated_competencies": [],
    "critical_skill_gaps": [],
    "recommended_keywords": [],
    "suggested_headline": "string",
    "suggested_about_summary": "string",
    "experience_improvement_points": [],
    "recommended_projects": [],
    "recommended_certifications": [],
    "prioritized_30_day_plan": [
      {{ "week": 1, "focus_title": "Headline & Profile Positioning", "action_items": [] }},
      {{ "week": 2, "focus_title": "About & Experience Quantifiable Metrics", "action_items": [] }},
      {{ "week": 3, "focus_title": "Skill Endorsements & Proof Projects", "action_items": [] }},
      {{ "week": 4, "focus_title": "Networking & Thought Leadership", "action_items": [] }}
    ]
  }},
  "limitations": []
}}
"""

        contents_payload: Any = prompt
        if extraction_method == "gemini_multimodal_pdf" and pdf_bytes:
            contents_payload = [
                prompt,
                types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
            ]

        max_retries = 3
        retry_delay = 1.0

        for attempt in range(1, max_retries + 1):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=contents_payload,
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        response_mime_type="application/json",
                    ),
                )
                raw_text = response.text or ""
                return cls._parse_and_validate_response(
                    raw_text=raw_text,
                    target_role=clean_target_role,
                    input_type=input_type,
                    profile_url=profile_url,
                    model_used=model,
                    extra_limitations=extra_limitations or [],
                    original_filename=original_filename,
                    extraction_method=extraction_method or "embedded_text",
                )

            except genai_errors.APIError as e:
                code = getattr(e, "code", 500)
                logger.warning("Gemini error during LinkedIn analysis attempt %d/%d (code=%s)", attempt, max_retries, code)

                if code in (400, 401, 403):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail={
                            "error": "INVALID_GEMINI_KEY",
                            "message": "The provided Gemini API key was rejected by Google Gemini as invalid or unauthorized.",
                        },
                    )

                if code in (429, 503) and attempt < max_retries:
                    time.sleep(retry_delay)
                    retry_delay *= 2.0
                    continue

                if code == 429:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={
                            "error": "GEMINI_RATE_LIMIT",
                            "message": "Google Gemini API rate limit exceeded. Please check your quota or try again in a few moments.",
                        },
                    )

                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail={
                        "error": "GEMINI_UPSTREAM_ERROR",
                        "message": "Google Gemini encountered an upstream error while evaluating the LinkedIn profile.",
                    },
                )

            except HTTPException:
                raise

            except Exception as e:
                logger.warning("Unexpected exception during LinkedIn analysis: %s", type(e).__name__)
                if attempt < max_retries:
                    time.sleep(retry_delay)
                    retry_delay *= 2.0
                    continue
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail={
                        "error": "GEMINI_COMMUNICATION_ERROR",
                        "message": "Failed to communicate with Google Gemini during profile analysis.",
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
    def _parse_and_validate_response(
        cls,
        raw_text: str,
        target_role: str,
        input_type: str,
        profile_url: Optional[str],
        model_used: str,
        extra_limitations: List[str],
        original_filename: Optional[str] = None,
        extraction_method: str = "embedded_text",
    ) -> LinkedInAnalysisResult:
        """Parses model JSON output, validates against schema, and computes coverage."""
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned)
            cleaned = cleaned.strip()

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.warning("Failed to decode LinkedIn analysis JSON: %s", e)
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

        # Inject runtime metadata
        record_id = str(uuid.uuid4())
        data["id"] = record_id
        data["status"] = "completed"
        data["input_type"] = input_type
        data["original_filename"] = original_filename
        data["extraction_method"] = extraction_method or "embedded_text"
        data["normalized_profile_url"] = profile_url
        data["profile_url"] = profile_url
        data["target_role"] = target_role
        data["model_used"] = model_used

        # Synchronize profile identity
        profile_obj = data.get("profile") or data.get("profile_identity")
        data["profile"] = profile_obj
        data["profile_identity"] = profile_obj

        # Synchronize project analysis
        project_obj = data.get("projects_analysis") or data.get("project_analysis")
        data["projects_analysis"] = project_obj
        data["project_analysis"] = project_obj

        # Extract recommendations & action plan
        tra = data.get("target_role_alignment")
        if isinstance(tra, dict):
            if not data.get("recommended_headline"):
                data["recommended_headline"] = tra.get("suggested_headline")
            if not data.get("recommended_about"):
                data["recommended_about"] = tra.get("suggested_about_summary")
            if not data.get("action_plan"):
                data["action_plan"] = tra.get("prioritized_30_day_plan") or []

        if not data.get("recommended_headline") and data.get("headline_analysis"):
            ha = data["headline_analysis"]
            if isinstance(ha, dict) and ha.get("suggested_improved_headlines"):
                data["recommended_headline"] = ha["suggested_improved_headlines"][0]

        if not data.get("recommended_about") and data.get("about_analysis"):
            aa = data["about_analysis"]
            if isinstance(aa, dict):
                data["recommended_about"] = aa.get("suggested_rewritten_about")

        # Root level recommendations for skills, projects, certifications
        if not data.get("recommended_skills"):
            skills_data = data.get("skills_analysis")
            if isinstance(skills_data, dict):
                data["recommended_skills"] = (
                    skills_data.get("suggested_skill_prioritization")
                    or skills_data.get("missing_or_weakly_evidenced_skills")
                    or []
                )
            if not data.get("recommended_skills") and isinstance(tra, dict):
                data["recommended_skills"] = tra.get("critical_skill_gaps", [])

        if not data.get("recommended_projects"):
            if isinstance(tra, dict):
                data["recommended_projects"] = tra.get("recommended_projects", [])

        if not data.get("recommended_certifications"):
            if isinstance(tra, dict):
                data["recommended_certifications"] = tra.get("recommended_certifications", [])
            if not data.get("recommended_certifications"):
                data["recommended_certifications"] = data.get("certifications_analysis") or []

        # Synthesize strengths & weaknesses if not at root
        if not data.get("strengths"):
            strengths_list = []
            if data.get("headline_analysis") and isinstance(data["headline_analysis"], dict):
                strengths_list.extend(data["headline_analysis"].get("strengths", []))
            if data.get("experience_analysis") and isinstance(data["experience_analysis"], dict):
                strengths_list.extend(data["experience_analysis"].get("overall_experience_strengths", []))
            if data.get("education_analysis") and isinstance(data["education_analysis"], dict):
                strengths_list.extend(data["education_analysis"].get("strengths", []))
            if isinstance(tra, dict):
                strengths_list.extend(tra.get("demonstrated_competencies", []))
            data["strengths"] = strengths_list[:6] or ["Demonstrated career progression and technical foundation."]

        if not data.get("weaknesses"):
            weaknesses_list = []
            if data.get("headline_analysis") and isinstance(data["headline_analysis"], dict):
                weaknesses_list.extend(data["headline_analysis"].get("weaknesses", []))
            if data.get("experience_analysis") and isinstance(data["experience_analysis"], dict):
                weaknesses_list.extend(data["experience_analysis"].get("overall_experience_weaknesses", []))
            if isinstance(tra, dict):
                weaknesses_list.extend(tra.get("critical_skill_gaps", []))
            data["weaknesses"] = weaknesses_list[:6] or ["Increase quantifiable metrics and target role keyword density."]

        # Certifications analysis
        if not data.get("certifications_analysis"):
            certs = []
            if data.get("additional_sections") and isinstance(data["additional_sections"], dict):
                certs = data["additional_sections"].get("certifications") or []
            if not certs and isinstance(tra, dict):
                certs = tra.get("recommended_certifications") or []
            data["certifications_analysis"] = certs

        # Combine limitations
        existing_limitations = data.get("limitations") or []
        combined_limitations = list(dict.fromkeys(extra_limitations + existing_limitations))
        data["limitations"] = combined_limitations

        # Compute CoverageInformation dynamically
        available = data.get("available_sections") or []
        unavailable = data.get("unavailable_sections") or []

        assessed_count = len(available)
        total_sections = 10
        coverage_pct = min(100, max(0, int((assessed_count / total_sections) * 100)))
        data["coverage_percentage"] = coverage_pct

        coverage_info = {
            "assessed_sections_count": assessed_count,
            "total_possible_sections": total_sections,
            "coverage_percentage": coverage_pct,
            "calculation_methodology": (
                "Coverage represents the proportion of standard core LinkedIn profile sections "
                "(Identity, Headline, About, Experience, Education, Skills, Projects, Certifications, "
                "Keywords, Target Role Alignment) that contained verifiable evidence in the input. "
                "Scores for unavailable sections are not penalized, and quality scores reflect only "
                "accessible information."
            ),
            "limitations": combined_limitations,
        }
        data["coverage_information"] = coverage_info

        try:
            return LinkedInAnalysisResult.model_validate(data)
        except ValidationError as ve:
            logger.warning("LinkedIn analysis failed Pydantic validation: %s", ve.error_count())
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "error": "INVALID_ANALYSIS_SCHEMA",
                    "message": "The structured evaluation from Gemini failed schema verification.",
                },
            )
