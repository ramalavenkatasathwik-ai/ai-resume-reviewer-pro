from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user
from app.database.database import get_db
from app.models.user import User
from app.schemas.stored_file import StoredFileResponse
from app.services.storage_service import (
    StorageService,
    StorageError,
    FileNotFoundInStorageError,
    StorageAccessDeniedError,
    InvalidFileError,
    StorageNotConfiguredError,
)

router = APIRouter(prefix="/files", tags=["Private File Storage"])


@router.post(
    "/upload",
    response_model=StoredFileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload File to Private Storage",
    description="Saves a user file (e.g. LinkedIn PDF) into private storage without exposing storage keys.",
)
async def upload_file(
    file: UploadFile = File(..., description="File to persist privately"),
    purpose: str = Form("linkedin_pdf", description="Functional purpose of the file"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> StoredFileResponse:
    content = await file.read()
    try:
        stored_file = StorageService.save_user_file(
            db=db,
            user=current_user,
            original_filename=file.filename or "uploaded_file.bin",
            file_bytes=content,
            purpose=purpose,
            declared_mime_type=file.content_type,
        )
    except InvalidFileError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "INVALID_FILE", "message": str(e)},
        )
    except StorageNotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "STORAGE_NOT_CONFIGURED", "message": str(e)},
        )
    except StorageError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "STORAGE_FAILURE", "message": str(e)},
        )

    return StoredFileResponse.model_validate(stored_file)


@router.get(
    "/{file_id}/download",
    summary="Download Private File",
    description="Securely streams raw file contents for the authorized file owner.",
)
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        stored_file, content = StorageService.get_user_file_bytes(
            db=db,
            file_id=file_id,
            user=current_user,
        )
    except FileNotFoundInStorageError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "FILE_NOT_FOUND", "message": "The requested file was not found."},
        )
    except StorageAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "You do not have permission to access this file."},
        )
    except StorageError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "STORAGE_FAILURE", "message": str(e)},
        )

    safe_filename = stored_file.original_filename.replace('"', "")
    return Response(
        content=content,
        media_type=stored_file.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Content-Length": str(len(content)),
        },
    )


@router.delete(
    "/{file_id}",
    summary="Delete Private File",
    description="Soft-deletes file metadata and deletes the file from physical storage.",
)
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        StorageService.delete_user_file(
            db=db,
            file_id=file_id,
            user=current_user,
        )
    except FileNotFoundInStorageError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "FILE_NOT_FOUND", "message": "The requested file was not found."},
        )
    except StorageAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCESS_DENIED", "message": "You do not have permission to delete this file."},
        )
    except StorageError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "STORAGE_FAILURE", "message": str(e)},
        )

    return {"success": True, "message": "File deleted successfully."}
