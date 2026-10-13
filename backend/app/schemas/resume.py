from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict


class ResumeVersionCreate(BaseModel):
    """Payload to save a new immutable version of a resume."""
    resume_data: Dict[str, Any] = Field(..., description="Structured JSON resume data")
    template_name: Optional[str] = Field("modern", description="Template visual theme")
    page_format: Optional[str] = Field("letter", description="Page format: letter or a4")
    source_analysis_id: Optional[str] = Field(None, description="Optional link to source analysis report")
    job_description_metadata: Optional[Dict[str, Any]] = Field(None, description="Target job description metadata")
    version_notes: Optional[str] = Field(None, description="User note describing changes in this version")


class ResumeCreate(BaseModel):
    """Payload to initialize a new resume document in the library."""
    title: str = Field(..., min_length=1, max_length=255, description="Document title")
    target_role: str = Field(default="AI Developer", max_length=100, description="Target job role")
    resume_data: Dict[str, Any] = Field(..., description="Initial structured JSON resume data")
    template_name: Optional[str] = Field("modern", description="Initial template visual theme")
    page_format: Optional[str] = Field("letter", description="Page format: letter or a4")
    source_analysis_id: Optional[str] = Field(None, description="Optional link to source analysis report")
    job_description_metadata: Optional[Dict[str, Any]] = Field(None, description="Target job description metadata")
    version_notes: Optional[str] = Field("Initial version", description="Note for version 1")


class ResumeUpdate(BaseModel):
    """Payload to update resume metadata."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    target_role: Optional[str] = Field(None, min_length=1, max_length=100)
    is_archived: Optional[bool] = None


class ResumeVersionSummary(BaseModel):
    """Compact version metadata for version history timelines."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    resume_id: str
    version_number: int
    template_name: str
    page_format: str
    version_notes: Optional[str] = None
    created_at: datetime


class ResumeVersionDetail(ResumeVersionSummary):
    """Complete version representation including full structured resume JSON."""
    resume_data: Dict[str, Any]
    source_analysis_id: Optional[str] = None
    job_description_metadata: Optional[Dict[str, Any]] = None


class ResumeSummary(BaseModel):
    """Compact summary of a resume in user library lists."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    target_role: str
    current_version_id: Optional[str] = None
    is_archived: bool
    versions_count: int = 1
    created_at: datetime
    updated_at: datetime


class ResumeDetail(ResumeSummary):
    """Full resume document with currently active version details."""
    current_version: Optional[ResumeVersionDetail] = None
