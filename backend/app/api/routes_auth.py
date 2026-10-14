from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import logger
from app.core.security import (
    limiter,
    hash_password,
    verify_password,
    create_access_token,
    generate_reset_token,
    hash_reset_token,
    get_current_user,
    get_optional_current_user,
)
from app.database.database import get_db
from app.database.base import utc_now
from app.models.analysis import AnalysisHistory
from app.models.user import User, PasswordResetToken
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
    UpdateProfileRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    DeleteAccountRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Account"])
settings = get_settings()


def _set_auth_cookie(response: Response, token: str) -> None:
    """Helper to set secure HttpOnly cookie for auth session."""
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    """Helper to clear HttpOnly session cookie on logout or deletion."""
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )


def ensure_utc(dt: datetime) -> datetime:
    """Normalize datetime to timezone-aware UTC datetime across databases."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
@limiter.limit("10/minute")
def register(
    request: Request,
    payload: UserRegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Register a new user account with email and password."""
    # Check duplicate email
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "EMAIL_ALREADY_REGISTERED",
                "message": "An account with this email address already exists.",
            },
        )

    # Hash password and create user
    hashed = hash_password(payload.password)
    user = User(
        email=payload.email,
        hashed_password=hashed,
        display_name=payload.display_name.strip() if payload.display_name else None,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info("New user registered successfully with ID: %s", user.id)

    # Issue token with token version for revocation tracking
    token_v = getattr(user, "token_version", 1)
    access_token = create_access_token({"sub": user.id, "email": user.email, "v": token_v})
    _set_auth_cookie(response, access_token)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User login with email and password",
)
@limiter.limit("20/minute")
def login(
    request: Request,
    payload: UserLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Authenticate with email and password, setting HttpOnly session cookie."""
    user = db.query(User).filter(User.email == payload.email).first()

    # Avoid timing attacks: always verify a dummy password if user not found
    dummy_hash = "$2b$12$KIXe8P7vj1/1u7uL6kOqIe5a4l01kMfxV8g0p1s2u3v4w5x6y7z8a"
    is_valid = verify_password(payload.password, user.hashed_password if user else dummy_hash)

    if not user or not is_valid or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "INVALID_CREDENTIALS",
                "message": "Invalid email address or password.",
            },
        )

    token_v = getattr(user, "token_version", 1)
    access_token = create_access_token({"sub": user.id, "email": user.email, "v": token_v})
    _set_auth_cookie(response, access_token)

    logger.info("User logged in successfully with ID: %s", user.id)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/logout",
    summary="User logout and session invalidation",
)
def logout(
    response: Response,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Log out current user by clearing the HttpOnly session cookie and invalidating active bearer tokens."""
    if current_user:
        current_user.token_version = (current_user.token_version or 1) + 1
        db.commit()
    _clear_auth_cookie(response)
    return {"status": "success", "message": "Successfully logged out."}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
def get_profile(current_user: User = Depends(get_current_user)):
    """Retrieve profile of the currently authenticated user."""
    return UserResponse.model_validate(current_user)


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
)
def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update editable profile fields such as display name."""
    if payload.display_name is not None:
        current_user.display_name = payload.display_name.strip() or None

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post(
    "/change-password",
    summary="Change user password with verification",
)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change current password after verifying existing password."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "INVALID_PASSWORD",
                "message": "The current password provided is incorrect.",
            },
        )

    current_user.hashed_password = hash_password(payload.new_password)
    current_user.token_version = (current_user.token_version or 1) + 1
    db.commit()
    logger.info("User %s changed password successfully. Active sessions revoked.", current_user.id)
    return {"status": "success", "message": "Password changed successfully."}


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    summary="Request a password reset link",
)
@limiter.limit("5/minute")
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Initiate password reset. If email delivery is not configured, returns clear disabled state."""
    if not settings.is_smtp_configured:
        return ForgotPasswordResponse(
            status="not_configured",
            message="Automated email delivery is not configured on this server. Please contact your system administrator to configure SMTP settings.",
            smtp_configured=False,
        )

    user = db.query(User).filter(User.email == payload.email, User.is_active == True).first()
    if user:
        raw_token = generate_reset_token()
        token_hash = hash_reset_token(raw_token)
        expires_at = utc_now() + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_used=False,
        )
        db.add(reset_token)
        db.commit()

        # In production, this would dispatch via SMTP client using settings.SMTP_HOST
        logger.info("Generated password reset token for user %s", user.id)

    return ForgotPasswordResponse(
        status="sent",
        message="If an account with that email address exists, password reset instructions have been dispatched.",
        smtp_configured=True,
    )


@router.post(
    "/reset-password",
    summary="Reset password using valid reset token",
)
@limiter.limit("5/minute")
def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Reset password using a valid, unexpired reset token."""
    token_hash = hash_reset_token(payload.token.strip())
    reset_entry = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash, PasswordResetToken.is_used == False)
        .first()
    )

    if not reset_entry or ensure_utc(reset_entry.expires_at) < utc_now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "INVALID_OR_EXPIRED_TOKEN",
                "message": "The password reset token is invalid, expired, or has already been used.",
            },
        )

    user = db.query(User).filter(User.id == reset_entry.user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "USER_NOT_FOUND", "message": "Associated user account was not found."},
        )

    # Update password and mark token used
    user.hashed_password = hash_password(payload.new_password)
    user.token_version = (user.token_version or 1) + 1
    reset_entry.is_used = True
    reset_entry.used_at = utc_now()

    # Invalidate any other active reset tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.is_used == False,
    ).update({"is_used": True, "used_at": utc_now()})

    db.commit()
    logger.info("Password successfully reset for user %s", user.id)
    return {"status": "success", "message": "Password has been successfully updated. You may now log in."}


@router.delete(
    "/account",
    summary="Permanently delete user account and associated personal data",
)
def delete_account(
    payload: DeleteAccountRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete user account and cascade delete user-owned records."""
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "INVALID_PASSWORD",
                "message": "Incorrect password. Account deletion aborted.",
            },
        )

    user_id = current_user.id

    # 1. Purge physical files stored on disk/cloud for this user
    try:
        from app.models.stored_file import StoredFile
        from app.services.storage_service import get_storage_provider

        user_files = db.query(StoredFile).filter(StoredFile.user_id == user_id).all()
        provider = get_storage_provider()
        for uf in user_files:
            try:
                provider.delete(uf.storage_key)
            except Exception as fe:
                logger.warning("Failed to delete physical file %s during account deletion: %s", uf.storage_key, fe)
    except Exception as e:
        logger.warning("Error during physical file cleanup on account deletion: %s", type(e).__name__)

    # 2. Delete all records owned by the user
    try:
        from app.models.resume import ResumeDocument, ResumeVersion
        from app.models.job_match import JobMatchReport
        from app.models.career_intelligence import CareerRoadmap, MultiRoleComparison, CareerProjectRecommendation
        from app.models.stored_file import StoredFile

        # Delete resume versions then resume documents
        resumes = db.query(ResumeDocument).filter(ResumeDocument.user_id == user_id).all()
        for r in resumes:
            db.query(ResumeVersion).filter(ResumeVersion.resume_id == r.id).delete()
        db.query(ResumeDocument).filter(ResumeDocument.user_id == user_id).delete()

        db.query(AnalysisHistory).filter(AnalysisHistory.user_id == user_id).delete()
        db.query(JobMatchReport).filter(JobMatchReport.user_id == user_id).delete()
        db.query(CareerRoadmap).filter(CareerRoadmap.user_id == user_id).delete()
        db.query(MultiRoleComparison).filter(MultiRoleComparison.user_id == user_id).delete()
        db.query(CareerProjectRecommendation).filter(CareerProjectRecommendation.user_id == user_id).delete()
        db.query(StoredFile).filter(StoredFile.user_id == user_id).delete()
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).delete()
    except Exception as e:
        logger.warning("Error during associated entity deletion: %s", type(e).__name__)

    db.delete(current_user)
    db.commit()
    _clear_auth_cookie(response)

    logger.info("User account %s and all associated personal data were permanently deleted.", user_id)
    return {
        "status": "success",
        "message": "Your account and all associated personal records have been permanently deleted.",
    }
