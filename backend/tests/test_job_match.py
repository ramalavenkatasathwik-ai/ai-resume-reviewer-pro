from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.user import User
from app.models.resume import ResumeDocument, ResumeVersion
from app.models.job_match import JobMatchReport
from app.schemas.job_match import (
    RequirementMatchItem,
    JobRequirements,
    JobMatchComparison,
    JobMatchRecommendation,
)
from app.services.job_match_scoring import JobMatchScoringEngine
from app.services.job_match_service import JobMatchService
from app.services.resume_document_service import ResumeDocumentService


@pytest.fixture
def auth_user(test_db_session: Session) -> User:
    user = User(
        email="jobmatcher@example.com",
        hashed_password=hash_password("Password123!"),
        display_name="Job Matcher",
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user


@pytest.fixture
def other_user(test_db_session: Session) -> User:
    user = User(
        email="othermatcher@example.com",
        hashed_password=hash_password("Password123!"),
        display_name="Other User",
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user


MOCK_KEY = "AIzaSyD-MockGeminiKeyForUnitTesting_9876543210"


@pytest.fixture
def auth_headers(auth_user: User) -> dict:
    token = create_access_token({"sub": auth_user.id})
    return {"Authorization": f"Bearer {token}", "X-Gemini-API-Key": MOCK_KEY}


@pytest.fixture
def other_headers(other_user: User) -> dict:
    token = create_access_token({"sub": other_user.id})
    return {"Authorization": f"Bearer {token}", "X-Gemini-API-Key": MOCK_KEY}


@pytest.fixture
def user_resume(test_db_session: Session, auth_user: User) -> ResumeDocument:
    resume_data = {
        "basics": {
            "name": "Jane Engineer",
            "title": "Senior AI Systems Engineer",
            "email": "jane@example.com",
            "summary": "Specialist in distributed AI and LLM inference serving.",
        },
        "experience": [
            {
                "company": "DeepTech Systems",
                "position": "Senior Backend Engineer",
                "startDate": "2021-01",
                "endDate": "Present",
                "highlights": [
                    "Engineered FastAPI microservices with PostgreSQL serving 50M daily requests.",
                    "Implemented Docker and Kubernetes CI/CD workflows.",
                ],
            }
        ],
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes", "PyTorch"],
        "education": [
            {
                "institution": "Tech University",
                "area": "Computer Science",
                "studyType": "B.S.",
                "startDate": "2016",
                "endDate": "2020",
            }
        ],
    }

    return ResumeDocumentService.create_resume(
        db=test_db_session,
        user=auth_user,
        title="AI Engineer Master",
        target_role="AI Engineer",
        resume_data=resume_data,
        template_name="modern",
    )


SAMPLE_JOB_DESC = """
We are looking for a Senior AI Software Engineer to join our high-growth platform team.
Key Responsibilities:
- Design, build, and optimize scalable LLM microservices using Python and FastAPI.
- Deploy and maintain containerized workloads on Kubernetes with CI/CD automation.
- Architect high-throughput relational databases with PostgreSQL.

Required Qualifications:
- 5+ years of software engineering experience with Python.
- Demonstrated production experience with FastAPI or modern Python frameworks.
- Strong knowledge of container orchestration (Docker, Kubernetes).
- BS degree in Computer Science or related quantitative field.

Preferred Qualifications:
- Experience with PyTorch or deep learning inference pipelines.
- Familiarity with Rust or Golang.
"""


def test_job_description_validation():
    # Too short (< 50 chars)
    with pytest.raises(Exception) as exc:
        JobMatchService.validate_job_description("Short text")
    assert "INSUFFICIENT_JOB_DESCRIPTION" in str(exc.value.detail)

    # URL-only input rejected (SSRF protection)
    with pytest.raises(Exception) as exc:
        JobMatchService.validate_job_description("https://careers.google.com/jobs/results/12345")
    assert "URL_SCRAPING_DISALLOWED" in str(exc.value.detail)

    # Valid input passes
    valid = JobMatchService.validate_job_description(SAMPLE_JOB_DESC)
    assert len(valid) >= 50


def test_scoring_engine_calculation():
    items = [
        RequirementMatchItem(requirement="Python", category="required_skill", status="matched", is_required=True),
        RequirementMatchItem(requirement="FastAPI", category="required_skill", status="matched", is_required=True),
        RequirementMatchItem(requirement="Rust", category="preferred_skill", status="not_evidenced", is_required=False),
        RequirementMatchItem(requirement="Kubernetes", category="experience", status="partial", is_required=True),
        RequirementMatchItem(requirement="BS Computer Science", category="education", status="matched", is_required=True),
        RequirementMatchItem(requirement="Security Clearance", category="experience", status="not_assessable", is_required=True),
    ]
    keywords = ["python", "fastapi", "docker", "kubernetes", "rust", "python"]  # Notice duplicate "python"
    resume_data = {
        "basics": {"summary": "Python and FastAPI engineer"},
        "skills": ["Python", "FastAPI", "Docker"],
    }

    comparison = JobMatchScoringEngine.compute_scores(items, keywords, resume_data)
    bd = comparison.score_breakdown

    assert 0 <= bd.overall_score <= 100
    assert bd.required_skills_score == 100  # Both required skills matched
    assert bd.preferred_skills_score == 0   # Rust was not evidenced
    assert bd.unassessable_count == 1
    # Check deduplicated keywords
    assert "python" in comparison.matched_keywords
    assert "rust" in comparison.missing_keywords
    assert len(comparison.matched_keywords) + len(comparison.missing_keywords) == 5  # "python" counted once


def test_extract_requirements_endpoint(client: TestClient, auth_headers: dict):
    response = client.post(
        "/api/job-matches/extract",
        json={"job_description": SAMPLE_JOB_DESC, "job_title": "Senior AI Engineer"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["job_title"] == "Senior AI Engineer"
    assert len(data["required_technical_skills"]) > 0
    assert "Python" in data["required_technical_skills"] or "python" in [s.lower() for s in data["required_technical_skills"]]


def test_analyze_job_match_end_to_end(client: TestClient, auth_headers: dict, user_resume: ResumeDocument):
    payload = {
        "resume_id": user_resume.id,
        "version_id": user_resume.current_version_id,
        "job_description": SAMPLE_JOB_DESC,
        "job_title": "Senior AI Software Engineer",
        "company_name": "CloudAI Corp",
    }
    response = client.post("/api/job-matches/analyze", json=payload, headers=auth_headers)
    assert response.status_code == 201
    report = response.json()
    assert report["id"] is not None
    assert report["resume_id"] == user_resume.id
    assert report["resume_version_id"] == user_resume.current_version_id
    assert report["job_title"] == "Senior AI Software Engineer"
    assert report["company_name"] == "CloudAI Corp"
    assert 0 <= report["overall_score"] <= 100
    assert "score_breakdown" in report["comparison_result"]
    assert len(report["recommendations"]) > 0


def test_job_match_listing_and_detail(client: TestClient, auth_headers: dict, user_resume: ResumeDocument):
    # 1. Create a match
    create_res = client.post(
        "/api/job-matches/analyze",
        json={
            "resume_id": user_resume.id,
            "job_description": SAMPLE_JOB_DESC,
            "job_title": "Platform Engineer",
        },
        headers=auth_headers,
    )
    report_id = create_res.json()["id"]

    # 2. List matches
    list_res = client.get("/api/job-matches", headers=auth_headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(item["id"] == report_id for item in items)

    # 3. Get single detail
    detail_res = client.get(f"/api/job-matches/{report_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == report_id

    # 4. Delete match
    del_res = client.delete(f"/api/job-matches/{report_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify deleted
    get_res = client.get(f"/api/job-matches/{report_id}", headers=auth_headers)
    assert get_res.status_code == 404


def test_resume_tailoring_workflow(client: TestClient, auth_headers: dict, user_resume: ResumeDocument):
    # 1. Analyze job match
    analyze_res = client.post(
        "/api/job-matches/analyze",
        json={"resume_id": user_resume.id, "job_description": SAMPLE_JOB_DESC},
        headers=auth_headers,
    )
    report_id = analyze_res.json()["id"]
    recommendations = analyze_res.json()["recommendations"]
    assert len(recommendations) > 0

    first_rec_id = recommendations[0]["id"]

    # 2. Tailor draft with accepted recommendation
    tailor_res = client.post(
        f"/api/job-matches/{report_id}/tailor",
        json={"accepted_recommendation_ids": [first_rec_id]},
        headers=auth_headers,
    )
    assert tailor_res.status_code == 200
    draft = tailor_res.json()
    assert draft["report_id"] == report_id
    assert "tailored_resume_data" in draft
    assert len(draft["applied_recommendations"]) == 1

    # 3. Save tailored resume as new version
    save_res = client.post(
        f"/api/job-matches/{report_id}/save-tailored",
        json={
            "action": "new_version",
            "target_resume_id": user_resume.id,
            "version_notes": "Tailored with accepted recommendations",
            "tailored_resume_data": draft["tailored_resume_data"],
        },
        headers=auth_headers,
    )
    assert save_res.status_code == 201
    updated_resume = save_res.json()
    assert updated_resume["versions_count"] == 2
    assert updated_resume["current_version"]["version_number"] == 2


def test_cross_user_authorization(
    client: TestClient, auth_headers: dict, other_headers: dict, user_resume: ResumeDocument
):
    # User A analyzes
    res = client.post(
        "/api/job-matches/analyze",
        json={"resume_id": user_resume.id, "job_description": SAMPLE_JOB_DESC},
        headers=auth_headers,
    )
    report_id = res.json()["id"]

    # User B cannot use User A's resume to analyze
    other_create_res = client.post(
        "/api/job-matches/analyze",
        json={"resume_id": user_resume.id, "job_description": SAMPLE_JOB_DESC},
        headers=other_headers,
    )
    assert other_create_res.status_code in (403, 404)

    # User B cannot view User A's report
    get_res = client.get(f"/api/job-matches/{report_id}", headers=other_headers)
    assert get_res.status_code in (403, 404)

    # User B cannot tailor User A's report
    tailor_res = client.post(
        f"/api/job-matches/{report_id}/tailor",
        json={"accepted_recommendation_ids": []},
        headers=other_headers,
    )
    assert tailor_res.status_code in (403, 404)

    # User B cannot delete User A's report
    del_res = client.delete(f"/api/job-matches/{report_id}", headers=other_headers)
    assert del_res.status_code in (403, 404)
