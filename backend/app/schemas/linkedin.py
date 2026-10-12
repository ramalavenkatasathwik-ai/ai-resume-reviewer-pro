from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


class ScoreDetail(BaseModel):
    """Detailed score breakdown with qualitative justification and recommendations."""
    score: int = Field(..., ge=0, le=100, description="Score from 0 to 100")
    explanation: str = Field(..., description="Detailed explanation of how the score was calculated")
    supporting_evidence: List[str] = Field(default_factory=list, description="Verifiable facts observed from the profile")
    recommended_actions: List[str] = Field(default_factory=list, description="Concrete next steps to improve the score")


class CoverageInformation(BaseModel):
    """Information regarding which sections were accessible and evaluated."""
    assessed_sections_count: int = Field(..., description="Number of profile sections successfully evaluated")
    total_possible_sections: int = Field(10, description="Total standard profile sections evaluated")
    coverage_percentage: int = Field(..., ge=0, le=100, description="Percentage of standard sections covered")
    calculation_methodology: str = Field(..., description="Explanation of how coverage and scores were computed")
    limitations: List[str] = Field(default_factory=list, description="Specific access limitations encountered")


class ProfileIdentity(BaseModel):
    """Candidate identity and positioning extracted from profile."""
    name: Optional[str] = None
    headline: Optional[str] = None
    current_position: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    profile_url: Optional[str] = None
    professional_positioning: Optional[str] = None


class HeadlineAnalysis(BaseModel):
    """Comprehensive evaluation of the profile headline."""
    clarity_and_specificity: str
    relevant_keywords: List[str] = Field(default_factory=list)
    target_role_alignment: str
    value_proposition: str
    suggested_improved_headlines: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)


class AboutAnalysis(BaseModel):
    """Evaluation of the About / Summary section."""
    is_available: bool = True
    introduction_and_identity: Optional[str] = None
    career_narrative: Optional[str] = None
    evidence_of_impact: Optional[str] = None
    keyword_coverage: Optional[str] = None
    grammar_and_readability: Optional[str] = None
    missing_information: List[str] = Field(default_factory=list)
    suggested_rewritten_about: Optional[str] = None
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)


class LinkedInRoleAnalysis(BaseModel):
    """Evaluation of an individual work experience entry."""
    job_title: str
    organization: str
    dates: Optional[str] = None
    description: Optional[str] = None
    responsibilities: List[str] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)
    quantifiable_outcomes: List[str] = Field(default_factory=list)
    relevant_skills: List[str] = Field(default_factory=list)
    keyword_coverage: List[str] = Field(default_factory=list)
    missing_metrics: List[str] = Field(default_factory=list)
    suggested_rewritten_description: Optional[str] = None


class ExperienceAnalysis(BaseModel):
    """Evaluation of all work experience items."""
    is_available: bool = True
    roles_analyzed_count: int = 0
    roles: List[LinkedInRoleAnalysis] = Field(default_factory=list)
    overall_experience_strengths: List[str] = Field(default_factory=list)
    overall_experience_weaknesses: List[str] = Field(default_factory=list)
    missing_evidence_summary: List[str] = Field(default_factory=list)


class LinkedInEducationItem(BaseModel):
    """Education record evaluation."""
    institution: str
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    dates: Optional[str] = None
    achievements: List[str] = Field(default_factory=list)
    relevance_to_target_role: Optional[str] = None


class EducationAnalysis(BaseModel):
    """Evaluation of education credentials."""
    is_available: bool = True
    items: List[LinkedInEducationItem] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)


class SkillsAnalysis(BaseModel):
    """Evaluation of listed vs demonstrated skills."""
    is_available: bool = True
    listed_skills: List[str] = Field(default_factory=list)
    role_relevant_skills: List[str] = Field(default_factory=list)
    missing_or_weakly_evidenced_skills: List[str] = Field(default_factory=list)
    duplicate_or_redundant_skills: List[str] = Field(default_factory=list)
    suggested_skill_prioritization: List[str] = Field(default_factory=list)
    skills_supported_by_evidence: List[str] = Field(default_factory=list)


class LinkedInProjectItem(BaseModel):
    """Portfolio or project entry analysis."""
    title: str
    technical_stack: List[str] = Field(default_factory=list)
    problem_and_solution: Optional[str] = None
    outcomes_and_impact: Optional[str] = None
    missing_details: List[str] = Field(default_factory=list)
    suggested_rewritten_description: Optional[str] = None


class ProjectAnalysis(BaseModel):
    """Evaluation of project entries."""
    is_available: bool = True
    items: List[LinkedInProjectItem] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)


class AdditionalSectionsAnalysis(BaseModel):
    """Evaluation of optional or supplementary profile sections."""
    certifications: List[str] = Field(default_factory=list)
    courses: List[str] = Field(default_factory=list)
    publications: List[str] = Field(default_factory=list)
    recommendations_summary: Optional[str] = None
    volunteer_experience: List[str] = Field(default_factory=list)
    honors_and_awards: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    unavailable_sections_notes: List[str] = Field(default_factory=list)


class KeywordAnalysis(BaseModel):
    """Evaluation of keyword density, relevance, and placement for recruiter searches."""
    found_keywords: List[str] = Field(default_factory=list)
    missing_critical_keywords: List[str] = Field(default_factory=list)
    keyword_density_assessment: str
    strategic_placement_advice: List[str] = Field(default_factory=list)


class PlanWeek(BaseModel):
    """A single week in the 30-day prioritized action plan."""
    week: int = Field(..., ge=1, le=4)
    focus_title: str
    action_items: List[str] = Field(default_factory=list)


class TargetRoleAlignment(BaseModel):
    """Detailed benchmark of the profile against the specified target career role."""
    target_role: str
    alignment_score: int = Field(..., ge=0, le=100)
    demonstrated_competencies: List[str] = Field(default_factory=list)
    critical_skill_gaps: List[str] = Field(default_factory=list)
    recommended_keywords: List[str] = Field(default_factory=list)
    suggested_headline: str
    suggested_about_summary: str
    experience_improvement_points: List[str] = Field(default_factory=list)
    recommended_projects: List[str] = Field(default_factory=list)
    recommended_certifications: List[str] = Field(default_factory=list)
    prioritized_30_day_plan: List[PlanWeek] = Field(default_factory=list)


class LinkedInSectionScores(BaseModel):
    """All 10 individual 0-100 section score cards."""
    headline: ScoreDetail
    about: ScoreDetail
    experience: ScoreDetail
    skills: ScoreDetail
    education: ScoreDetail
    projects: ScoreDetail
    certifications: ScoreDetail
    keyword_optimization: ScoreDetail
    profile_completeness: ScoreDetail
    target_role_alignment: ScoreDetail


class LinkedInAnalysisResult(BaseModel):
    """Complete root response payload for a LinkedIn profile evaluation."""
    id: str
    input_type: str = Field(..., description="Method used: 'url', 'pdf', or 'text'")
    profile_url: Optional[str] = None
    target_role: str
    model_used: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    profile_identity: ProfileIdentity
    available_sections: List[str]
    unavailable_sections: List[str]
    coverage_information: CoverageInformation
    overall_score: ScoreDetail
    section_scores: LinkedInSectionScores
    headline_analysis: HeadlineAnalysis
    about_analysis: AboutAnalysis
    experience_analysis: ExperienceAnalysis
    education_analysis: EducationAnalysis
    skills_analysis: SkillsAnalysis
    project_analysis: ProjectAnalysis
    additional_sections: AdditionalSectionsAnalysis
    keyword_analysis: KeywordAnalysis
    target_role_alignment: TargetRoleAlignment
    limitations: List[str] = Field(default_factory=list)
    disclaimer: str = (
        "This AI-generated analysis is an advisory evaluation benchmarked against standard industry hiring practices "
        "and recruiter search patterns. It is NOT an official LinkedIn rating, does not guarantee job placement or "
        "recruiter outreach, and does not represent internal proprietary LinkedIn ranking algorithms."
    )


class LinkedInUrlRequest(BaseModel):
    """Request payload for LinkedIn profile URL analysis."""
    url: str = Field(..., description="Public LinkedIn profile URL (e.g. https://www.linkedin.com/in/username)")
    target_role: str = Field(..., min_length=2, max_length=100, description="Target career role")
    model: Optional[str] = Field(None, description="Optional chosen Gemini model")
    fallback_text: Optional[str] = Field(None, description="Optional additional profile text provided as fallback")


class LinkedInTextRequest(BaseModel):
    """Request payload for pasted LinkedIn profile text analysis."""
    profile_text: str = Field(..., min_length=50, description="Pasted text copied from a LinkedIn profile")
    target_role: str = Field(..., min_length=2, max_length=100, description="Target career role")
    model: Optional[str] = Field(None, description="Optional chosen Gemini model")
    profile_url: Optional[str] = Field(None, description="Optional associated LinkedIn profile URL")
