import io
import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from google.genai import errors as genai_errors

from app.services.linkedin_url_service import LinkedInUrlService
from app.services.linkedin_service import LinkedInService
from app.models.analysis import AnalysisHistory

MOCK_API_KEY = "AIzaSyFakeValidKey1234567890abcdefghijkl"


MOCK_LINKEDIN_LLM_JSON = json.dumps({
    "profile_identity": {
        "name": "Jane Doe",
        "headline": "Senior AI Systems Engineer | LLMs & Distributed Cloud",
        "current_position": "Staff AI Engineer at ScaledTech",
        "industry": "Software Engineering",
        "location": "San Francisco, CA",
        "profile_url": "https://www.linkedin.com/in/janedoe",
        "professional_positioning": "Strategic AI engineering leader specializing in production LLM systems."
    },
    "available_sections": [
        "identity",
        "headline",
        "about",
        "experience",
        "education",
        "skills",
        "projects",
        "certifications",
        "keyword_optimization",
        "target_role_alignment"
    ],
    "unavailable_sections": [],
    "overall_score": {
        "score": 92,
        "explanation": "Outstanding profile with strong target-role alignment and proven architectural impact.",
        "supporting_evidence": ["Quantified 40% latency reduction in LLM inference pipeline"],
        "recommended_actions": ["Add published research or patent links to Featured content"]
    },
    "section_scores": {
        "headline": {
            "score": 90,
            "explanation": "Clear, keyword-rich headline demonstrating seniority and domain specialization.",
            "supporting_evidence": ["Includes target keywords: AI Systems, LLMs, Distributed Cloud"],
            "recommended_actions": ["Experiment with metrics in headline"]
        },
        "about": {
            "score": 88,
            "explanation": "Engaging career narrative highlighting technical mastery and strategic problem solving.",
            "supporting_evidence": ["Clear problem-solution structure"],
            "recommended_actions": ["Add direct call to action at bottom of summary"]
        },
        "experience": {
            "score": 94,
            "explanation": "Exceptionally well-structured experience bullets with measurable metrics.",
            "supporting_evidence": ["Action verbs: Architected, Led, Optimized"],
            "recommended_actions": ["Include team mentorship outcomes"]
        },
        "skills": {
            "score": 90,
            "explanation": "Comprehensive skill set with strong alignment to AI Developer benchmarks.",
            "supporting_evidence": ["Python, PyTorch, vLLM, Kubernetes, FastAPI"],
            "recommended_actions": ["Request endorsements for top 3 core skills"]
        },
        "education": {
            "score": 92,
            "explanation": "Solid academic credentials directly supporting career trajectory.",
            "supporting_evidence": ["M.S. in Computer Science"],
            "recommended_actions": ["Highlight machine learning coursework"]
        },
        "projects": {
            "score": 85,
            "explanation": "Demonstrates practical production-grade applications.",
            "supporting_evidence": ["High-throughput RAG search engine project"],
            "recommended_actions": ["Add open source GitHub links"]
        },
        "certifications": {
            "score": 80,
            "explanation": "Relevant cloud and AI certifications present.",
            "supporting_evidence": ["GCP Professional Cloud Architect"],
            "recommended_actions": ["Keep certifications updated"]
        },
        "keyword_optimization": {
            "score": 91,
            "explanation": "High keyword coverage for tech recruiter search filters.",
            "supporting_evidence": ["Natural integration of generative AI keywords"],
            "recommended_actions": ["Add secondary domain keywords like Triton and CUDA"]
        },
        "profile_completeness": {
            "score": 95,
            "explanation": "All recommended standard profile sections are populated.",
            "supporting_evidence": ["10 of 10 standard core sections present"],
            "recommended_actions": ["Regularly refresh profile recommendations"]
        },
        "target_role_alignment": {
            "score": 93,
            "explanation": "Profile perfectly targets an AI Developer / Senior AI Engineer role.",
            "supporting_evidence": ["Every role focuses on production AI deployments"],
            "recommended_actions": ["Engage with industry posts on LinkedIn weekly"]
        }
    },
    "headline_analysis": {
        "clarity_and_specificity": "Very clear and high impact.",
        "relevant_keywords": ["AI Systems", "LLM", "Distributed Cloud"],
        "target_role_alignment": "Directly targets AI Developer / Engineering roles.",
        "value_proposition": "Builds scalable AI infrastructure.",
        "suggested_improved_headlines": [
            "Senior AI Developer | Architecting Enterprise LLMs & Distributed Inference Engines",
            "Staff AI Engineer | PyTorch, vLLM & Scalable Generative AI Systems",
            "AI Systems Engineer | Optimizing Inference Latency & High-Throughput ML Pipelines"
        ],
        "strengths": ["Clear role identity", "Modern tech stack listed"],
        "weaknesses": ["Could include business impact metric"]
    },
    "about_analysis": {
        "is_available": True,
        "introduction_and_identity": "Seasoned engineer passionate about generative AI and scale.",
        "career_narrative": "Transitions from backend systems to specialized AI inference infrastructure.",
        "evidence_of_impact": "Drove 40% reduction in GPU computing costs.",
        "keyword_coverage": "High density of technical ML keywords.",
        "grammar_and_readability": "Crisp, concise, readable prose.",
        "missing_information": ["Personal leadership philosophy"],
        "suggested_rewritten_about": "I build and scale production AI systems that deliver tangible business value...",
        "strengths": ["Engaging opening hook"],
        "weaknesses": ["Ending needs a clear contact call to action"]
    },
    "experience_analysis": {
        "is_available": True,
        "roles_analyzed_count": 1,
        "roles": [
            {
                "job_title": "Staff AI Engineer",
                "organization": "ScaledTech",
                "dates": "2022 - Present",
                "description": "Leading AI infrastructure.",
                "responsibilities": ["Design inference pipelines"],
                "achievements": ["Scaled to 10M daily requests with sub-100ms latency"],
                "quantifiable_outcomes": ["40% latency reduction", "$200k/mo GPU savings"],
                "relevant_skills": ["vLLM", "PyTorch", "Kubernetes"],
                "keyword_coverage": ["Inference", "Generative AI", "Latency"],
                "missing_metrics": [],
                "suggested_rewritten_description": "Architected low-latency LLM serving platform reducing GPU overhead by 40%..."
            }
        ],
        "overall_experience_strengths": ["Quantified business metrics"],
        "overall_experience_weaknesses": [],
        "missing_evidence_summary": []
    },
    "education_analysis": {
        "is_available": True,
        "items": [
            {
                "institution": "Stanford University",
                "degree": "M.S.",
                "field_of_study": "Computer Science (AI Specialization)",
                "dates": "2018 - 2020",
                "achievements": ["Published research paper on distributed training"],
                "relevance_to_target_role": "High relevance to AI Developer"
            }
        ],
        "strengths": ["Prestigious institution", "Direct specialization"],
        "weaknesses": []
    },
    "skills_analysis": {
        "is_available": True,
        "listed_skills": ["Python", "PyTorch", "vLLM", "Docker", "FastAPI"],
        "role_relevant_skills": ["Python", "PyTorch", "vLLM"],
        "missing_or_weakly_evidenced_skills": ["CUDA kernel programming"],
        "duplicate_or_redundant_skills": [],
        "suggested_skill_prioritization": ["Python", "PyTorch", "vLLM", "Kubernetes"],
        "skills_supported_by_evidence": ["PyTorch", "vLLM"]
    },
    "project_analysis": {
        "is_available": True,
        "items": [
            {
                "title": "Open-Source RAG Optimizer",
                "technical_stack": ["Python", "ChromaDB", "FastAPI"],
                "problem_and_solution": "Reduced context hallucination via multi-query retrieval.",
                "outcomes_and_impact": "1,500+ GitHub stars.",
                "missing_details": [],
                "suggested_rewritten_description": "Developed open-source multi-query RAG optimization engine..."
            }
        ],
        "strengths": ["Open-source proof of work"],
        "weaknesses": []
    },
    "additional_sections": {
        "certifications": ["GCP Cloud Architect"],
        "courses": ["Deep Learning Specialization"],
        "publications": ["Inference optimization techniques in multi-tenant environments"],
        "recommendations_summary": "Strong recommendations from engineering directors.",
        "volunteer_experience": [],
        "honors_and_awards": [],
        "languages": ["English"],
        "unavailable_sections_notes": []
    },
    "keyword_analysis": {
        "found_keywords": ["AI Developer", "PyTorch", "LLM", "Inference", "Docker", "Kubernetes"],
        "missing_critical_keywords": ["Triton", "TensorRT-LLM"],
        "keyword_density_assessment": "Optimal keyword density without keyword stuffing.",
        "strategic_placement_advice": ["Add TensorRT-LLM to skills and projects"]
    },
    "target_role_alignment": {
        "target_role": "AI Developer",
        "alignment_score": 93,
        "demonstrated_competencies": ["Model deployment", "Inference optimization", "System architecture"],
        "critical_skill_gaps": ["Low-level GPU profiling"],
        "recommended_keywords": ["Triton Inference Server", "TensorRT-LLM", "Quantization"],
        "suggested_headline": "Senior AI Developer | Architecting Enterprise LLMs & Distributed Inference Engines",
        "suggested_about_summary": "Senior AI Developer with deep expertise in deploying high-throughput LLM architectures...",
        "experience_improvement_points": ["Highlight automated model evaluation pipelines"],
        "recommended_projects": ["Custom CUDA kernel demonstration repository"],
        "recommended_certifications": ["NVIDIA Deep Learning Institute Certification"],
        "prioritized_30_day_plan": [
            {
                "week": 1,
                "focus_title": "Headline & Positioning Polish",
                "action_items": ["Adopt suggested 3-pillar headline", "Update profile background banner"]
            },
            {
                "week": 2,
                "focus_title": "About & Experience Metrics",
                "action_items": ["Incorporate quantified impact numbers in current role bullets"]
            },
            {
                "week": 3,
                "focus_title": "Project & Code Artifact Showcasing",
                "action_items": ["Pin open-source RAG project to Featured section"]
            },
            {
                "week": 4,
                "focus_title": "Targeted Networking & Community Engagement",
                "action_items": ["Publish 2 technical LinkedIn articles on inference optimization"]
            }
        ]
    },
    "limitations": []
})


# ---------------------------------------------------------------------------
# 1. URL Validation Unit Tests
# ---------------------------------------------------------------------------

def test_validate_linkedin_url_success():
    """Verifies that valid LinkedIn profile URLs are normalized."""
    valid_urls = [
        "https://www.linkedin.com/in/janedoe/",
        "http://linkedin.com/in/john-doe-123",
        "www.linkedin.com/in/alex_smith",
        "in.linkedin.com/in/candidate.profile",
        "https://uk.linkedin.com/in/engineer-pro/",
    ]
    for url in valid_urls:
        norm, slug = LinkedInUrlService.validate_and_normalize_url(url)
        assert norm.startswith("https://www.linkedin.com/in/")
        assert slug


def test_validate_linkedin_url_unsupported_domains():
    """Verifies rejection of non-LinkedIn domains."""
    invalid_domains = [
        "https://github.com/in/username",
        "https://facebook.com/in/username",
        "https://twitter.com/in/username",
        "https://myportfolio.com/in/username",
    ]
    for url in invalid_domains:
        with pytest.raises(HTTPException) as exc_info:
            LinkedInUrlService.validate_and_normalize_url(url)
        assert exc_info.value.status_code == 400
        assert exc_info.value.detail["error"] == "UNSUPPORTED_DOMAIN"


def test_validate_linkedin_url_invalid_paths():
    """Verifies rejection of non-personal-profile paths like /jobs or /company."""
    invalid_paths = [
        "https://www.linkedin.com/jobs/view/12345",
        "https://www.linkedin.com/company/google",
        "https://www.linkedin.com/feed/",
        "https://www.linkedin.com/",
    ]
    for url in invalid_paths:
        with pytest.raises(HTTPException) as exc_info:
            LinkedInUrlService.validate_and_normalize_url(url)
        assert exc_info.value.status_code == 400
        assert exc_info.value.detail["error"] == "INVALID_PROFILE_PATH"


# ---------------------------------------------------------------------------
# 2. URL Probing & Authwall Handling Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_probe_url_authwall_restricted():
    """Verifies honest limitation handling when LinkedIn returns 999 / authwall redirect."""
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 999
        mock_response.url = "https://www.linkedin.com/authwall?trk=bf&trkInfo=AQED..."
        mock_response.text = '<html><head><meta property="og:title" content="Jane Doe - AI Engineer | LinkedIn"></head></html>'
        mock_get.return_value = mock_response

        res = await LinkedInUrlService.probe_profile_url("https://www.linkedin.com/in/janedoe")
        assert len(res["limitations"]) > 0
        assert any("authwall" in lim.lower() or "authenticated" in lim.lower() for lim in res["limitations"])
        assert "Jane Doe" in res["extracted_text"]


# ---------------------------------------------------------------------------
# 3. PDF Upload Validation Tests
# ---------------------------------------------------------------------------

def test_analyze_pdf_success_mocked(client: TestClient, valid_headers: dict, valid_pdf_bytes: bytes):
    """Tests successful LinkedIn PDF upload and analysis with mocked Gemini response."""
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = MOCK_LINKEDIN_LLM_JSON
        mock_client.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_client

        response = client.post(
            "/api/linkedin/analyze-pdf",
            headers=valid_headers,
            data={"target_role": "AI Developer"},
            files={"file": ("profile.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["input_type"] == "pdf"
        assert data["target_role"] == "AI Developer"
        assert data["overall_score"]["score"] == 92
        assert data["coverage_information"]["coverage_percentage"] == 100
        assert data["section_scores"]["headline"]["score"] == 90
        assert len(data["target_role_alignment"]["prioritized_30_day_plan"]) == 4


def test_analyze_pdf_empty_file(client: TestClient, valid_headers: dict):
    """Verifies that an empty 0-byte PDF is rejected."""
    response = client.post(
        "/api/linkedin/analyze-pdf",
        headers=valid_headers,
        data={"target_role": "AI Developer"},
        files={"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")},
    )
    assert response.status_code == 400
    assert "EMPTY_FILE" in response.text


def test_analyze_pdf_corrupt_header(client: TestClient, valid_headers: dict):
    """Verifies that non-PDF bytes are rejected."""
    response = client.post(
        "/api/linkedin/analyze-pdf",
        headers=valid_headers,
        data={"target_role": "AI Developer"},
        files={"file": ("fake.pdf", io.BytesIO(b"This is plain text pretending to be PDF"), "application/pdf")},
    )
    assert response.status_code == 400
    assert "CORRUPT_OR_INVALID_PDF" in response.text


# ---------------------------------------------------------------------------
# 4. Text Mode Tests
# ---------------------------------------------------------------------------

def test_analyze_text_success_mocked(client: TestClient, valid_headers: dict):
    """Tests successful analysis of pasted LinkedIn text."""
    pasted_text = (
        "Jane Doe - Staff AI Engineer at ScaledTech. "
        "Experienced in deploying large language models, vLLM inference optimization, PyTorch, and Kubernetes. "
        "Stanford M.S. in Computer Science. Over 8 years in high-throughput distributed systems."
    )

    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = MOCK_LINKEDIN_LLM_JSON
        mock_client.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_client

        response = client.post(
            "/api/linkedin/analyze-text",
            headers=valid_headers,
            json={
                "profile_text": pasted_text,
                "target_role": "AI Developer",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["input_type"] == "text"
        assert data["overall_score"]["score"] == 92


def test_analyze_text_insufficient_length(client: TestClient, valid_headers: dict):
    """Rejects pasted text that is too short."""
    response = client.post(
        "/api/linkedin/analyze-text",
        headers=valid_headers,
        json={
            "profile_text": "Too short text",
            "target_role": "AI Developer",
        },
    )
    assert response.status_code == 422
    assert "profile_text" in response.text


# ---------------------------------------------------------------------------
# 5. URL Endpoint Tests
# ---------------------------------------------------------------------------

def test_analyze_url_success_mocked(client: TestClient, valid_headers: dict):
    """Tests URL analysis endpoint with mocked probe and Gemini generation."""
    with patch("app.services.linkedin_url_service.LinkedInUrlService.probe_profile_url") as mock_probe, \
         patch("google.genai.Client") as mock_client_cls:
        mock_probe.return_value = {
            "accessible": True,
            "status_code": 200,
            "extracted_text": "Jane Doe Staff AI Engineer at ScaledTech",
            "extracted_meta": {"title": "Jane Doe | LinkedIn"},
            "limitations": [],
        }

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = MOCK_LINKEDIN_LLM_JSON
        mock_client.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_client

        response = client.post(
            "/api/linkedin/analyze-url",
            headers=valid_headers,
            json={
                "url": "https://www.linkedin.com/in/janedoe",
                "target_role": "AI Developer",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["input_type"] == "url"
        assert data["profile_url"] == "https://www.linkedin.com/in/janedoe"
        assert data["overall_score"]["score"] == 92


# ---------------------------------------------------------------------------
# 6. Security & Error Handling Tests
# ---------------------------------------------------------------------------

def test_analyze_missing_api_key(client: TestClient):
    """Ensures 401 Unauthorized when X-Gemini-API-Key header is absent."""
    response = client.post(
        "/api/linkedin/analyze-text",
        json={"profile_text": "A" * 60, "target_role": "AI Developer"},
    )
    assert response.status_code == 401
    assert "MISSING_API_KEY" in response.text


def test_analyze_gemini_rate_limit_mocked(client: TestClient, valid_headers: dict):
    """Ensures 429 response when Google Gemini quota is exceeded."""
    with patch("google.genai.Client") as mock_client_cls, \
         patch("time.sleep"):  # Mock out sleep to avoid waiting during test retries
        mock_client = MagicMock()
        err = genai_errors.APIError(429, "Resource has been exhausted", None)
        mock_client.models.generate_content.side_effect = err
        mock_client_cls.return_value = mock_client

        response = client.post(
            "/api/linkedin/analyze-text",
            headers=valid_headers,
            json={"profile_text": "A" * 60, "target_role": "AI Developer"},
        )
        assert response.status_code == 429
        assert "GEMINI_RATE_LIMIT" in response.text


def test_analyze_gemini_upstream_error_mocked(client: TestClient, valid_headers: dict):
    """Ensures 502 response on Gemini service 500 error."""
    with patch("google.genai.Client") as mock_client_cls, \
         patch("time.sleep"):
        mock_client = MagicMock()
        err = genai_errors.APIError(500, "Internal Server Error", None)
        mock_client.models.generate_content.side_effect = err
        mock_client_cls.return_value = mock_client

        response = client.post(
            "/api/linkedin/analyze-text",
            headers=valid_headers,
            json={"profile_text": "A" * 60, "target_role": "AI Developer"},
        )
        assert response.status_code == 502
        assert "GEMINI_UPSTREAM_ERROR" in response.text


def test_linkedin_connect_endpoint(client: TestClient):
    """Verifies that the optional official OAuth connect endpoint returns informative configuration status."""
    response = client.post("/api/linkedin/connect")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "alternative_options" in data
