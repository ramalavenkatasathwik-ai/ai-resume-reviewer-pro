from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class CandidateInformation(BaseModel):
    """Information extracted directly from the resume evidence (never fabricated)."""
    name: Optional[str] = Field(None, description="Full candidate name if identified")
    email: Optional[str] = Field(None, description="Candidate email address if identified")
    phone: Optional[str] = Field(None, description="Candidate phone number if identified")
    location: Optional[str] = Field(None, description="Candidate city/country or location if present")
    linkedin: Optional[str] = Field(None, description="LinkedIn profile URL if present")
    github: Optional[str] = Field(None, description="GitHub profile URL if present")
    portfolio: Optional[str] = Field(None, description="Portfolio website URL if present")


class AnalysisResult(BaseModel):
    """Structured, evidence-grounded resume analysis output."""
    candidate_information: CandidateInformation = Field(
        default_factory=CandidateInformation,
        description="Candidate biographical/contact details found on the resume",
    )
    overall_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Overall composite score (0-100) benchmarked against target role",
    )
    ats_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Applicant Tracking System parsability and keyword match score (0-100)",
    )
    skills_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Alignment of candidate technical and soft skills with the target role (0-100)",
    )
    content_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Clarity, impact, and metric orientation of achievement bullets (0-100)",
    )
    experience_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Relevance and depth of work experience relative to target role (0-100)",
    )
    formatting_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Visual hierarchy, typography, and standard layout adherence (0-100)",
    )

    professional_summary: str = Field(
        ...,
        description="Executive summary of the candidate's profile relative to the target role",
    )
    strengths: List[str] = Field(
        default_factory=list,
        description="Key competitive advantages and standout achievements evident in resume",
    )
    weaknesses: List[str] = Field(
        default_factory=list,
        description="Primary areas requiring improvement or lack of demonstrable evidence",
    )
    missing_skills: List[str] = Field(
        default_factory=list,
        description="Skills typically demanded by the target role that are absent from the resume",
    )
    ats_keywords: List[str] = Field(
        default_factory=list,
        description="Critical industry and role keywords detected or recommended for inclusion",
    )
    grammar_issues: List[str] = Field(
        default_factory=list,
        description="Identified grammatical inconsistencies, typos, or passive phrasing",
    )
    formatting_issues: List[str] = Field(
        default_factory=list,
        description="Identified layout, font, margin, or table parsing risks for ATS systems",
    )
    recommended_skills: List[str] = Field(
        default_factory=list,
        description="High-leverage skills to acquire to become a top-tier candidate",
    )
    recommended_certifications: List[str] = Field(
        default_factory=list,
        description="Recognized professional certifications that would enhance credibility",
    )
    recommended_courses: List[str] = Field(
        default_factory=list,
        description="Educational coursework or learning paths relevant to career progression",
    )
    interview_questions: List[str] = Field(
        default_factory=list,
        description="Role-specific interview questions likely to be asked based on candidate's background",
    )
    career_suggestions: List[str] = Field(
        default_factory=list,
        description="Strategic next steps and career roadmap recommendations",
    )
    final_assessment: str = Field(
        ...,
        description="Comprehensive evaluative synthesis and hiring readiness judgment",
    )

    target_role: str = Field(
        ...,
        description="The target job role used to evaluate the resume",
    )
    model_used: str = Field(
        ...,
        description="The Gemini model utilized to perform the evaluation",
    )
    disclaimer: str = Field(
        default="Scores and observations are AI-generated estimates based on provided resume evidence and do not guarantee ATS passage or employment decisions.",
        description="Legal and accuracy disclaimer",
    )


class AnalysisReportSummary(BaseModel):
    """Compact summary for analysis report history and listings."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    original_filename: str
    filename: Optional[str] = None
    source_type: str = "pdf"
    analysis_type: str = "resume"
    target_role: str
    status: str
    overall_score: Optional[int] = None
    ats_score: Optional[int] = None
    model_name: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class AnalysisReportDetail(AnalysisReportSummary):
    """Complete analysis report including evaluation JSON, tokens, and errors."""
    result_json: Optional[Dict[str, Any]] = None
    prompt_version: Optional[str] = None
    token_usage: Optional[Dict[str, Any]] = None
    estimated_cost: Optional[float] = None
    error_category: Optional[str] = None
    error_message: Optional[str] = None
    stored_file_id: Optional[str] = None


class AnalysisReportListResponse(BaseModel):
    """Paginated response envelope for analysis reports."""
    items: List[AnalysisReportSummary]
    total: int
    page: int
    page_size: int
    total_pages: int

