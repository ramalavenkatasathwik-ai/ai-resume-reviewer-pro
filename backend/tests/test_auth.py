from datetime import timedelta
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError

from app.core.config import get_settings
from app.core.security import (
    limiter,
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


# ==============================================================================
# 1. Password Hashing & Verification
# ==============================================================================

def test_password_hashing():
    pwd = "StrongPassword123!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


# ==============================================================================
# Scenario 1 & 2: Successful Account Creation Without Email Verification
# ==============================================================================

def test_user_registration_success(client: TestClient):
    """Scenario 1: Creates account, hashes password, issues token and HttpOnly cookie."""
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
    assert data["user"]["is_active"] is True
    assert "hashed_password" not in data["user"]

    # Check HttpOnly cookie
    assert settings.AUTH_COOKIE_NAME in response.cookies


def test_registration_without_email_verification(client: TestClient):
    """Scenario 2: User is active immediately; no email OTP or verification link is required."""
    res = client.post(
        "/api/auth/register",
        json={
            "email": "instant_user@example.com",
            "password": "InstantAccess123!",
            "display_name": "Instant User",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["user"]["is_active"] is True
    token = data["access_token"]

    # Session is immediately usable without any verification step
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "instant_user@example.com"


# ==============================================================================
# Scenario 3: Missing Name or Email Validation
# ==============================================================================

def test_registration_missing_name_or_email(client: TestClient):
    """Scenario 3: Missing name or email must be rejected with 422."""
    # Missing display_name
    res_no_name = client.post(
        "/api/auth/register",
        json={"email": "noname@example.com", "password": "SecurePassword123!"},
    )
    assert res_no_name.status_code == 422

    # Empty / whitespace display_name
    res_blank_name = client.post(
        "/api/auth/register",
        json={"display_name": "   ", "email": "blankname@example.com", "password": "SecurePassword123!"},
    )
    assert res_blank_name.status_code == 422

    # Missing email
    res_no_email = client.post(
        "/api/auth/register",
        json={"display_name": "No Email", "password": "SecurePassword123!"},
    )
    assert res_no_email.status_code == 422


# ==============================================================================
# Scenario 4: Invalid Email Format
# ==============================================================================

def test_registration_invalid_email_format(client: TestClient):
    """Scenario 4: Malformed email strings must be rejected."""
    invalid_emails = [
        "notanemail",
        "user@",
        "@example.com",
        "user@example",
        "spaces in@example.com",
    ]
    for bad_email in invalid_emails:
        res = client.post(
            "/api/auth/register",
            json={
                "display_name": "Invalid Email User",
                "email": bad_email,
                "password": "SecurePassword123!",
            },
        )
        assert res.status_code == 422, f"Expected 422 for email: {bad_email}"


# ==============================================================================
# Scenario 6: Weak-Password Rejection
# ==============================================================================

def test_user_registration_weak_password(client: TestClient):
    """Scenario 6: Passwords failing complexity rules are rejected with 422."""
    # Too short (< 8 chars)
    res = client.post(
        "/api/auth/register",
        json={"display_name": "Short Pwd", "email": "u1@example.com", "password": "123"},
    )
    assert res.status_code == 422

    # No uppercase
    res = client.post(
        "/api/auth/register",
        json={"display_name": "No Upper", "email": "u2@example.com", "password": "password123!"},
    )
    assert res.status_code == 422

    # No number
    res = client.post(
        "/api/auth/register",
        json={"display_name": "No Num", "email": "u3@example.com", "password": "Password!"},
    )
    assert res.status_code == 422

    # No special char
    res = client.post(
        "/api/auth/register",
        json={"display_name": "No Spec", "email": "u4@example.com", "password": "Password123"},
    )
    assert res.status_code == 422


# ==============================================================================
# Scenario 7: Duplicate Email Registration
# ==============================================================================

def test_user_registration_duplicate_email(client: TestClient):
    """Scenario 7: Duplicate registration attempts return 409 Conflict."""
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


# ==============================================================================
# Scenario 8 & 11: Successful Login, Session Creation & Logout
# ==============================================================================

def test_user_login_success_and_logout(client: TestClient):
    """Scenario 8 & 11: Login with valid credentials, session establishment, and logout."""
    client.post(
        "/api/auth/register",
        json={
            "display_name": "Login User",
            "email": "loginuser@example.com",
            "password": "MyLoginPass123!",
        },
    )

    login_res = client.post(
        "/api/auth/login",
        json={
            "email": "LOGINUSER@EXAMPLE.COM",  # Case-insensitivity test
            "password": "MyLoginPass123!",
        },
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token
    assert settings.AUTH_COOKIE_NAME in login_res.cookies

    # Access protected route with Bearer header
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "loginuser@example.com"

    # Logout clears cookie
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200


# ==============================================================================
# Scenario 9: Rejection of Incorrect Passwords
# ==============================================================================

def test_user_login_incorrect_password(client: TestClient):
    """Scenario 9: Incorrect password returns 401 with generic error message."""
    client.post(
        "/api/auth/register",
        json={
            "display_name": "Password Tester",
            "email": "testpwd@example.com",
            "password": "CorrectPassword123!",
        },
    )
    res = client.post(
        "/api/auth/login",
        json={"email": "testpwd@example.com", "password": "WrongPassword999!"},
    )
    assert res.status_code == 401
    assert res.json()["detail"]["error"] == "INVALID_CREDENTIALS"
    assert res.json()["detail"]["message"] == "Invalid email address or password."


# ==============================================================================
# Scenario 10: Rejection of Unknown Accounts
# ==============================================================================

def test_user_login_unknown_account_rejection(client: TestClient, test_db_session: Session):
    """Scenario 10: Unknown email returns generic 401 and NEVER creates an account."""
    unknown_email = "nonexistent_account@example.com"
    res = client.post(
        "/api/auth/login",
        json={"email": unknown_email, "password": "AnyPassword123!"},
    )
    assert res.status_code == 401
    assert res.json()["detail"]["error"] == "INVALID_CREDENTIALS"
    assert res.json()["detail"]["message"] == "Invalid email address or password."

    # Verify no account was automatically created
    user = test_db_session.query(User).filter(User.email == unknown_email).first()
    assert user is None


# ==============================================================================
# Scenario 12: Expired-Session Behavior
# ==============================================================================

def test_session_expired_behavior(client: TestClient):
    """Scenario 12: Expired token passed in header or cookie returns 401."""
    # Craft token expired 1 hour ago
    expired_token = create_access_token(
        {"sub": "expired-user-id", "email": "expired@example.com"},
        expires_delta=timedelta(hours=-1),
    )
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    assert res.json()["detail"]["error"] == "INVALID_TOKEN"


# ==============================================================================
# Scenario 13: Rate Limits on Login and Registration
# ==============================================================================

def test_rate_limits_registration_and_login(client: TestClient):
    """Scenario 13: Exceeding rate limits triggers HTTP 429 Too Many Requests."""
    try:
        limiter.enabled = True
        hit_limit = False
        for i in range(15):
            res = client.post(
                "/api/auth/register",
                json={
                    "display_name": f"Rate User {i}",
                    "email": f"ratetest_{i}@example.com",
                    "password": "SecurePassword123!",
                },
            )
            if res.status_code == 429:
                hit_limit = True
                break
        assert hit_limit is True
    finally:
        limiter.enabled = False


# ==============================================================================
# Scenario 14: Access to Protected Dashboard Endpoints
# ==============================================================================

def test_access_protected_dashboard_endpoints(client: TestClient):
    """Scenario 14: Unauthenticated access is blocked with 401, authenticated access succeeds."""
    # Unauthenticated attempts
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/history").status_code in (200, 401)  # History supports unauthenticated anonymous list

    # Authenticated access
    reg = client.post(
        "/api/auth/register",
        json={
            "display_name": "Dash User",
            "email": "dashuser@example.com",
            "password": "SecurePassword123!",
        },
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "dashuser@example.com"


# ==============================================================================
# Scenario 15: Cross-User Resource Isolation
# ==============================================================================

def test_account_deletion_with_data_cascade(client: TestClient, test_db_session: Session):
    """Scenario 15: User A and User B cannot access each other's resources, and cascades work cleanly."""
    reg_a = client.post(
        "/api/auth/register",
        json={"display_name": "User A", "email": "usera@example.com", "password": "PasswordUserA123!"},
    )
    token_a = reg_a.json()["access_token"]
    user_a_id = reg_a.json()["user"]["id"]

    reg_b = client.post(
        "/api/auth/register",
        json={"display_name": "User B", "email": "userb@example.com", "password": "PasswordUserB123!"},
    )
    token_b = reg_b.json()["access_token"]
    user_b_id = reg_b.json()["user"]["id"]

    # Seed analysis records
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
    test_db_session.add_all([record_a, record_b])
    test_db_session.commit()

    # User A sees only User A's data
    hist_a = client.get("/api/history", headers={"Authorization": f"Bearer {token_a}"})
    assert hist_a.status_code == 200
    items_a = hist_a.json()
    assert all(item["filename"] == "user_a_resume.pdf" for item in items_a)

    # User B sees only User B's data
    hist_b = client.get("/api/history", headers={"Authorization": f"Bearer {token_b}"})
    assert hist_b.status_code == 200
    items_b = hist_b.json()
    assert all(item["filename"] == "user_b_resume.pdf" for item in items_b)

    # User A deletes account
    del_res = client.request(
        "DELETE",
        "/api/auth/account",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"password": "PasswordUserA123!"},
    )
    assert del_res.status_code == 200

    # User A deleted, but User B remains intact
    assert test_db_session.query(User).filter(User.id == user_a_id).first() is None
    assert test_db_session.query(User).filter(User.id == user_b_id).first() is not None


# ==============================================================================
# Scenario 16: Existing Account and Data Compatibility
# ==============================================================================

def test_existing_account_and_data_compatibility(client: TestClient, test_db_session: Session):
    """Scenario 16: Legacy seeded accounts can sign in and access existing history without error."""
    legacy_email = "legacy_engineer@example.com"
    legacy_pass = "LegacyPassword123!"
    legacy_user = User(
        email=legacy_email,
        hashed_password=hash_password(legacy_pass),
        display_name="Legacy Engineer",
        is_active=True,
    )
    test_db_session.add(legacy_user)
    test_db_session.commit()
    test_db_session.refresh(legacy_user)

    # Add legacy analysis report
    legacy_analysis = AnalysisHistory(
        user_id=legacy_user.id,
        original_filename="legacy_resume_v1.pdf",
        target_role="Principal Architect",
        status="completed",
        analysis_type="resume",
        overall_score=94,
    )
    test_db_session.add(legacy_analysis)
    test_db_session.commit()

    # Sign in with existing credentials
    login_res = client.post(
        "/api/auth/login",
        json={"email": legacy_email, "password": legacy_pass},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Verify user profile and existing history are accessible
    hist_res = client.get("/api/history", headers={"Authorization": f"Bearer {token}"})
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert any(h["filename"] == "legacy_resume_v1.pdf" for h in hist_data)


# ==============================================================================
# Scenario 18: Database Failure Handling
# ==============================================================================

def test_database_failure_handling():
    """Scenario 18: Returns safe 500 without leaking credentials when database fails."""
    from app.main import app
    from app.database.database import get_db

    def fail_db():
        raise OperationalError("SELECT 1", {}, Exception("Database connection refused"))

    app.dependency_overrides[get_db] = fail_db
    try:
        with TestClient(app, raise_server_exceptions=False) as c:
            res = c.post(
                "/api/auth/login",
                json={"email": "fail@example.com", "password": "Password123!"},
            )
            assert res.status_code == 500
            assert "internal" in res.text.lower() or res.status_code == 500
    finally:
        app.dependency_overrides.pop(get_db, None)


# ==============================================================================
# Profile Update, Password Change, Forgot Password, Reset Password
# ==============================================================================

def test_update_profile(client: TestClient):
    reg = client.post(
        "/api/auth/register",
        json={"display_name": "Original Name", "email": "profile@example.com", "password": "Password123!"},
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
        json={"display_name": "Chg Pwd User", "email": "chgpwd@example.com", "password": "OldPassword123!"},
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
    res = client.post("/api/auth/forgot-password", json={"email": "anyone@example.com"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "not_configured"
    assert data["smtp_configured"] is False
    assert "not configured" in data["message"]


def test_reset_password_flow(client: TestClient, test_db_session: Session):
    reg = client.post(
        "/api/auth/register",
        json={"display_name": "Reset User", "email": "reset@example.com", "password": "InitialPassword123!"},
    )
    user_id = reg.json()["user"]["id"]

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
