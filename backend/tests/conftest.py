import io
from typing import AsyncGenerator, Generator
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.core.security import limiter
from app.main import app

# Disable slowapi rate limiter during automated test suite runs
limiter.enabled = False

# Minimal valid PDF with text stream for integration tests
SAMPLE_VALID_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
    b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
    b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
    b"4 0 obj << /Length 50 >> stream\n"
    b"BT\n"
    b"/F1 12 Tf\n"
    b"72 712 Td\n"
    b"(Jane Doe Senior Python Engineer Resume) Tj\n"
    b"ET\n"
    b"endstream endobj\n"
    b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
    b"xref\n"
    b"0 6\n"
    b"0000000000 65535 f \n"
    b"0000000009 00000 n \n"
    b"0000000058 00000 n \n"
    b"0000000115 00000 n \n"
    b"0000000244 00000 n \n"
    b"0000000344 00000 n \n"
    b"trailer << /Size 6 /Root 1 0 R >>\n"
    b"startxref\n"
    b"420\n"
    b"%%EOF\n"
)


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    """Synchronous test client fixture."""
    with TestClient(app) as test_client:
        yield test_client


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Asynchronous test client fixture."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def valid_pdf_bytes() -> bytes:
    """Returns raw bytes of a valid, readable PDF containing resume text."""
    return SAMPLE_VALID_PDF


@pytest.fixture
def valid_api_key() -> str:
    """Returns a syntactically valid mock Gemini API key."""
    return "AIzaSyD-MockGeminiKeyForUnitTesting_9876543210"


@pytest.fixture
def valid_headers(valid_api_key: str) -> dict:
    """Returns headers containing a valid X-Gemini-API-Key."""
    return {"X-Gemini-API-Key": valid_api_key}


@pytest.fixture
def test_db_session() -> Generator[Session, None, None]:
    """Provides an isolated, in-memory SQLite database session for unit tests."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionTesting = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionTesting()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def mock_analysis_dict() -> dict:
    """Returns a sample valid analysis result dictionary matching AnalysisResult schema."""
    return {
        "candidate_information": {
            "name": "Jane Doe",
            "email": "jane.doe@example.com",
            "phone": "+1 555-0199",
            "location": "San Francisco, CA",
            "linkedin": "https://linkedin.com/in/janedoe",
            "github": "https://github.com/janedoe",
            "portfolio": None,
        },
        "overall_score": 88,
        "ats_score": 92,
        "skills_score": 85,
        "content_score": 89,
        "experience_score": 87,
        "formatting_score": 95,
        "professional_summary": "Experienced Python and Cloud Systems Engineer with proven leadership in distributed systems.",
        "strengths": [
            "Demonstrated proficiency in Python, FastAPI, and Kubernetes architecture.",
            "Quantified impact across production metrics and system latency reduction.",
        ],
        "weaknesses": [
            "Limited explicit mention of Golang or secondary microservices languages.",
        ],
        "missing_skills": [
            "Apache Kafka",
            "Terraform",
        ],
        "ats_keywords": [
            "FastAPI",
            "PostgreSQL",
            "CI/CD",
            "Docker",
            "Kubernetes",
        ],
        "grammar_issues": [],
        "formatting_issues": [],
        "recommended_skills": [
            "Distributed tracing (OpenTelemetry)",
            "System event streaming with Kafka",
        ],
        "recommended_certifications": [
            "AWS Certified Solutions Architect Professional",
        ],
        "recommended_courses": [
            "Advanced Distributed Systems on Coursera",
        ],
        "interview_questions": [
            "Explain how you optimized database connection pooling in your FastAPI services.",
            "How do you approach zero-downtime database schema migrations?",
        ],
        "career_suggestions": [
            "Highlight architecture design and team mentorship in senior roles.",
        ],
        "final_assessment": "Strong, highly competitive candidate well aligned with modern backend engineering positions.",
        "target_role": "Senior Backend Engineer",
        "model_used": "gemini-2.5-flash",
        "disclaimer": "Scores and observations are AI-generated estimates based on provided resume evidence and do not guarantee ATS passage or employment decisions.",
    }
