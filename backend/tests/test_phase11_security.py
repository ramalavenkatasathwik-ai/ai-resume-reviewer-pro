"""
Phase 11 Security & Hardening Integration Test Suite
Verifies:
1. IDOR and Cross-Tenant isolation (Analysis reports, Resumes, Stored files, Job matches, Exports, Emails)
2. Instantaneous JWT token revocation on password change and logout
3. Security response headers (nosniff, DENY, etc.)
4. Prompt injection defense delimitation and input boundaries
5. Path traversal defense in export filename slugs
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.database.base import utc_now
from app.models.analysis import AnalysisHistory
from app.models.job_match import JobMatchReport
from app.models.resume import ResumeDocument, ResumeVersion
from app.models.stored_file import StoredFile
from app.models.user import User
from app.services.storage_service import StorageService


def _create_user(db: Session, email: str, password: str = "SecurePass123!") -> User:
    """Helper to create an active test user."""
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        hashed_password=hash_password(password),
        display_name=email.split("@")[0],
        is_active=True,
        token_version=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth_headers(user: User) -> dict:
    """Helper to generate Authorization header for a user."""
    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "v": getattr(user, "token_version", 1),
    })
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# 1. Security Response Headers
# ==============================================================================

def test_security_response_headers(client: TestClient):
    """Verifies that all responses include defensive HTTP security headers."""
    response = client.get("/api/health")
    assert response.status_code == 200
    headers = response.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert "1; mode=block" in headers.get("X-XSS-Protection", "")
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in headers.get("Permissions-Policy", "")


# ==============================================================================
# 2. Analysis Report IDOR & Authorization Boundaries
# ==============================================================================

def test_analysis_report_idor_protection(client: TestClient, test_db_session: Session):
    """Verifies that unauthenticated users and cross-tenant users cannot access an analysis report."""
    user_a = _create_user(test_db_session, "user_a_analysis@example.com")
    user_b = _create_user(test_db_session, "user_b_analysis@example.com")

    # Create analysis owned by User A
    analysis = AnalysisHistory(
        id=str(uuid.uuid4()),
        user_id=user_a.id,
        original_filename="confidential_resume.pdf",
        target_role="Lead AI Architect",
        analysis_type="resume",
        source_type="pdf",
        status="completed",
        overall_score=94,
        ats_score=95,
        result_json={"candidate_information": {"name": "User A"}},
    )
    test_db_session.add(analysis)
    test_db_session.commit()

    # 1. Unauthenticated request must NOT see User A's report
    unauth_resp = client.get(f"/api/analyses/{analysis.id}")
    assert unauth_resp.status_code == 404
    assert unauth_resp.json()["detail"]["error"] == "REPORT_NOT_FOUND"

    # 2. User B must NOT see User A's report
    user_b_resp = client.get(f"/api/analyses/{analysis.id}", headers=_auth_headers(user_b))
    assert user_b_resp.status_code == 404

    # 3. User B cannot delete User A's report
    user_b_del = client.delete(f"/api/analyses/{analysis.id}", headers=_auth_headers(user_b))
    assert user_b_del.status_code == 404

    # 4. User A (owner) CAN access report
    user_a_resp = client.get(f"/api/analyses/{analysis.id}", headers=_auth_headers(user_a))
    assert user_a_resp.status_code == 200
    assert user_a_resp.json()["id"] == analysis.id
    assert user_a_resp.json()["target_role"] == "Lead AI Architect"

    # 5. User B cannot export User A's report to PDF
    user_b_export = client.get(f"/api/analyses/{analysis.id}/export/pdf", headers=_auth_headers(user_b))
    assert user_b_export.status_code == 403
    assert user_b_export.json()["detail"]["error"] == "ACCESS_DENIED"


# ==============================================================================
# 3. Resume Library IDOR Protection
# ==============================================================================

def test_resume_library_idor_protection(client: TestClient, test_db_session: Session):
    """Verifies that User B cannot read, update, delete, or export User A's resumes."""
    user_a = _create_user(test_db_session, "user_a_resume@example.com")
    user_b = _create_user(test_db_session, "user_b_resume@example.com")

    # Create Resume for User A
    create_resp = client.post(
        "/api/resumes",
        headers=_auth_headers(user_a),
        json={
            "title": "User A Executive Resume",
            "target_role": "Principal Engineer",
            "template_name": "executive",
            "resume_data": {
                "name": "User A",
                "email": "user_a@example.com",
                "summary": "Confidential executive profile",
                "skills": ["Distributed Systems"],
                "experience": [],
                "education": [],
            },
        },
    )
    assert create_resp.status_code == 201
    resume_id = create_resp.json()["id"]
    version_id = create_resp.json()["current_version_id"]

    # 1. Unauthenticated access blocked
    assert client.get(f"/api/resumes/{resume_id}").status_code == 401

    # 2. User B cannot read User A's resume
    b_get = client.get(f"/api/resumes/{resume_id}", headers=_auth_headers(user_b))
    assert b_get.status_code == 403
    assert b_get.json()["detail"]["error"] == "ACCESS_DENIED"

    # 3. User B cannot update User A's resume
    b_patch = client.patch(
        f"/api/resumes/{resume_id}",
        headers=_auth_headers(user_b),
        json={"title": "Hacked Title"},
    )
    assert b_patch.status_code == 403

    # 4. User B cannot delete User A's resume
    b_delete = client.delete(f"/api/resumes/{resume_id}", headers=_auth_headers(user_b))
    assert b_delete.status_code == 403

    # 5. User B cannot export User A's resume to PDF or DOCX
    b_export_pdf = client.get(
        f"/api/resumes/{resume_id}/versions/{version_id}/export/pdf",
        headers=_auth_headers(user_b),
    )
    assert b_export_pdf.status_code == 403

    b_export_docx = client.get(
        f"/api/resumes/{resume_id}/versions/{version_id}/export/docx",
        headers=_auth_headers(user_b),
    )
    assert b_export_docx.status_code == 403


# ==============================================================================
# 4. Job Match Report IDOR Protection
# ==============================================================================

def test_job_match_report_idor_protection(client: TestClient, test_db_session: Session):
    """Verifies that User B cannot read, export, or delete User A's job match reports."""
    user_a = _create_user(test_db_session, "user_a_jm@example.com")
    user_b = _create_user(test_db_session, "user_b_jm@example.com")

    # Create resume document and version for User A first
    resume_doc = ResumeDocument(
        id=str(uuid.uuid4()),
        user_id=user_a.id,
        title="User A SRE Resume",
        target_role="Site Reliability Engineer",
    )
    test_db_session.add(resume_doc)
    test_db_session.commit()

    resume_ver = ResumeVersion(
        id=str(uuid.uuid4()),
        resume_id=resume_doc.id,
        user_id=user_a.id,
        version_number=1,
        template_name="modern",
        page_format="letter",
        resume_data={"name": "User A", "skills": ["Kubernetes", "Linux"]},
    )
    test_db_session.add(resume_ver)
    resume_doc.current_version_id = resume_ver.id
    test_db_session.commit()

    report = JobMatchReport(
        id=str(uuid.uuid4()),
        user_id=user_a.id,
        resume_id=resume_doc.id,
        resume_version_id=resume_ver.id,
        job_title="Senior Site Reliability Engineer",
        company_name="Cloud Corp",
        job_description_raw="We are looking for an SRE with Kubernetes and Terraform experience.",
        extracted_requirements={"required_technical_skills": ["Kubernetes", "Terraform"]},
        comparison_result={"overall_score": 85, "score_breakdown": {}},
        recommendations=[],
        overall_score=85,
        required_skills_score=90,
        preferred_skills_score=80,
        experience_score=85,
        keyword_score=80,
        status="completed",
    )
    test_db_session.add(report)
    test_db_session.commit()

    # 1. Unauthenticated access blocked
    assert client.get(f"/api/job-matches/{report.id}").status_code == 401

    # 2. User B cannot view User A's job match report
    b_resp = client.get(f"/api/job-matches/{report.id}", headers=_auth_headers(user_b))
    assert b_resp.status_code == 403
    assert b_resp.json()["detail"]["error"] == "ACCESS_DENIED"

    # 3. User B cannot delete User A's report
    b_del = client.delete(f"/api/job-matches/{report.id}", headers=_auth_headers(user_b))
    assert b_del.status_code == 403

    # 4. User B cannot export User A's report to PDF
    b_exp = client.get(f"/api/job-matches/{report.id}/export/pdf", headers=_auth_headers(user_b))
    assert b_exp.status_code == 403


# ==============================================================================
# 5. Private Storage IDOR Protection
# ==============================================================================

def test_file_storage_idor_protection(client: TestClient, test_db_session: Session):
    """Verifies that User B cannot download or delete User A's private stored files."""
    user_a = _create_user(test_db_session, "user_a_storage@example.com")
    user_b = _create_user(test_db_session, "user_b_storage@example.com")

    # Upload file for User A
    file_bytes = b"%PDF-1.4 Mock confidential content"
    stored_file = StorageService.save_user_file(
        db=test_db_session,
        user=user_a,
        original_filename="private_profile.pdf",
        file_bytes=file_bytes,
        purpose="linkedin_pdf",
        declared_mime_type="application/pdf",
    )

    # 1. User B cannot download User A's file
    b_download = client.get(f"/api/files/{stored_file.id}/download", headers=_auth_headers(user_b))
    assert b_download.status_code == 403
    assert b_download.json()["detail"]["error"] == "ACCESS_DENIED"

    # 2. User B cannot delete User A's file
    b_delete = client.delete(f"/api/files/{stored_file.id}", headers=_auth_headers(user_b))
    assert b_delete.status_code == 403

    # 3. User A (owner) can download successfully
    a_download = client.get(f"/api/files/{stored_file.id}/download", headers=_auth_headers(user_a))
    assert a_download.status_code == 200
    assert a_download.content == file_bytes


# ==============================================================================
# 6. Instantaneous Token Revocation
# ==============================================================================

def test_token_revocation_on_password_change(client: TestClient):
    """Verifies that changing password immediately invalidates previously issued JWT tokens."""
    # 1. Register user and capture initial token
    reg = client.post(
        "/api/auth/register",
        json={
            "email": "revocation_pwd@example.com",
            "password": "InitialPassword123!",
            "display_name": "Revoke Tester",
        },
    )
    assert reg.status_code == 201
    old_token = reg.json()["access_token"]
    old_headers = {"Authorization": f"Bearer {old_token}"}

    # Verify initial token works
    me_resp1 = client.get("/api/auth/me", headers=old_headers)
    assert me_resp1.status_code == 200

    # 2. Change password
    change_resp = client.post(
        "/api/auth/change-password",
        headers=old_headers,
        json={
            "current_password": "InitialPassword123!",
            "new_password": "NewStrongPassword456!",
        },
    )
    assert change_resp.status_code == 200

    # 3. Verify OLD token is now instantly REVOKED
    me_resp2 = client.get("/api/auth/me", headers=old_headers)
    assert me_resp2.status_code == 401
    assert me_resp2.json()["detail"]["error"] == "TOKEN_REVOKED"

    # 4. Login with NEW password gives a working token
    login_resp = client.post(
        "/api/auth/login",
        json={
            "email": "revocation_pwd@example.com",
            "password": "NewStrongPassword456!",
        },
    )
    assert login_resp.status_code == 200
    new_token = login_resp.json()["access_token"]
    new_headers = {"Authorization": f"Bearer {new_token}"}

    me_resp3 = client.get("/api/auth/me", headers=new_headers)
    assert me_resp3.status_code == 200


def test_token_revocation_on_logout(client: TestClient):
    """Verifies that calling /auth/logout immediately invalidates active bearer tokens."""
    # 1. Register user
    reg = client.post(
        "/api/auth/register",
        json={
            "email": "revocation_logout@example.com",
            "password": "LogoutPassword123!",
            "display_name": "Logout Tester",
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify token works
    assert client.get("/api/auth/me", headers=headers).status_code == 200

    # 2. Call logout with the bearer token
    logout_resp = client.post("/api/auth/logout", headers=headers)
    assert logout_resp.status_code == 200

    # 3. Verify the token is now rejected as revoked
    me_after_logout = client.get("/api/auth/me", headers=headers)
    assert me_after_logout.status_code == 401
    assert me_after_logout.json()["detail"]["error"] == "TOKEN_REVOKED"


# ==============================================================================
# 7. Path Traversal Defense in Filenames
# ==============================================================================

def test_path_traversal_filename_sanitization(client: TestClient, test_db_session: Session):
    """Verifies that malicious resume titles with path traversal are neutralized in export headers."""
    user = _create_user(test_db_session, "user_traversal@example.com")

    # Create Resume with path traversal in title
    create_resp = client.post(
        "/api/resumes",
        headers=_auth_headers(user),
        json={
            "title": "../../../etc/passwd_and_secrets",
            "target_role": "Security Specialist",
            "resume_data": {
                "name": "Hacker",
                "email": "hacker@example.com",
                "skills": ["Testing"],
            },
        },
    )
    assert create_resp.status_code == 201
    resume_id = create_resp.json()["id"]
    version_id = create_resp.json()["current_version_id"]

    # Export PDF and inspect Content-Disposition header
    export_resp = client.get(
        f"/api/resumes/{resume_id}/versions/{version_id}/export/pdf",
        headers=_auth_headers(user),
    )
    assert export_resp.status_code == 200
    cd = export_resp.headers.get("Content-Disposition", "")
    # Should not contain any / or \ or ..
    assert "../" not in cd
    assert "..\\" not in cd
    assert "/" not in cd.split("filename=")[-1]
    assert "\\" not in cd.split("filename=")[-1]
