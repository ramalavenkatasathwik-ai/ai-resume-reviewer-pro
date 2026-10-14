import io
from typing import Tuple

from fastapi import HTTPException, UploadFile, status
from pypdf import PdfReader

from app.core.config import get_settings
from app.core.logging import logger

settings = get_settings()


class ResumeService:
    """Service for validating and extracting content from resume PDF uploads in-memory."""

    @staticmethod
    async def validate_and_extract_pdf(file: UploadFile) -> Tuple[bytes, str, int]:
        """Validates uploaded file as a clean, readable PDF and extracts its text in-memory.
        
        Returns:
            Tuple of (raw_pdf_bytes, extracted_text, page_count)
            
        Raises:
            HTTPException with sanitized error messages.
        """
        # 1. Filename & Extension validation
        filename = file.filename or ""
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "INVALID_FILE_TYPE",
                    "message": "Only PDF files (.pdf) are supported. Please upload a standard PDF resume.",
                },
            )

        # 2. Read file content in-memory
        content = await file.read()
        file_size = len(content)

        # 3. Check for empty files
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "EMPTY_FILE",
                    "message": "The uploaded PDF file is empty (0 bytes). Please upload a valid document.",
                },
            )

        # 4. Check file size limits
        if file_size > settings.max_upload_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={
                    "error": "FILE_TOO_LARGE",
                    "message": f"File size exceeds the maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB} MB.",
                },
            )

        # 5. Validate magic bytes (%PDF-)
        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "CORRUPT_OR_INVALID_PDF",
                    "message": "The uploaded file does not have a valid PDF header. Please check that the file is not corrupted.",
                },
            )

        # 6. Parse PDF structure with pypdf
        try:
            reader = PdfReader(io.BytesIO(content))
        except Exception as e:
            logger.warning("Failed to parse PDF structure: %s", type(e).__name__)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "UNREADABLE_PDF",
                    "message": "The PDF file is corrupted or could not be read.",
                },
            )

        # 7. Check encryption / password protection
        if reader.is_encrypted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "ENCRYPTED_PDF",
                    "message": "Password-protected or encrypted PDF files cannot be processed. Please unlock the file.",
                },
            )

        # 8. Check page count
        page_count = len(reader.pages)
        if page_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "EMPTY_PAGES",
                    "message": "The PDF does not contain any readable pages.",
                },
            )

        if page_count > settings.MAX_UPLOAD_PAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "EXCESSIVE_PAGE_COUNT",
                    "message": f"The PDF document exceeds the maximum allowed page count of {settings.MAX_UPLOAD_PAGES} pages (found {page_count}).",
                },
            )

        # 9. Extract text safely in-memory
        extracted_text_chunks = []
        try:
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text_chunks.append(text)
        except Exception as e:
            logger.warning("Error extracting text from PDF pages: %s", type(e).__name__)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "UNREADABLE_PAGES",
                    "message": "Unable to extract text from PDF pages. The file may be damaged or contain unsupported fonts.",
                },
            )

        extracted_text = "\n\n".join(extracted_text_chunks).strip()
        if not extracted_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "NO_TEXT_FOUND",
                    "message": "The PDF does not contain any extractable text (e.g. scanned image-only PDF without OCR).",
                },
            )

        # 10. Bounded input text protection
        if len(extracted_text) > settings.MAX_INPUT_TEXT_CHARS:
            extracted_text = extracted_text[:settings.MAX_INPUT_TEXT_CHARS]

        return content, extracted_text, page_count
