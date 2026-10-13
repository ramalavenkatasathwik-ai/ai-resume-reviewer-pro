from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr


class DocumentEmailRequest(BaseModel):
    """Payload to dispatch a document via transactional email."""
    recipient_email: str = Field(..., min_length=3, max_length=255, description="Valid recipient email address")
    document_type: str = Field(..., description="Document type: 'resume_pdf', 'resume_docx', 'analysis_pdf', 'job_match_pdf'")
    document_id: str = Field(..., description="Target document ID (resume ID, analysis ID, or job-match ID)")
    version_id: Optional[str] = Field(None, description="Optional resume version ID. Defaults to active version.")
    unsaved_resume_data: Optional[Dict[str, Any]] = Field(None, description="Explicit unsaved editor data if user opted to send editor state.")
    template_name: Optional[str] = Field("modern", description="Template: 'modern' or 'classic'")
    page_format: Optional[str] = Field("letter", description="Page format: 'letter' or 'a4'")
    subject: Optional[str] = Field(None, max_length=255, description="Optional custom subject line")
    custom_message: Optional[str] = Field(None, max_length=2000, description="Optional personal note to recipient")


class DocumentEmailResponse(BaseModel):
    """Result of an email submission to the delivery provider."""
    success: bool
    log_id: str
    recipient_email: str
    status: str
    provider: str
    message: str


class EmailConfigStatusResponse(BaseModel):
    """Status indicating whether email sending is enabled on the server."""
    is_configured: bool
    provider: str
    from_address: Optional[str] = None


class UnsavedExportRequest(BaseModel):
    """Payload for exporting unsaved editor content directly to PDF or DOCX."""
    resume_data: Dict[str, Any] = Field(..., description="Current in-memory resume structured data")
    template_name: Optional[str] = Field("modern", description="Template: 'modern' or 'classic'")
    page_format: Optional[str] = Field("letter", description="Page format: 'letter' or 'a4'")
