import io
import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from google.genai import errors as genai_errors
from pypdf import PdfWriter

from app.models.analysis import AnalysisHistory
from app.services.linkedin_pdf_service import LinkedInPdfService

MOCK_API_KEY = "AIzaSyFakeValidKey1234567890abcdefghijkl"

MOCK_LINKEDIN_PDF_JSON = json.dumps({
    "profile_identity": {
        "name": "Jane Doe",
        "headline": "Staff AI Engineer | LLMs & Autonomous Agents",
        "current_position": "Staff AI Engineer at DeepTech Labs",
        "industry": "Artificial Intelligence",
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
        "score": 90,
        "explanation": "Outstanding profile with strong target-role alignment and proven architectural impact.",
        "supporting_evidence": ["Quantified 40% latency reduction in LLM inference pipeline"],
        "recommended_actions": ["Add published research or patent links to Featured content"]
    },
    "section_scores": {
        "headline": {
            "score": 90,
            "explanation": "Clear, keyword-rich headline demonstrating seniority and domain specialization.",
            "supporting_evidence": ["Includes target keywords: AI Systems, LLMs"],
            "recommended_actions": ["Experiment with metrics in headline"]
        },
        "about": {
            "score": 88,
            "explanation": "Engaging career narrative highlighting technical mastery and strategic problem solving.",
            "supporting_evidence": ["Clear problem-solution structure"],
            "recommended_actions": ["Add direct call to action at bottom of summary"]
        },
        "experience": {
            "score": 92,
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
            "score": 90,
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
            "Staff AI Developer | Generative AI & Autonomous Agent Architect",
            "Principal Machine Learning Engineer | LLM Deployment & RAG Systems"
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
        "missing_information": [],
        "suggested_rewritten_about": "AI Systems Architect specializing in production multi-agent architectures...",
        "strengths": ["Engaging opening hook"],
        "weaknesses": []
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
                "quantifiable_outcomes": ["40% latency reduction"],
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
        "strengths": ["Direct specialization"],
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
        "alignment_score": 90,
        "demonstrated_competencies": ["Model deployment", "Inference optimization"],
        "critical_skill_gaps": ["Low-level GPU profiling"],
        "recommended_keywords": ["Triton Inference Server", "TensorRT-LLM"],
        "suggested_headline": "Senior AI Developer | Architecting Enterprise LLMs",
        "suggested_about_summary": "Senior AI Developer with deep expertise in deploying high-throughput LLM architectures...",
        "experience_improvement_points": ["Highlight automated model evaluation pipelines"],
        "recommended_projects": ["Custom CUDA kernel demonstration repository"],
        "recommended_certifications": ["NVIDIA Deep Learning Institute Certification"],
        "prioritized_30_day_plan": [
            {
                "week": 1,
                "focus_title": "Headline & Positioning Polish",
                "action_items": ["Adopt suggested 3-pillar headline"]
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
                "action_items": ["Publish technical article on inference optimization"]
            }
        ]
    },
    "limitations": []
})


def generate_multi_page_pdf(num_pages: int = 3) -> bytes:
    """Generates an in-memory valid multi-page PDF."""
    writer = PdfWriter()
    for _ in range(num_pages):
        writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def generate_encrypted_pdf() -> bytes:
    """Generates an in-memory encrypted / password-protected PDF."""
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    writer.encrypt("top_secret_pass")
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# 1. Valid PDF Upload & Full Analysis Response
# ---------------------------------------------------------------------------

def test_analyze_pdf_valid_success(client: TestClient, valid_headers: dict, valid_pdf_bytes: bytes):
    """Verifies that a valid PDF export is parsed, analyzed, and returns structured data."""
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = MOCK_LINKEDIN_PDF_JSON
        mock_client.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_client

        response = client.post(
            "/api/linkedin/analyze-pdf",
            headers=valid_headers,
            data={"target_role": "AI Developer"},
            files={"file": ("jane_doe_linkedin.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["input_type"] == "pdf"
        assert data["original_filename"] == "jane_doe_linkedin.pdf"
        assert data["extraction_method"] == "embedded_text"
        assert data["target_role"] == "AI Developer"
        assert data["overall_score"]["score"] == 90
        assert data["coverage_percentage"] == 100
        assert "section_scores" in data
        assert len(data["section_scores"]) == 10
        assert len(data["recommended_skills"]) > 0
        assert len(data["recommended_projects"]) > 0
        assert len(data["recommended_certifications"]) > 0


# ---------------------------------------------------------------------------
# 2. File Validation Error Cases
# ---------------------------------------------------------------------------

def test_analyze_pdf_empty_file_rejected(client: TestClient, valid_headers: dict):
    """Verifies 400 rejection for 0-byte PDF upload."""
    response = client.post(
        "/api/linkedin/analyze-pdf",
        headers=valid_headers,
        data={"target_role": "AI Developer"},
        files={"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["error"] == "EMPTY_FILE"


def test_analyze_pdf_invalid_signature_rejected(client: TestClient, valid_headers: dict):
    """Verifies 400 rejection when file does not start with %PDF- header."""
    fake_bytes = b"NOT_A_PDF_DOCUMENT_CONTENT"
    response = client.post(
        "/api/linkedin/analyze-pdf",
        headers=valid_headers,
        data={"target_role": "AI Developer"},
        files={"file": ("profile.pdf", io.BytesIO(fake_bytes), "application/pdf")},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["error"] == "CORRUPT_OR_INVALID_PDF"


def test_analyze_pdf_incorrect_extension_rejected(client: TestClient, valid_headers: dict, valid_pdf_bytes: bytes):
    """Verifies 400 rejection when file does not have .pdf extension."""
    response = client.post(
        "/api/linkedin/analyze-pdf",
        headers=valid_headers,
        data={"target_role": "AI Developer"},
        files={"file": ("profile.docx", io.BytesIO(valid_pdf_bytes), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["error"] == "INVALID_FILE_TYPE"


def test_analyze_pdf_oversized_rejected(client: TestClient, valid_headers: dict):
    """Verifies 413 rejection when PDF exceeds MAX_UPLOAD_SIZE_MB (10MB)."""
    # Create 11MB of mock PDF bytes
    oversized_bytes = b"%PDF-1.4\n" + b"A" * (11 * 1024 * 1024)
    response = client.post(
        "/api/linkedin/analyze-pdf",
        headers=valid_headers,
        data={"target_role": "AI Developer"},
        files={"file": ("huge_profile.pdf", io.BytesIO(oversized_bytes), "application/pdf")},
    )
    assert response.status_code == 413
    data = response.json()
    assert data["detail"]["error"] == "FILE_TOO_LARGE"


def test_analyze_pdf_corrupted_structure_rejected(client: TestClient, valid_headers: dict):
    """Verifies 400 rejection when PDF has valid magic bytes but corrupted internal structure."""
    corrupted_bytes = b"%PDF-1.4\n%broken stream garbage xref table missing"
    response = client.post(
        "/api/linkedin/analyze-pdf",
        headers=valid_headers,
        data={"target_role": "AI Developer"},
        files={"file": ("corrupt.pdf", io.BytesIO(corrupted_bytes), "application/pdf")},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["error"] == "UNREADABLE_PDF"


def test_analyze_pdf_encrypted_rejected(client: TestClient, valid_headers: dict):
    """Verifies 400 rejection for password-protected / encrypted PDFs."""
    encrypted_bytes = generate_encrypted_pdf()
    response = client.post(
        "/api/linkedin/analyze-pdf",
        headers=valid_headers,
        data={"target_role": "AI Developer"},
        files={"file": ("encrypted.pdf", io.BytesIO(encrypted_bytes), "application/pdf")},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["error"] == "ENCRYPTED_PDF"


# ---------------------------------------------------------------------------
# 3. Extraction Strategies: Scanned Image PDF & Multi-page
# ---------------------------------------------------------------------------

def test_analyze_pdf_scanned_multimodal_fallback(client: TestClient, valid_headers: dict):
    """Verifies that a blank/scanned PDF without extractable text routes via multimodal vision."""
    scanned_bytes = generate_multi_page_pdf(num_pages=2)
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = MOCK_LINKEDIN_PDF_JSON
        mock_client.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_client

        response = client.post(
            "/api/linkedin/analyze-pdf",
            headers=valid_headers,
            data={"target_role": "AI Developer"},
            files={"file": ("scanned_export.pdf", io.BytesIO(scanned_bytes), "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["input_type"] == "pdf"
        assert data["extraction_method"] == "gemini_multimodal_pdf"

        # Verify that generate_content was invoked with multimodal content list containing a Part
        call_kwargs = mock_client.models.generate_content.call_args[1]
        contents = call_kwargs.get("contents")
        assert isinstance(contents, list)
        assert len(contents) == 2  # Prompt and types.Part


def test_analyze_pdf_multipage_handling(client: TestClient, valid_headers: dict):
    """Verifies that multi-page PDFs are handled across multiple pages."""
    multi_page_bytes = generate_multi_page_pdf(num_pages=4)
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = MOCK_LINKEDIN_PDF_JSON
        mock_client.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_client

        response = client.post(
            "/api/linkedin/analyze-pdf",
            headers=valid_headers,
            data={"target_role": "AI Developer"},
            files={"file": ("multipage.pdf", io.BytesIO(multi_page_bytes), "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"


# ---------------------------------------------------------------------------
# 4. Authentication, API Key Handling & Rate Limits
# ---------------------------------------------------------------------------

def test_analyze_pdf_missing_api_key(client: TestClient, valid_pdf_bytes: bytes):
    """Verifies 401 Unauthorized when X-Gemini-API-Key header is absent."""
    response = client.post(
        "/api/linkedin/analyze-pdf",
        data={"target_role": "AI Developer"},
        files={"file": ("profile.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")},
    )
    assert response.status_code == 401
    assert "MISSING_API_KEY" in response.text


def test_analyze_pdf_invalid_gemini_key(client: TestClient, valid_pdf_bytes: bytes):
    """Verifies 401 Unauthorized when Gemini rejects key as invalid."""
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        err = genai_errors.APIError(401, "API_KEY_INVALID", None)
        mock_client.models.generate_content.side_effect = err
        mock_client_cls.return_value = mock_client

        response = client.post(
            "/api/linkedin/analyze-pdf",
            headers={"X-Gemini-API-Key": "AIzaSyInvalidKeyHere12345678"},
            data={"target_role": "AI Developer"},
            files={"file": ("profile.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")},
        )
        assert response.status_code == 401
        assert "INVALID_GEMINI_KEY" in response.text


def test_analyze_pdf_gemini_rate_limit(client: TestClient, valid_headers: dict, valid_pdf_bytes: bytes):
    """Verifies 429 Too Many Requests when Gemini rate limit is hit."""
    with patch("google.genai.Client") as mock_client_cls, patch("time.sleep"):
        mock_client = MagicMock()
        err = genai_errors.APIError(429, "RESOURCE_EXHAUSTED", None)
        mock_client.models.generate_content.side_effect = err
        mock_client_cls.return_value = mock_client

        response = client.post(
            "/api/linkedin/analyze-pdf",
            headers=valid_headers,
            data={"target_role": "AI Developer"},
            files={"file": ("profile.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")},
        )
        assert response.status_code == 429
        assert "GEMINI_RATE_LIMIT" in response.text


def test_analyze_pdf_gemini_upstream_error(client: TestClient, valid_headers: dict, valid_pdf_bytes: bytes):
    """Verifies 502 Bad Gateway when Gemini upstream encounters error."""
    with patch("google.genai.Client") as mock_client_cls, patch("time.sleep"):
        mock_client = MagicMock()
        err = genai_errors.APIError(500, "Internal Error", None)
        mock_client.models.generate_content.side_effect = err
        mock_client_cls.return_value = mock_client

        response = client.post(
            "/api/linkedin/analyze-pdf",
            headers=valid_headers,
            data={"target_role": "AI Developer"},
            files={"file": ("profile.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")},
        )
        assert response.status_code == 502
        assert "GEMINI_UPSTREAM_ERROR" in response.text


def test_analyze_pdf_malformed_response_returns_502(client: TestClient, valid_headers: dict, valid_pdf_bytes: bytes):
    """Verifies 502 when Gemini returns text that cannot be parsed as JSON."""
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "Sorry, I cannot analyze this profile. Here are some thoughts in plain text..."
        mock_client.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_client

        response = client.post(
            "/api/linkedin/analyze-pdf",
            headers=valid_headers,
            data={"target_role": "AI Developer"},
            files={"file": ("profile.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")},
        )
        assert response.status_code == 502
        assert "MALFORMED_GEMINI_RESPONSE" in response.text


# ---------------------------------------------------------------------------
# 5. Section Detection, Coverage & Score Boundaries
# ---------------------------------------------------------------------------

def test_section_detection_unit():
    """Unit test for LinkedInPdfService.detect_sections."""
    sample_text = (
        "Jane Doe\n"
        "Contact: jane@example.com\n"
        "Summary\nPassionate engineer building LLM applications.\n"
        "Experience\nStaff AI Engineer at DeepTech Labs\n"
        "Education\nStanford University M.S. Computer Science\n"
        "Top Skills\nPython, PyTorch, vLLM\n"
    )
    detected, unavailable = LinkedInPdfService.detect_sections(sample_text)
    assert "identity" in detected
    assert "about" in detected
    assert "experience" in detected
    assert "education" in detected
    assert "skills" in detected
    assert "projects" in unavailable


def test_score_boundaries_and_coverage(client: TestClient, valid_headers: dict, valid_pdf_bytes: bytes):
    """Verifies that all returned scores are clamped strictly between 0 and 100."""
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = MOCK_LINKEDIN_PDF_JSON
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
        assert 0 <= data["overall_score"]["score"] <= 100
        for _name, detail in data["section_scores"].items():
            assert 0 <= detail["score"] <= 100
        assert 0 <= data["coverage_percentage"] <= 100


# ---------------------------------------------------------------------------
# 6. API Key Non-Persistence & Secret Redaction
# ---------------------------------------------------------------------------

def test_api_key_non_persistence_and_redaction(client: TestClient, valid_headers: dict, valid_pdf_bytes: bytes, test_db_session):
    """Verifies that user's Gemini key is never stored in DB or returned in response."""
    test_key = valid_headers["X-Gemini-API-Key"]
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = MOCK_LINKEDIN_PDF_JSON
        mock_client.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_client

        response = client.post(
            "/api/linkedin/analyze-pdf",
            headers=valid_headers,
            data={"target_role": "AI Developer"},
            files={"file": ("profile.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")},
        )

        assert response.status_code == 200
        # Assert key is never leaked in HTTP response body
        assert test_key not in response.text

        # Assert key is never stored in DB records
        records = test_db_session.query(AnalysisHistory).all()
        for rec in records:
            assert test_key not in (rec.original_filename or "")
            assert test_key not in (rec.target_role or "")
            if rec.result_json:
                assert test_key not in json.dumps(rec.result_json)
