from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_reset_token,
    hash_reset_token,
)
from app.database.base import utc_now
from app.models.analysis import AnalysisHistory
from app.models.user import User, PasswordResetToken

settings = get_settings()


def test_password_hashing():
    pwd = "StrongPassword123!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_user_registration_success(client: TestClient):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "testuser@example.com",
            "password": "SecurePassword123!",
            "display_name": "Test User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "testuser@example.com"
    assert data["user"]["display_name"] == "Test User"
    assert "hashed_password" not in data["user"]

    # Check HttpOnly cookie
    assert settings.AUTH_COOKIE_NAME in response.cookies


def test_user_registration_weak_password(client: TestClient):
    # Too short
    res = client.post("/api/auth/register", json={"email": "u1@example.com", "password": "123"})
    assert res.status_code == 422

    # No uppercase
    res = client.post("/api/auth/register", json={"email": "u2@example.com", "password": "password123!"})
    assert res.status_code == 422

    # No number
    res = client.post("/api/auth/register", json={"email": "u3@example.com", "password": "Password!"})
    assert res.status_code == 422

    # No special char
    res = client.post("/api/auth/register", json={"email": "u4@example.com", "password": "Password123"})
    assert res.status_code == 422


def test_user_registration_duplicate_email(client: TestClient):
    client.post(
        "/api/auth/register",
        json={
            "email": "dup@example.com",
            "password": "SecurePassword123!",
            "display_name": "Original",
        },
    )
    dup_res = client.post(
        "/api/auth/register",
        json={
            "email": "DUP@example.com",
            "password": "AnotherPassword123!",
            "display_name": "Duplicate",
        },
    )
    assert dup_res.status_code == 409
    assert dup_res.json()["detail"]["error"] == "EMAIL_ALREADY_REGISTERED"


def test_user_login_success_and_logout(client: TestClient):
    client.post(
        "/api/auth/register",
        json={
            "email": "loginuser@example.com",
            "password": "MyLoginPass123!",
        },
    )

    login_res = client.post(
        "/api/auth/login",
        json={
            "email": "LOGINUSER@EXAMPLE.COM",  # Test case-insensitivity
            "password": "MyLoginPass123!",
        },
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token

    # Check /me with header
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "loginuser@example.com"

    # Logout
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200


def test_user_login_invalid_credentials(client: TestClient):
    # Non-existent user
    res = client.post(
        "/api/auth/login",
        json={"email": "nonexistent@example.com", "password": "Password123!"},
    )
    assert res.status_code == 401
    assert res.json()["detail"]["error"] == "INVALID_CREDENTIALS"

    # Existing user, wrong password
    client.post(
        "/api/auth/register",
        json={"email": "wrongpwd@example.com", "password": "CorrectPassword123!"},
    )
    res = client.post(
        "/api/auth/login",
        json={"email": "wrongpwd@example.com", "password": "IncorrectPassword123!"},
    )
    assert res.status_code == 401
    assert res.json()["detail"]["error"] == "INVALID_CREDENTIALS"


def test_update_profile(client: TestClient):
    reg = client.post(
        "/api/auth/register",
        json={"email": "profile@example.com", "password": "Password123!"},
    )
    token = reg.json()["access_token"]

    update_res = client.put(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"display_name": "Updated Name"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["display_name"] == "Updated Name"


def test_change_password(client: TestClient):
    reg = client.post(
        "/api/auth/register",
        json={"email": "chgpwd@example.com", "password": "OldPassword123!"},
    )
    token = reg.json()["access_token"]

    # Wrong current password
    fail_res = client.post(
        "/api/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "WrongPassword123!", "new_password": "NewPassword123!"},
    )
    assert fail_res.status_code == 400
    assert fail_res.json()["detail"]["error"] == "INVALID_PASSWORD"

    # Correct current password
    succ_res = client.post(
        "/api/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "OldPassword123!", "new_password": "NewPassword123!"},
    )
    assert succ_res.status_code == 200

    # Old password fails login
    assert (
        client.post(
            "/api/auth/login",
            json={"email": "chgpwd@example.com", "password": "OldPassword123!"},
        ).status_code
        == 401
    )

    # New password succeeds login
    assert (
        client.post(
            "/api/auth/login",
            json={"email": "chgpwd@example.com", "password": "NewPassword123!"},
        ).status_code
        == 200
    )


def test_forgot_password_unconfigured_smtp(client: TestClient):
    # When SMTP is not configured
    res = client.post("/api/auth/forgot-password", json={"email": "anyone@example.com"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "not_configured"
    assert data["smtp_configured"] is False
    assert "not configured" in data["message"]


def test_reset_password_flow(client: TestClient, test_db_session: Session):
    # Register user
    reg = client.post(
        "/api/auth/register",
        json={"email": "reset@example.com", "password": "InitialPassword123!"},
    )
    user_id = reg.json()["user"]["id"]

    # Generate token manually as would happen during SMTP flow
    raw_token = generate_reset_token()
    token_hash = hash_reset_token(raw_token)
    reset_entry = PasswordResetToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=utc_now() + timedelta(minutes=15),
        is_used=False,
    )
    test_db_session.add(reset_entry)
    test_db_session.commit()

    # Reset password with valid token
    res = client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "new_password": "BrandNewPassword123!"},
    )
    assert res.status_code == 200

    # Token cannot be reused
    res_reuse = client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "new_password": "AnotherNewPassword123!"},
    )
    assert res_reuse.status_code == 400
    assert res_reuse.json()["detail"]["error"] == "INVALID_OR_EXPIRED_TOKEN"

    # Can log in with new password
    login_res = client.post(
        "/api/auth/login",
        json={"email": "reset@example.com", "password": "BrandNewPassword123!"},
    )
    assert login_res.status_code == 200


def test_account_deletion_with_data_cascade(client: TestClient, test_db_session: Session):
    # Register two users
    reg_a = client.post(
        "/api/auth/register",
        json={"email": "usera@example.com", "password": "PasswordUserA123!"},
    )
    token_a = reg_a.json()["access_token"]
    user_a_id = reg_a.json()["user"]["id"]

    reg_b = client.post(
        "/api/auth/register",
        json={"email": "userb@example.com", "password": "PasswordUserB123!"},
    )
    user_b_id = reg_b.json()["user"]["id"]

    # Create analyses for user A, user B, and an unauthenticated analysis
    record_a = AnalysisHistory(
        user_id=user_a_id,
        original_filename="user_a_resume.pdf",
        target_role="AI Engineer",
        status="completed",
        analysis_type="resume",
        overall_score=85,
    )
    record_b = AnalysisHistory(
        user_id=user_b_id,
        original_filename="user_b_resume.pdf",
        target_role="Data Scientist",
        status="completed",
        analysis_type="resume",
        overall_score=90,
    )
    record_unauth = AnalysisHistory(
        user_id=None,
        original_filename="unauth_resume.pdf",
        target_role="Product Manager",
        status="completed",
        analysis_type="resume",
        overall_score=75,
    )
    test_db_session.add_all([record_a, record_b, record_unauth])
    test_db_session.commit()

    # User A sees only their own history
    hist_a = client.get("/api/history", headers={"Authorization": f"Bearer {token_a}"})
    assert hist_a.status_code == 200
    items_a = hist_a.json()
    assert len(items_a) == 1
    assert items_a[0]["filename"] == "user_a_resume.pdf"

    # Unauthenticated visitor sees only unauthenticated history
    client.cookies.clear()
    hist_unauth = client.get("/api/history")
    assert hist_unauth.status_code == 200
    items_unauth = hist_unauth.json()
    assert len(items_unauth) == 1
    assert items_unauth[0]["filename"] == "unauth_resume.pdf"

    # User A tries to delete account with wrong password
    bad_del = client.request(
        "DELETE",
        "/api/auth/account",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"password": "WrongPassword!"},
    )
    assert bad_del.status_code == 400

    # User A deletes account with correct password
    good_del = client.request(
        "DELETE",
        "/api/auth/account",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"password": "PasswordUserA123!"},
    )
    assert good_del.status_code == 200

    # Verify User A's user record is deleted
    assert test_db_session.query(User).filter(User.id == user_a_id).first() is None
    # Verify User A's analysis record was cascaded
    assert test_db_session.query(AnalysisHistory).filter(AnalysisHistory.original_filename == "user_a_resume.pdf").first() is None

    # Verify User B and unauthenticated analyses are STILL intact
    assert test_db_session.query(User).filter(User.id == user_b_id).first() is not None
    assert test_db_session.query(AnalysisHistory).filter(AnalysisHistory.original_filename == "user_b_resume.pdf").first() is not None
    assert test_db_session.query(AnalysisHistory).filter(AnalysisHistory.original_filename == "unauth_resume.pdf").first() is not None
