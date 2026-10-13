import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.user import User
from app.models.resume import ResumeDocument, ResumeVersion
from app.models.career_intelligence import CareerRoadmap, MultiRoleComparison
from app.services.resume_document_service import ResumeDocumentService


@pytest.fixture
def career_user(test_db_session: Session) -> User:
    user = User(
        email="career_user@example.com",
        hashed_password=hash_password("SecurePassword123!"),
        display_name="Career User",
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user


@pytest.fixture
def career_other_user(test_db_session: Session) -> User:
    user = User(
        email="career_other@example.com",
        hashed_password=hash_password("SecurePassword123!"),
        display_name="Career Other",
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user


@pytest.fixture
def career_auth_headers(career_user: User) -> dict:
    token = create_access_token({"sub": career_user.id})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def career_other_auth_headers(career_other_user: User) -> dict:
    token = create_access_token({"sub": career_other_user.id})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_resume(test_db_session: Session, career_user: User) -> ResumeDocument:
    resume_data = {
        "basics": {
            "name": "Alex Mercer",
            "title": "Software Engineer",
            "summary": "Experienced engineer with a strong focus on Python, FastAPI, and automated backend systems.",
        },
        "skills": ["Python", "FastAPI", "SQL", "Docker", "Git", "PostgreSQL", "Pytest"],
        "experience": [
            {
                "company": "CloudTech Inc",
                "position": "Backend Developer",
                "highlights": [
                    "Developed asynchronous REST APIs using FastAPI and PostgreSQL.",
                    "Improved CI/CD pipeline efficiency with Docker and Pytest.",
                ],
            }
        ],
        "projects": [
            {
                "name": "Microservice Gateway",
                "description": "High-throughput API gateway built with Python and Redis.",
                "highlights": ["Processed 1M+ requests daily with 99.9% uptime."],
            }
        ],
        "education": [
            {
                "institution": "State University",
                "area": "Computer Science",
                "studyType": "Bachelor of Science",
            }
        ],
    }
    return ResumeDocumentService.create_resume(
        db=test_db_session,
        user=career_user,
        title="Alex Mercer - Primary Resume",
        target_role="AI Developer",
        resume_data=resume_data,
        version_notes="v1 initial",
    )


# ---------------------------------------------------------------------------
# 1. Multi-Version Resume Generator Tests
# ---------------------------------------------------------------------------

def test_generate_role_variant_heuristic(client: TestClient, career_auth_headers: dict, sample_resume: ResumeDocument):
    response = client.post(
        "/api/career/variants/generate",
        headers=career_auth_headers,
        json={
            "resume_id": sample_resume.id,
            "target_role": "Python Developer",
            "focus_areas": ["Backend APIs", "Database Optimization"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["target_role"] == "Python Developer"
    assert "Python Developer" in data["variant_title"]
    assert data["factual_integrity_verified"] is True
    assert len(data["key_modifications"]) > 0
    # Verified skills should prioritize Python / FastAPI
    assert any("Python" in s for s in data["verified_skills_prioritized"])


def test_save_role_variant_as_new_document(client: TestClient, career_auth_headers: dict, sample_resume: ResumeDocument):
    # Fetch variant draft first
    gen_resp = client.post(
        "/api/career/variants/generate",
        headers=career_auth_headers,
        json={
            "resume_id": sample_resume.id,
            "target_role": "Data Analyst",
        },
    )
    draft = gen_resp.json()

    save_resp = client.post(
        "/api/career/variants/save",
        headers=career_auth_headers,
        json={
            "title": "Alex Mercer - Data Analyst Edition",
            "target_role": "Data Analyst",
            "resume_data": draft["resume_data"],
            "save_as_new_document": True,
            "version_notes": "Tailored for analytics roles",
        },
    )
    assert save_resp.status_code == 200
    save_data = save_resp.json()
    assert save_data["status"] == "created"
    assert save_data["title"] == "Alex Mercer - Data Analyst Edition"
    assert save_data["document_id"] != sample_resume.id


def test_save_role_variant_as_new_version(client: TestClient, career_auth_headers: dict, sample_resume: ResumeDocument):
    save_resp = client.post(
        "/api/career/variants/save",
        headers=career_auth_headers,
        json={
            "resume_id": sample_resume.id,
            "title": sample_resume.title,
            "target_role": "Automation Engineer",
            "resume_data": sample_resume.versions[0].resume_data,
            "save_as_new_document": False,
            "version_notes": "Appended v2 automation variant",
        },
    )
    assert save_resp.status_code == 200
    save_data = save_resp.json()
    assert save_data["status"] == "version_appended"
    assert save_data["version_number"] == 2


def test_compare_variants(client: TestClient, career_auth_headers: dict, sample_resume: ResumeDocument):
    base_data = sample_resume.versions[0].resume_data
    variant_data = dict(base_data)
    variant_data["basics"] = dict(base_data["basics"])
    variant_data["basics"]["title"] = "Senior Automation Engineer"
    variant_data["basics"]["summary"] = "Specialized Automation Engineer leading test frameworks."

    response = client.post(
        "/api/career/variants/compare",
        headers=career_auth_headers,
        json={
            "base_resume_data": base_data,
            "variant_resume_data": variant_data,
        },
    )
    assert response.status_code == 200
    diff = response.json()
    assert diff["target_role"] == "Senior Automation Engineer"
    assert len(diff["sections"]) >= 4
    assert any("title" in d.lower() or "summary" in d.lower() for d in diff["summary_of_differences"])


# ---------------------------------------------------------------------------
# 2. Writing Assistant Tests
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("sec", [
    "summary",
    "experience_bullets",
    "project_descriptions",
    "technical_skills",
    "linkedin_headline",
    "linkedin_about",
    "cover_letter",
    "achievements",
])
def test_writing_assistant_all_eight_sections(client: TestClient, career_auth_headers: dict, sample_resume: ResumeDocument, sec: str):
    response = client.post(
        "/api/career/writing/suggest",
        headers=career_auth_headers,
        json={
            "section": sec,
            "target_role": "AI Developer",
            "resume_id": sample_resume.id,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["section"] == sec
    assert len(data["suggestions"]) >= 3
    # Verify each suggestion has explanation, action verbs, and requires_user_confirmation flag
    for sug in data["suggestions"]:
        assert "proposed_revision" in sug and len(sug["proposed_revision"]) > 10
        assert "explanation" in sug and len(sug["explanation"]) > 5
        assert isinstance(sug["requires_user_confirmation"], bool)
        assert len(sug["action_verbs_used"]) > 0


def test_writing_assistant_invalid_section(client: TestClient, career_auth_headers: dict):
    response = client.post(
        "/api/career/writing/suggest",
        headers=career_auth_headers,
        json={
            "section": "unsupported_section",
            "target_role": "AI Developer",
        },
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# 3. Personalized Career Roadmap Tests
# ---------------------------------------------------------------------------

def test_generate_and_save_career_roadmap(client: TestClient, career_auth_headers: dict, sample_resume: ResumeDocument):
    # 1. Generate
    gen_resp = client.post(
        "/api/career/roadmap/generate",
        headers=career_auth_headers,
        json={
            "resume_id": sample_resume.id,
            "target_role": "AI Developer",
            "current_level": "Mid-level",
            "target_level": "Senior AI Developer",
        },
    )
    assert gen_resp.status_code == 200
    roadmap_data = gen_resp.json()
    assert roadmap_data["target_role"] == "AI Developer"
    assert len(roadmap_data["strengths"]) > 0
    assert len(roadmap_data["skill_gaps"]) > 0
    assert len(roadmap_data["learning_topics"]) > 0
    assert len(roadmap_data["short_term_milestones"]) > 0
    assert "guarantee" in roadmap_data["disclaimer"].lower()

    # 2. Save
    save_resp = client.post(
        "/api/career/roadmap/save",
        headers=career_auth_headers,
        json={
            "resume_id": sample_resume.id,
            "target_role": "AI Developer",
            "current_level": "Mid-level",
            "target_level": "Senior AI Developer",
            "strengths": roadmap_data["strengths"],
            "skill_gaps": roadmap_data["skill_gaps"],
            "potential_undocumented_skills": roadmap_data["potential_undocumented_skills"],
            "learning_topics": roadmap_data["learning_topics"],
            "practical_projects": roadmap_data["practical_projects"],
            "portfolio_improvements": roadmap_data["portfolio_improvements"],
            "certifications": roadmap_data["certifications"],
            "action_items": roadmap_data["action_items"],
            "short_term_milestones": roadmap_data["short_term_milestones"],
            "medium_term_milestones": roadmap_data["medium_term_milestones"],
            "disclaimer": roadmap_data["disclaimer"],
        },
    )
    assert save_resp.status_code == 200
    saved = save_resp.json()
    roadmap_id = saved["id"]
    assert roadmap_id is not None

    # 3. List
    list_resp = client.get("/api/career/roadmaps", headers=career_auth_headers)
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert any(item["id"] == roadmap_id for item in items)

    # 4. Get by ID
    get_resp = client.get(f"/api/career/roadmaps/{roadmap_id}", headers=career_auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["target_role"] == "AI Developer"

    # 5. Delete
    del_resp = client.delete(f"/api/career/roadmaps/{roadmap_id}", headers=career_auth_headers)
    assert del_resp.status_code == 200
    assert client.get(f"/api/career/roadmaps/{roadmap_id}", headers=career_auth_headers).status_code == 404


def test_career_roadmap_authorization_isolation(
    client: TestClient, career_auth_headers: dict, career_other_auth_headers: dict, sample_resume: ResumeDocument
):
    # User A creates a roadmap
    save_resp = client.post(
        "/api/career/roadmap/save",
        headers=career_auth_headers,
        json={
            "resume_id": sample_resume.id,
            "target_role": "Data Analyst",
            "strengths": [],
            "skill_gaps": [],
        },
    )
    roadmap_id = save_resp.json()["id"]

    # User B attempts to access User A's roadmap
    get_resp = client.get(f"/api/career/roadmaps/{roadmap_id}", headers=career_other_auth_headers)
    assert get_resp.status_code == 404

    # User B attempts to delete User A's roadmap
    del_resp = client.delete(f"/api/career/roadmaps/{roadmap_id}", headers=career_other_auth_headers)
    assert del_resp.status_code == 404


# ---------------------------------------------------------------------------
# 4. Multi-Role Comparison Engine Tests
# ---------------------------------------------------------------------------

def test_compare_multi_role(client: TestClient, career_auth_headers: dict, sample_resume: ResumeDocument):
    roles = ["Python Developer", "AI Developer", "Data Analyst"]
    response = client.post(
        "/api/career/multi-role/compare",
        headers=career_auth_headers,
        json={
            "resume_id": sample_resume.id,
            "target_roles": roles,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["roles_evaluated"]) == 3
    assert data["best_fit_role"] in roles
    assert len(data["trade_offs_summary"]) > 20

    # Scores must be 0-100 deterministic
    for r in roles:
        res = data["role_results"][r]
        assert 0 <= res["overall_score"] <= 100
        assert 0 <= res["required_skills_score"] <= 100
        assert len(res["recommended_variant_title"]) > 0

    # Save comparison
    save_resp = client.post(
        "/api/career/multi-role/save",
        headers=career_auth_headers,
        json={
            "resume_id": sample_resume.id,
            "resume_version_id": sample_resume.versions[0].id,
            "roles_evaluated": data["roles_evaluated"],
            "role_results": data["role_results"],
            "best_fit_role": data["best_fit_role"],
            "trade_offs_summary": data["trade_offs_summary"],
        },
    )
    assert save_resp.status_code == 200
    comp_id = save_resp.json()["id"]

    # List comparisons
    list_resp = client.get("/api/career/multi-role", headers=career_auth_headers)
    assert list_resp.status_code == 200
    assert any(c["id"] == comp_id for c in list_resp.json())

    # Delete comparison
    del_resp = client.delete(f"/api/career/multi-role/{comp_id}", headers=career_auth_headers)
    assert del_resp.status_code == 200


# ---------------------------------------------------------------------------
# 5. Project Recommendations Tests
# ---------------------------------------------------------------------------

def test_recommend_portfolio_projects(client: TestClient, career_auth_headers: dict, sample_resume: ResumeDocument):
    response = client.post(
        "/api/career/projects/recommend",
        headers=career_auth_headers,
        json={
            "target_role": "AI Developer",
            "resume_id": sample_resume.id,
            "skill_gaps": ["PyTorch", "Transformers", "LLMs"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["target_role"] == "AI Developer"
    assert len(data["projects"]) >= 2

    for proj in data["projects"]:
        assert proj["is_proposed"] is True
        assert "PROPOSED PROJECT" in proj["guardrail_notice"]
        assert len(proj["skills_demonstrated"]) > 0
        assert len(proj["tech_stack"]) > 0
        assert len(proj["core_features"]) > 0
        assert len(proj["milestones"]) > 0
        assert len(proj["deliverables"]) > 0
        assert len(proj["resume_documentation_guide"]) > 0
