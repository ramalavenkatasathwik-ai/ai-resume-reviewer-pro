export interface ScoreDetail {
  score: number;
  explanation: string;
  supporting_evidence: string[];
  recommended_actions: string[];
}

export interface CoverageInformation {
  assessed_sections_count: number;
  total_possible_sections: number;
  coverage_percentage: number;
  calculation_methodology: string;
  limitations: string[];
}

export interface ProfileIdentity {
  name?: string | null;
  headline?: string | null;
  current_position?: string | null;
  industry?: string | null;
  location?: string | null;
  profile_url?: string | null;
  professional_positioning?: string | null;
}

export interface HeadlineAnalysis {
  clarity_and_specificity: string;
  relevant_keywords: string[];
  target_role_alignment: string;
  value_proposition: string;
  suggested_improved_headlines: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface AboutAnalysis {
  is_available: boolean;
  introduction_and_identity?: string | null;
  career_narrative?: string | null;
  evidence_of_impact?: string | null;
  keyword_coverage?: string | null;
  grammar_and_readability?: string | null;
  missing_information: string[];
  suggested_rewritten_about?: string | null;
  strengths: string[];
  weaknesses: string[];
}

export interface LinkedInRoleAnalysis {
  job_title: string;
  organization: string;
  dates?: string | null;
  description?: string | null;
  responsibilities: string[];
  achievements: string[];
  quantifiable_outcomes: string[];
  relevant_skills: string[];
  keyword_coverage: string[];
  missing_metrics: string[];
  suggested_rewritten_description?: string | null;
}

export interface ExperienceAnalysis {
  is_available: boolean;
  roles_analyzed_count: number;
  roles: LinkedInRoleAnalysis[];
  overall_experience_strengths: string[];
  overall_experience_weaknesses: string[];
  missing_evidence_summary: string[];
}

export interface LinkedInEducationItem {
  institution: string;
  degree?: string | null;
  field_of_study?: string | null;
  dates?: string | null;
  achievements: string[];
  relevance_to_target_role?: string | null;
}

export interface EducationAnalysis {
  is_available: boolean;
  items: LinkedInEducationItem[];
  strengths: string[];
  weaknesses: string[];
}

export interface SkillsAnalysis {
  is_available: boolean;
  listed_skills: string[];
  role_relevant_skills: string[];
  missing_or_weakly_evidenced_skills: string[];
  duplicate_or_redundant_skills: string[];
  suggested_skill_prioritization: string[];
  skills_supported_by_evidence: string[];
}

export interface LinkedInProjectItem {
  title: string;
  technical_stack: string[];
  problem_and_solution?: string | null;
  outcomes_and_impact?: string | null;
  missing_details: string[];
  suggested_rewritten_description?: string | null;
}

export interface ProjectAnalysis {
  is_available: boolean;
  items: LinkedInProjectItem[];
  strengths: string[];
  weaknesses: string[];
}

export interface AdditionalSectionsAnalysis {
  certifications: string[];
  courses: string[];
  publications: string[];
  recommendations_summary?: string | null;
  volunteer_experience: string[];
  honors_and_awards: string[];
  languages: string[];
  unavailable_sections_notes: string[];
}

export interface KeywordAnalysis {
  found_keywords: string[];
  missing_critical_keywords: string[];
  keyword_density_assessment: string;
  strategic_placement_advice: string[];
}

export interface PlanWeek {
  week: number;
  focus_title: string;
  action_items: string[];
}

export interface TargetRoleAlignment {
  target_role: string;
  alignment_score: number;
  demonstrated_competencies: string[];
  critical_skill_gaps: string[];
  recommended_keywords: string[];
  suggested_headline: string;
  suggested_about_summary: string;
  experience_improvement_points: string[];
  recommended_projects: string[];
  recommended_certifications: string[];
  prioritized_30_day_plan: PlanWeek[];
}

export interface LinkedInSectionScores {
  headline: ScoreDetail;
  about: ScoreDetail;
  experience: ScoreDetail;
  skills: ScoreDetail;
  education: ScoreDetail;
  projects: ScoreDetail;
  certifications: ScoreDetail;
  keyword_optimization: ScoreDetail;
  profile_completeness: ScoreDetail;
  target_role_alignment: ScoreDetail;
}

export interface LinkedInAnalysisResult {
  id: string;
  status?: string;
  input_type: 'url' | 'pdf' | 'text';
  original_filename?: string | null;
  extraction_method?: string | null;
  profile_url?: string | null;
  normalized_profile_url?: string | null;
  target_role: string;
  model_used: string;
  created_at: string;
  profile_identity: ProfileIdentity;
  profile?: ProfileIdentity;
  available_sections: string[];
  unavailable_sections: string[];
  coverage_percentage?: number;
  coverage_information: CoverageInformation;
  overall_score: ScoreDetail;
  section_scores: LinkedInSectionScores;
  strengths?: string[];
  weaknesses?: string[];
  headline_analysis: HeadlineAnalysis;
  about_analysis: AboutAnalysis;
  experience_analysis: ExperienceAnalysis;
  education_analysis: EducationAnalysis;
  skills_analysis: SkillsAnalysis;
  project_analysis?: ProjectAnalysis;
  projects_analysis?: ProjectAnalysis;
  additional_sections?: AdditionalSectionsAnalysis;
  certifications_analysis?: string[];
  keyword_analysis: KeywordAnalysis;
  target_role_alignment: TargetRoleAlignment;
  recommended_headline?: string | null;
  recommended_about?: string | null;
  recommended_skills?: string[];
  recommended_projects?: string[];
  recommended_certifications?: string[];
  action_plan?: PlanWeek[];
  limitations: string[];
  disclaimer: string;
}

export interface LinkedInUrlRequest {
  linkedin_url?: string;
  url?: string;
  target_role: string;
  model?: string;
  profile_text?: string;
  fallback_text?: string;
}

export interface LinkedInUnavailableDetail {
  error: string;
  message: string;
  limitations?: string[];
  suggested_actions?: string[];
  normalized_profile_url?: string;
}
