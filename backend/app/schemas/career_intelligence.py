from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# 1. Multi-Version Resume Generator Schemas
# ---------------------------------------------------------------------------

class GenerateRoleVariantRequest(BaseModel):
    resume_id: str
    resume_version_id: Optional[str] = None
    target_role: str = Field(..., min_length=2, max_length=100)
    job_description: Optional[str] = Field(None, max_length=100000)
    focus_areas: Optional[List[str]] = Field(default_factory=list)
    model_name: Optional[str] = None


class RoleVariantDraftResponse(BaseModel):
    target_role: str
    variant_title: str
    resume_data: Dict[str, Any]
    key_modifications: List[str] = Field(default_factory=list)
    verified_skills_prioritized: List[str] = Field(default_factory=list)
    factual_integrity_verified: bool = True
    confirmation_needed_items: List[str] = Field(default_factory=list)


class SaveRoleVariantRequest(BaseModel):
    resume_id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=255)
    target_role: str = Field(..., min_length=2, max_length=100)
    resume_data: Dict[str, Any]
    version_notes: Optional[str] = Field(None, max_length=500)
    save_as_new_document: bool = False


class VariantDiffSection(BaseModel):
    section_name: str
    original_content: Any
    variant_content: Any
    changes_summary: str


class CompareVariantsRequest(BaseModel):
    base_version_id: Optional[str] = None
    variant_version_id: Optional[str] = None
    base_resume_data: Optional[Dict[str, Any]] = None
    variant_resume_data: Optional[Dict[str, Any]] = None


class VariantComparisonResponse(BaseModel):
    base_title: str
    variant_title: str
    target_role: str
    sections: List[VariantDiffSection]
    summary_of_differences: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 2. Writing Assistant Schemas
# ---------------------------------------------------------------------------

class WritingSuggestionItem(BaseModel):
    id: str
    section: str = Field(..., description="summary, experience_bullets, project_descriptions, technical_skills, linkedin_headline, linkedin_about, cover_letter, achievements")
    original_text: str
    proposed_revision: str
    explanation: str
    target_role: str
    requires_user_confirmation: bool = False
    verification_prompt: Optional[str] = None
    action_verbs_used: List[str] = Field(default_factory=list)
    metric_focus: Optional[str] = None


class WritingSuggestionRequest(BaseModel):
    section: str = Field(..., description="One of: summary, experience_bullets, project_descriptions, technical_skills, linkedin_headline, linkedin_about, cover_letter, achievements")
    target_role: str = Field(default="AI Developer")
    current_text: Optional[str] = Field(None, max_length=20000)
    resume_id: Optional[str] = None
    resume_version_id: Optional[str] = None
    job_description: Optional[str] = Field(None, max_length=50000)
    instruction: Optional[str] = Field(None, max_length=1000)
    model_name: Optional[str] = None


class WritingSuggestionResponse(BaseModel):
    section: str
    target_role: str
    suggestions: List[WritingSuggestionItem]
    editorial_notes: str = ""


# ---------------------------------------------------------------------------
# 3. Personalized Career Roadmap Schemas
# ---------------------------------------------------------------------------

class GenerateRoadmapRequest(BaseModel):
    resume_id: Optional[str] = None
    resume_version_id: Optional[str] = None
    target_role: str = Field(..., min_length=2, max_length=100)
    current_level: Optional[str] = Field(None, max_length=100)
    target_level: Optional[str] = Field(None, max_length=100)
    job_description: Optional[str] = Field(None, max_length=100000)
    model_name: Optional[str] = None


class SaveRoadmapRequest(BaseModel):
    resume_id: Optional[str] = None
    resume_version_id: Optional[str] = None
    target_role: str
    current_level: Optional[str] = None
    target_level: Optional[str] = None
    strengths: List[Dict[str, Any]] = Field(default_factory=list)
    skill_gaps: List[Dict[str, Any]] = Field(default_factory=list)
    potential_undocumented_skills: List[Dict[str, Any]] = Field(default_factory=list)
    learning_topics: List[Dict[str, Any]] = Field(default_factory=list)
    practical_projects: List[Dict[str, Any]] = Field(default_factory=list)
    portfolio_improvements: List[Dict[str, Any]] = Field(default_factory=list)
    certifications: List[Dict[str, Any]] = Field(default_factory=list)
    action_items: List[Dict[str, Any]] = Field(default_factory=list)
    short_term_milestones: List[Dict[str, Any]] = Field(default_factory=list)
    medium_term_milestones: List[Dict[str, Any]] = Field(default_factory=list)
    disclaimer: Optional[str] = None


class CareerRoadmapResponse(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    resume_id: Optional[str] = None
    resume_version_id: Optional[str] = None
    target_role: str
    current_level: Optional[str] = None
    target_level: Optional[str] = None
    strengths: List[Dict[str, Any]] = Field(default_factory=list)
    skill_gaps: List[Dict[str, Any]] = Field(default_factory=list)
    potential_undocumented_skills: List[Dict[str, Any]] = Field(default_factory=list)
    learning_topics: List[Dict[str, Any]] = Field(default_factory=list)
    practical_projects: List[Dict[str, Any]] = Field(default_factory=list)
    portfolio_improvements: List[Dict[str, Any]] = Field(default_factory=list)
    certifications: List[Dict[str, Any]] = Field(default_factory=list)
    action_items: List[Dict[str, Any]] = Field(default_factory=list)
    short_term_milestones: List[Dict[str, Any]] = Field(default_factory=list)
    medium_term_milestones: List[Dict[str, Any]] = Field(default_factory=list)
    disclaimer: str = (
        "AI career guidance recommendations do not guarantee employment, "
        "interviews, or specific salary outcomes."
    )
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# 4. Multi-Role Comparison Engine Schemas
# ---------------------------------------------------------------------------

class MultiRoleCompareRequest(BaseModel):
    resume_id: str
    resume_version_id: Optional[str] = None
    target_roles: List[str] = Field(..., min_length=2, max_length=4)
    model_name: Optional[str] = None


class RoleEvaluationResult(BaseModel):
    role: str
    overall_score: int
    required_skills_score: int
    experience_score: int
    keyword_score: int
    evidenced_skills: List[str] = Field(default_factory=list)
    missing_required_skills: List[str] = Field(default_factory=list)
    missing_preferred_skills: List[str] = Field(default_factory=list)
    experience_alignment_summary: str = ""
    recommended_variant_title: str = ""
    suggested_improvements: List[str] = Field(default_factory=list)


class MultiRoleCompareResponse(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    resume_id: str
    resume_version_id: str
    roles_evaluated: List[str]
    role_results: Dict[str, RoleEvaluationResult]
    best_fit_role: str
    trade_offs_summary: str
    scoring_version: str = "v1.0"
    created_at: Optional[datetime] = None


class SaveMultiRoleCompareRequest(BaseModel):
    resume_id: str
    resume_version_id: str
    roles_evaluated: List[str]
    role_results: Dict[str, RoleEvaluationResult]
    best_fit_role: str
    trade_offs_summary: str


# ---------------------------------------------------------------------------
# 5. Project & Portfolio Recommendations Schemas
# ---------------------------------------------------------------------------

class ProjectRecommendationItem(BaseModel):
    id: str
    title: str
    target_role: str
    problem_statement: str
    skills_demonstrated: List[str] = Field(default_factory=list)
    tech_stack: List[str] = Field(default_factory=list)
    core_features: List[str] = Field(default_factory=list)
    milestones: List[Dict[str, Any]] = Field(default_factory=list)
    deliverables: List[str] = Field(default_factory=list)
    resume_documentation_guide: List[str] = Field(default_factory=list)
    is_proposed: bool = True
    guardrail_notice: str = "PROPOSED PROJECT: Not yet completed. Never add to resume until implemented and verified."


class ProjectRecommendRequest(BaseModel):
    target_role: str = Field(..., min_length=2, max_length=100)
    resume_id: Optional[str] = None
    resume_version_id: Optional[str] = None
    skill_gaps: Optional[List[str]] = Field(default_factory=list)
    model_name: Optional[str] = None


class ProjectRecommendResponse(BaseModel):
    target_role: str
    projects: List[ProjectRecommendationItem]
