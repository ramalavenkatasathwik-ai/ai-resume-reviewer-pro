import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.user import User
from app.models.resume import ResumeDocument, ResumeVersion


@pytest.fixture
def test_user(test_db_session: Session) -> User:
    user = User(
        email="resume_owner@example.com",
        hashed_password=hash_password("SecurePassword123!"),
        display_name="Resume Owner",
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user


@pytest.fixture
def other_user(test_db_session: Session) -> User:
    user = User(
        email="other_owner@example.com",
        hashed_password=hash_password("SecurePassword123!"),
        display_name="Other User",
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict:
    token = create_access_token({"sub": test_user.id})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_auth_headers(other_user: User) -> dict:
    token = create_access_token({"sub": other_user.id})
    return {"Authorization": f"Bearer {token}"}


SAMPLE_RESUME_DATA = {
    "basics": {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "title": "Senior AI Engineer",
        "summary": "AI Engineer specializing in LLMs and distributed architectures.",
    },
    "experience": [
        {
            "company": "DeepTech AI",
            "position": "Staff Engineer",
            "startDate": "2022-01",
            "endDate": "Present",
            "highlights": ["Architected multi-agent LLM systems reducing latency by 45%."],
        }
    ],
    "skills": ["Python", "FastAPI", "PyTorch", "PostgreSQL", "Docker"],
}


def test_create_resume_success(client: TestClient, auth_headers: dict):
    payload = {
        "title": "Principal AI Engineer Resume",
        "target_role": "AI Architect",
        "resume_data": SAMPLE_RESUME_DATA,
        "template_name": "modern",
        "page_format": "letter",
        "version_notes": "Initial draft targeting AI Architect roles",
    }
    response = client.post("/api/resumes", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Principal AI Engineer Resume"
    assert data["target_role"] == "AI Architect"
    assert data["versions_count"] == 1
    assert data["current_version_id"] is not None
    assert data["current_version"]["version_number"] == 1
    assert data["current_version"]["template_name"] == "modern"
    assert data["current_version"]["resume_data"]["basics"]["name"] == "Jane Doe"


def test_list_resumes(client: TestClient, auth_headers: dict):
    # Create two resumes
    client.post(
        "/api/resumes",
        json={"title": "Resume One", "target_role": "Backend Engineer", "resume_data": SAMPLE_RESUME_DATA},
        headers=auth_headers,
    )
    client.post(
        "/api/resumes",
        json={"title": "Resume Two", "target_role": "AI Engineer", "resume_data": SAMPLE_RESUME_DATA},
        headers=auth_headers,
    )

    response = client.get("/api/resumes", headers=auth_headers)
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 2

    # Test search filter
    search_res = client.get("/api/resumes?search=Backend", headers=auth_headers)
    assert search_res.status_code == 200
    search_items = search_res.json()
    assert len(search_items) == 1
    assert search_items[0]["title"] == "Resume One"


def test_get_resume_by_id(client: TestClient, auth_headers: dict):
    create_res = client.post(
        "/api/resumes",
        json={"title": "Detailed Resume", "target_role": "MLOps", "resume_data": SAMPLE_RESUME_DATA},
        headers=auth_headers,
    )
    resume_id = create_res.json()["id"]

    response = client.get(f"/api/resumes/{resume_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == resume_id
    assert data["title"] == "Detailed Resume"
    assert data["current_version"] is not None
    assert data["current_version"]["version_number"] == 1


def test_update_resume_metadata(client: TestClient, auth_headers: dict):
    create_res = client.post(
        "/api/resumes",
        json={"title": "Old Title", "target_role": "Junior Dev", "resume_data": SAMPLE_RESUME_DATA},
        headers=auth_headers,
    )
    resume_id = create_res.json()["id"]

    patch_res = client.patch(
        f"/api/resumes/{resume_id}",
        json={"title": "Promoted Senior Title", "target_role": "Senior Dev", "is_archived": True},
        headers=auth_headers,
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["title"] == "Promoted Senior Title"
    assert updated["target_role"] == "Senior Dev"
    assert updated["is_archived"] is True


def test_version_append_and_restore(client: TestClient, auth_headers: dict):
    # 1. Create resume (v1)
    create_res = client.post(
        "/api/resumes",
        json={"title": "Versioned Resume", "target_role": "AI Engineer", "resume_data": SAMPLE_RESUME_DATA},
        headers=auth_headers,
    )
    resume_id = create_res.json()["id"]
    v1_id = create_res.json()["current_version_id"]

    # 2. Add version 2
    v2_data = {**SAMPLE_RESUME_DATA, "basics": {**SAMPLE_RESUME_DATA["basics"], "title": "Staff AI Engineer"}}
    v2_res = client.post(
        f"/api/resumes/{resume_id}/versions",
        json={
            "resume_data": v2_data,
            "template_name": "classic",
            "version_notes": "Upgraded to Staff role",
        },
        headers=auth_headers,
    )
    assert v2_res.status_code == 201
    v2_body = v2_res.json()
    assert v2_body["version_number"] == 2
    assert v2_body["template_name"] == "classic"
    assert v2_body["resume_data"]["basics"]["title"] == "Staff AI Engineer"

    # Verify versions list
    versions_list_res = client.get(f"/api/resumes/{resume_id}/versions", headers=auth_headers)
    assert versions_list_res.status_code == 200
    versions = versions_list_res.json()
    assert len(versions) == 2
    assert versions[0]["version_number"] == 2
    assert versions[1]["version_number"] == 1

    # 3. Restore v1 (creates v3 with v1 content, preserving history)
    restore_res = client.post(f"/api/resumes/{resume_id}/restore/{v1_id}", headers=auth_headers)
    assert restore_res.status_code == 201
    v3_body = restore_res.json()
    assert v3_body["version_number"] == 3
    assert v3_body["template_name"] == "modern"
    assert v3_body["resume_data"]["basics"]["title"] == "Senior AI Engineer"
    assert "Restored from version 1" in v3_body["version_notes"]

    # Check active version of resume is now v3
    resume_res = client.get(f"/api/resumes/{resume_id}", headers=auth_headers)
    assert resume_res.json()["current_version_id"] == v3_body["id"]
    assert resume_res.json()["versions_count"] == 3


def test_duplicate_resume(client: TestClient, auth_headers: dict):
    create_res = client.post(
        "/api/resumes",
        json={"title": "Master Resume", "target_role": "Data Scientist", "resume_data": SAMPLE_RESUME_DATA},
        headers=auth_headers,
    )
    resume_id = create_res.json()["id"]

    dup_res = client.post(f"/api/resumes/{resume_id}/duplicate", headers=auth_headers)
    assert dup_res.status_code == 201
    dup_data = dup_res.json()
    assert dup_data["id"] != resume_id
    assert dup_data["title"] == "Master Resume (Copy)"
    assert dup_data["target_role"] == "Data Scientist"
    assert dup_data["current_version"] is not None


def test_delete_resume(client: TestClient, auth_headers: dict):
    create_res = client.post(
        "/api/resumes",
        json={"title": "To Delete", "target_role": "Analyst", "resume_data": SAMPLE_RESUME_DATA},
        headers=auth_headers,
    )
    resume_id = create_res.json()["id"]

    del_res = client.delete(f"/api/resumes/{resume_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    get_res = client.get(f"/api/resumes/{resume_id}", headers=auth_headers)
    assert get_res.status_code == 404


def test_cross_user_isolation(client: TestClient, auth_headers: dict, other_auth_headers: dict):
    # User A creates a resume
    create_res = client.post(
        "/api/resumes",
        json={"title": "Private Resume", "target_role": "Security Lead", "resume_data": SAMPLE_RESUME_DATA},
        headers=auth_headers,
    )
    resume_id = create_res.json()["id"]

    # User B cannot read User A's resume
    get_res = client.get(f"/api/resumes/{resume_id}", headers=other_auth_headers)
    assert get_res.status_code in (403, 404)

    # User B cannot patch User A's resume
    patch_res = client.patch(f"/api/resumes/{resume_id}", json={"title": "Hacked"}, headers=other_auth_headers)
    assert patch_res.status_code in (403, 404)

    # User B cannot delete User A's resume
    del_res = client.delete(f"/api/resumes/{resume_id}", headers=other_auth_headers)
    assert del_res.status_code in (403, 404)

    # User B's list does not show User A's resume
    list_res = client.get("/api/resumes", headers=other_auth_headers)
    assert list_res.status_code == 200
    assert all(r["id"] != resume_id for r in list_res.json())
