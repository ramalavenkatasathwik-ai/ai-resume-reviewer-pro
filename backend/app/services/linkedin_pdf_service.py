import io
import re
from typing import List, Tuple, Dict, Any, Optional

from fastapi import HTTPException, UploadFile, status
from pypdf import PdfReader

from app.core.config import get_settings
from app.core.logging import logger

settings = get_settings()


class LinkedInPdfService:
    """Enterprise-grade service for secure LinkedIn PDF export validation, parsing, and section extraction.

    Security & Compliance Guarantees:
    - In-memory execution: Files are processed ephemerally in RAM and never permanently stored on disk.
    - Deep verification: Never relies on client-provided MIME types alone; checks magic bytes, PDF headers, and structural integrity.
    - Honest extraction reporting: Distinguishes between direct text extraction and multimodal image/scanned input.
    - Complete section boundary detection: Maps all standard LinkedIn profile sections without penalizing absent sections.
    - Zero secret leakage: Never logs candidate data or API keys.
    """

    RECOGNIZED_SECTIONS: Dict[str, List[str]] = {
        "identity": ["contact", "email", "phone", "profile", "linkedin.com/in/"],
        "headline": ["headline"],
        "about": ["summary", "about", "overview", "professional summary"],
        "experience": ["experience", "work experience", "employment history", "professional experience"],
        "education": ["education", "academic background", "university", "college", "degree"],
        "skills": ["top skills", "skills", "competencies", "key skills", "technical skills"],
        "projects": ["projects", "personal projects", "portfolio"],
        "certifications": ["certifications", "licenses & certifications", "licenses and certifications", "credentials"],
        "courses": ["courses", "coursework"],
        "publications": ["publications", "published works"],
        "recommendations": ["recommendations", "references"],
        "volunteer": ["volunteer experience", "volunteering", "community service"],
        "awards": ["honors-awards", "honors & awards", "honors and awards", "awards"],
        "languages": ["languages"],
        "organizations": ["organizations", "affiliations"],
    }

    CORE_STANDARD_SECTIONS: List[str] = [
        "identity",
        "headline",
        "about",
        "experience",
        "education",
        "skills",
        "projects",
        "certifications",
        "keyword_optimization",
        "target_role_alignment",
    ]

    @classmethod
    async def validate_and_extract_linkedin_pdf(
        cls,
        file: UploadFile,
    ) -> Tuple[bytes, str, int, str, List[str], List[str]]:
        """Performs rigorous security validation and in-memory text/section extraction on a LinkedIn PDF upload.

        Args:
            file: FastAPI UploadFile object.

        Returns:
            Tuple of:
                - content_bytes: Raw in-memory PDF bytes.
                - extracted_text: Full clean text extracted from the PDF pages.
                - page_count: Total pages in the PDF document.
                - extraction_method: 'embedded_text' or 'gemini_multimodal_pdf'.
                - detected_sections: List of standard section names identified in the document.
                - unavailable_sections: List of standard section names not present in the document.

        Raises:
            HTTPException with sanitized, clear error messages for all failure modes.
        """
        # 1. Filename & Extension validation
        filename = (file.filename or "").strip()
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "INVALID_FILE_TYPE",
                    "message": "Only PDF documents (.pdf) are supported. Please upload an official LinkedIn 'Save to PDF' export.",
                },
            )

        # 2. Client MIME check (Do not trust alone, but verify non-PDF headers)
        content_type = (file.content_type or "").lower().strip()
        if content_type and content_type not in (
            "application/pdf",
            "application/x-pdf",
            "application/octet-stream",
            "binary/octet-stream",
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "INVALID_MIME_TYPE",
                    "message": f"Expected a PDF document, but received MIME type '{content_type}'.",
                },
            )

        # 3. Read content in-memory
        content = await file.read()
        file_size = len(content)

        # 4. Check for empty file (0 bytes)
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "EMPTY_FILE",
                    "message": "The uploaded PDF file is empty (0 bytes). Please upload a valid document.",
                },
            )

        # 5. Check maximum file size limits
        if file_size > settings.max_upload_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={
                    "error": "FILE_TOO_LARGE",
                    "message": f"File size ({round(file_size / (1024 * 1024), 2)} MB) exceeds the maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB} MB.",
                },
            )

        # 6. Validate PDF magic signature (%PDF-)
        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "CORRUPT_OR_INVALID_PDF",
                    "message": "The uploaded file does not have a valid PDF header (%PDF-). Please verify that the file is not corrupted.",
                },
            )

        # 7. Parse PDF structure with pypdf
        try:
            reader = PdfReader(io.BytesIO(content))
        except Exception as e:
            logger.warning("Failed to parse PDF document structure: %s", type(e).__name__)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "UNREADABLE_PDF",
                    "message": "The PDF file is corrupted or cannot be parsed by standard PDF readers.",
                },
            )

        # 8. Check encryption / password protection
        if reader.is_encrypted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "ENCRYPTED_PDF",
                    "message": "Password-protected or encrypted PDF files cannot be processed. Please unlock your LinkedIn export.",
                },
            )

        # 9. Check page count
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

        # 10. Extract text page by page preserving section boundaries
        extracted_pages: List[str] = []
        try:
            for page_idx, page in enumerate(reader.pages, start=1):
                page_text = page.extract_text() or ""
                clean_page_text = page_text.strip()
                if clean_page_text:
                    extracted_pages.append(f"--- PAGE {page_idx} ---\n{clean_page_text}")
        except Exception as e:
            logger.warning("Error extracting text from PDF pages: %s", type(e).__name__)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "UNREADABLE_PAGES",
                    "message": "Failed to extract text from PDF pages. The file may contain damaged font streams or unsupported encodings.",
                },
            )

        full_extracted_text = "\n\n".join(extracted_pages).strip()

        # 11. Determine extraction method & handle scanned image PDFs
        # If extracted text contains fewer than 20 alphanumeric characters, it is scanned or lacks embedded text
        alphanumeric_count = len(re.findall(r"[a-zA-Z0-9]", full_extracted_text))
        if alphanumeric_count < 20:
            extraction_method = "gemini_multimodal_pdf"
            extracted_text = (
                f"[SCANNED_OR_IMAGE_PDF: {filename}]\n"
                f"Page count: {page_count}\n"
                "The PDF document does not contain an embedded text layer and will be processed via Gemini multimodal vision."
            )
        else:
            extraction_method = "embedded_text"
            extracted_text = full_extracted_text

        # 12. Detect sections present in the PDF text
        detected_sections, unavailable_sections = cls.detect_sections(full_extracted_text)

        return (
            content,
            extracted_text,
            page_count,
            extraction_method,
            detected_sections,
            unavailable_sections,
        )

    @classmethod
    def detect_sections(cls, text: str) -> Tuple[List[str], List[str]]:
        """Scans extracted text for recognized LinkedIn section headers.

        Returns:
            Tuple of (detected_sections, unavailable_sections)
        """
        text_lower = text.lower()
        detected: List[str] = []

        for section_key, patterns in cls.RECOGNIZED_SECTIONS.items():
            for pat in patterns:
                # Check for pattern as a standalone line or boundary
                regex = rf"(?:^|\n)\s*{re.escape(pat)}\s*(?:\n|:|$)"
                if re.search(regex, text_lower, re.IGNORECASE) or pat in text_lower:
                    detected.append(section_key)
                    break

        # Map to core standard sections
        core_available: List[str] = []
        for sec in cls.CORE_STANDARD_SECTIONS:
            if sec in detected:
                core_available.append(sec)
            elif sec in ("keyword_optimization", "target_role_alignment"):
                # Always verifiable when any text is available
                if len(text.strip()) > 50:
                    core_available.append(sec)

        core_unavailable = [s for s in cls.CORE_STANDARD_SECTIONS if s not in core_available]

        return core_available, core_unavailable
