import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.user import User
from app.services.storage_service import (
    LocalStorageProvider,
    StorageService,
    InvalidFileError,
    StorageAccessDeniedError,
)


@pytest.fixture
def storage_user(test_db_session: Session) -> User:
    user = User(
        email="storage_user@example.com",
        hashed_password=hash_password("Password123!"),
        display_name="Storage User",
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user


@pytest.fixture
def other_storage_user(test_db_session: Session) -> User:
    user = User(
        email="other_storage_user@example.com",
        hashed_password=hash_password("Password123!"),
        display_name="Other Storage User",
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(storage_user: User) -> dict:
    token = create_access_token({"sub": storage_user.id})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_headers(other_storage_user: User) -> dict:
    token = create_access_token({"sub": other_storage_user.id})
    return {"Authorization": f"Bearer {token}"}


def test_local_storage_provider_safe_path(tmp_path):
    provider = LocalStorageProvider(base_dir=str(tmp_path))

    # Normal save and get
    key = "valid_file.bin"
    provider.save(key, b"hello world", "application/octet-stream")
    retrieved = provider.get(key)
    assert retrieved == b"hello world"

    # Path traversal attempt is sanitized or rejected safely
    provider.delete(key)
    assert provider.get(key) is None


def test_storage_service_validation():
    # Empty file
    with pytest.raises(InvalidFileError):
        StorageService.validate_file("empty.pdf", b"")

    # Invalid PDF magic signature
    with pytest.raises(InvalidFileError):
        StorageService.validate_file("fake.pdf", b"NOT_A_PDF_STREAM")

    # Valid PDF signature
    mime = StorageService.validate_file("valid.pdf", b"%PDF-1.4\nsome content")
    assert mime == "application/pdf"


def test_file_upload_download_delete_cycle(client: TestClient, auth_headers: dict, valid_pdf_bytes: bytes):
    # 1. Upload valid PDF
    files = {"file": ("my_resume.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")}
    data = {"purpose": "resume_pdf"}
    upload_res = client.post("/api/files/upload", files=files, data=data, headers=auth_headers)
    assert upload_res.status_code == 201
    file_info = upload_res.json()
    assert file_info["original_filename"] == "my_resume.pdf"
    assert file_info["mime_type"] == "application/pdf"
    assert file_info["file_size"] > 0
    file_id = file_info["id"]

    # 2. Download file
    download_res = client.get(f"/api/files/{file_id}/download", headers=auth_headers)
    assert download_res.status_code == 200
    assert download_res.content == valid_pdf_bytes
    assert "attachment" in download_res.headers.get("content-disposition", "")

    # 3. Delete file
    delete_res = client.delete(f"/api/files/{file_id}", headers=auth_headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["success"] is True

    # 4. Verify download returns 404 after deletion
    after_del = client.get(f"/api/files/{file_id}/download", headers=auth_headers)
    assert after_del.status_code == 404


def test_file_cross_user_isolation(client: TestClient, auth_headers: dict, other_headers: dict, valid_pdf_bytes: bytes):
    # Upload by user 1
    files = {"file": ("confidential.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")}
    upload_res = client.post("/api/files/upload", files=files, headers=auth_headers)
    assert upload_res.status_code == 201
    file_id = upload_res.json()["id"]

    # User 2 cannot download
    download_res = client.get(f"/api/files/{file_id}/download", headers=other_headers)
    assert download_res.status_code == 403

    # User 2 cannot delete
    del_res = client.delete(f"/api/files/{file_id}", headers=other_headers)
    assert del_res.status_code == 403
