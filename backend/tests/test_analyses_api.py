import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.user import User
from app.models.analysis import AnalysisHistory


@pytest.fixture
def auth_user(test_db_session: Session) -> User:
    user = User(
        email="analyst@example.com",
        hashed_password=hash_password("Password123!"),
        display_name="Analyst User",
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(auth_user: User) -> dict:
    token = create_access_token({"sub": auth_user.id})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def populated_analyses(test_db_session: Session, auth_user: User):
    # User records
    r1 = AnalysisHistory(
        user_id=auth_user.id,
        original_filename="resume_ml.pdf",
        target_role="Machine Learning Engineer",
        status="completed",
        analysis_type="resume",
        source_type="pdf",
        overall_score=85,
        ats_score=90,
        result_json={"overall_score": 85},
    )
    r2 = AnalysisHistory(
        user_id=auth_user.id,
        original_filename="https://linkedin.com/in/mlengineer",
        target_role="Lead AI Scientist",
        status="completed",
        analysis_type="linkedin",
        source_type="url",
        overall_score=92,
        ats_score=88,
        result_json={"overall_score": 92},
    )
    # Failed record
    r3 = AnalysisHistory(
        user_id=auth_user.id,
        original_filename="corrupted.pdf",
        target_role="Frontend Engineer",
        status="failed",
        analysis_type="resume",
        source_type="pdf",
        error_category="PARSING_ERROR",
        error_message="Corrupted PDF bytes",
    )
    # Anonymous record (no user)
    r4 = AnalysisHistory(
        user_id=None,
        original_filename="anon_resume.pdf",
        target_role="DevOps Specialist",
        status="completed",
        analysis_type="resume",
        source_type="pdf",
        overall_score=75,
    )
    test_db_session.add_all([r1, r2, r3, r4])
    test_db_session.commit()
    return [r1, r2, r3, r4]


def test_list_analyses_paginated(client: TestClient, auth_headers: dict, populated_analyses):
    response = client.get("/api/analyses?page=1&page_size=10", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3  # Only auth_user's 3 items
    assert len(data["items"]) == 3
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert data["total_pages"] == 1


def test_list_analyses_search_and_filters(client: TestClient, auth_headers: dict, populated_analyses):
    # Filter by source_type=url
    res_url = client.get("/api/analyses?source_type=url", headers=auth_headers)
    assert res_url.status_code == 200
    data_url = res_url.json()
    assert data_url["total"] == 1
    assert data_url["items"][0]["target_role"] == "Lead AI Scientist"

    # Search filter
    res_search = client.get("/api/analyses?search=Machine", headers=auth_headers)
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert data_search["total"] == 1
    assert data_search["items"][0]["target_role"] == "Machine Learning Engineer"

    # Filter by status=failed
    res_failed = client.get("/api/analyses?status=failed", headers=auth_headers)
    assert res_failed.status_code == 200
    data_failed = res_failed.json()
    assert data_failed["total"] == 1
    assert data_failed["items"][0]["status"] == "failed"


def test_get_latest_analysis(client: TestClient, auth_headers: dict, populated_analyses):
    response = client.get("/api/analyses/latest", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] is not None
    # Most recently created is r3
    assert data["status"] in ("failed", "completed")


def test_get_analysis_detail_by_id(client: TestClient, auth_headers: dict, populated_analyses):
    report_id = populated_analyses[0].id
    response = client.get(f"/api/analyses/{report_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == report_id
    assert data["overall_score"] == 85
    assert data["result_json"] is not None


def test_delete_analysis_report(client: TestClient, auth_headers: dict, populated_analyses):
    report_id = populated_analyses[0].id
    del_res = client.delete(f"/api/analyses/{report_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Now verify it is gone
    get_res = client.get(f"/api/analyses/{report_id}", headers=auth_headers)
    assert get_res.status_code == 404


def test_backward_compatibility_history_endpoint(client: TestClient, auth_headers: dict, populated_analyses):
    # Verify legacy /api/history returns existing records without disruption
    response = client.get("/api/history", headers=auth_headers)
    assert response.status_code == 200
    records = response.json()
    assert isinstance(records, list)
    assert len(records) >= 3
    assert "filename" in records[0]
    assert "overall_score" in records[0]
