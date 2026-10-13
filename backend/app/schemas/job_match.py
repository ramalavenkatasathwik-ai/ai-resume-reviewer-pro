from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class JobRequirementItem(BaseModel):
    name: str
    is_required: bool = True
    category: str = "skill"


class JobRequirements(BaseModel):
    """Structured extraction of requirements from an employer's job description."""
    job_title: str
    company_name: Optional[str] = None
    role_summary: str = ""
    required_qualifications: List[str] = Field(default_factory=list)
    preferred_qualifications: List[str] = Field(default_factory=list)
    required_technical_skills: List[str] = Field(default_factory=list)
    preferred_technical_skills: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)
    tools_and_technologies: List[str] = Field(default_factory=list)
    responsibilities: List[str] = Field(default_factory=list)
    education_requirements: List[str] = Field(default_factory=list)
    experience_requirements: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    domain_knowledge: List[str] = Field(default_factory=list)
    relevant_keywords: List[str] = Field(default_factory=list)
    explicit_requirements: List[str] = Field(default_factory=list)
    inferred_requirements: List[str] = Field(default_factory=list)


class RequirementMatchItem(BaseModel):
    """Evaluation of candidate evidence against a specific extracted requirement."""
    requirement: str
    category: str = Field(..., description="required_skill, preferred_skill, experience, education, etc.")
    status: str = Field(..., description="matched, partial, not_evidenced, not_assessable")
    evidence: Optional[str] = None
    notes: Optional[str] = None
    is_required: bool = True


class ScoreBreakdown(BaseModel):
    """Transparent and explainable scoring methodology components."""
    overall_score: int
    required_skills_score: int
    preferred_skills_score: int
    experience_score: int
    education_score: int
    keyword_score: int
    weights: Dict[str, float] = Field(
        default_factory=lambda: {
            "required_skills": 0.35,
            "preferred_skills": 0.15,
            "experience": 0.25,
            "education": 0.10,
            "keywords": 0.15,
        }
    )
    total_requirements: int
    matched_count: int
    partial_count: int
    not_evidenced_count: int
    unassessable_count: int
    explanation: str


class JobMatchComparison(BaseModel):
    """Structured comparison between resume evidence and job requirements."""
    score_breakdown: ScoreBreakdown
    items: List[RequirementMatchItem] = Field(default_factory=list)
    matched_keywords: List[str] = Field(default_factory=list)
    missing_keywords: List[str] = Field(default_factory=list)
    strongest_evidence: List[str] = Field(default_factory=list)
    missing_requirements: List[str] = Field(default_factory=list)
    partial_requirements: List[str] = Field(default_factory=list)
    unassessable_requirements: List[str] = Field(default_factory=list)
    disclaimer: str = (
        "Scores are AI-assisted estimates benchmarked against the job description and "
        "do not represent an official employer ATS verdict or hiring guarantee."
    )


class JobMatchRecommendation(BaseModel):
    """Actionable improvement suggestion for resume tailoring."""
    id: str
    section: str = Field(..., description="summary, skills, experience, education, certifications, projects, etc.")
    priority: str = Field(default="medium", description="high, medium, low")
    relevant_job_requirement: str
    current_evidence: Optional[str] = None
    proposed_change: str
    reason: str
    requires_user_confirmation: bool = False
    target_item_id: Optional[str] = None


class JobRequirementsExtractRequest(BaseModel):
    job_description: str = Field(..., min_length=50, max_length=100000, description="Raw job description text")
    job_title: Optional[str] = Field(None, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    model: Optional[str] = None


class JobMatchAnalyzeRequest(BaseModel):
    resume_id: str = Field(..., description="Primary ID of the user's saved resume document")
    version_id: Optional[str] = Field(None, description="Optional specific version ID (defaults to active version)")
    job_description: str = Field(..., min_length=50, max_length=100000, description="Raw job description text")
    job_title: Optional[str] = Field(None, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    target_role: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = None


class TailorResumeRequest(BaseModel):
    accepted_recommendation_ids: List[str] = Field(default_factory=list)
    custom_edits: Optional[Dict[str, str]] = Field(default_factory=dict)
    confirmed_missing_facts: Optional[Dict[str, str]] = Field(default_factory=dict)


class TailoredResumeDraftResponse(BaseModel):
    report_id: str
    resume_id: str
    resume_version_id: str
    original_resume_data: Dict[str, Any]
    tailored_resume_data: Dict[str, Any]
    applied_recommendations: List[JobMatchRecommendation]
    diff_summary: List[Dict[str, Any]]


class SaveTailoredResumeRequest(BaseModel):
    action: str = Field("new_version", description="new_version or new_resume")
    target_resume_id: Optional[str] = None
    title: Optional[str] = None
    version_notes: Optional[str] = "Tailored for job description"
    tailored_resume_data: Dict[str, Any]
    template_name: Optional[str] = "modern"
    page_format: Optional[str] = "letter"


class JobMatchReportSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    resume_id: str
    resume_version_id: str
    job_title: str
    company_name: Optional[str] = None
    overall_score: int
    required_skills_score: int
    keyword_score: int
    status: str
    scoring_version: str
    created_at: datetime


class JobMatchReportDetail(JobMatchReportSummary):
    job_description_raw: str
    extracted_requirements: Dict[str, Any]
    comparison_result: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    model_name: str
    retention_days: int
