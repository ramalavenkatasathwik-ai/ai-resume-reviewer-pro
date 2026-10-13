export type WritingSection =
  | 'summary'
  | 'experience_bullets'
  | 'project_descriptions'
  | 'technical_skills'
  | 'linkedin_headline'
  | 'linkedin_about'
  | 'cover_letter'
  | 'achievements';

// ---------------------------------------------------------------------------
// 1. Multi-Version Resume Generator Types
// ---------------------------------------------------------------------------

export interface GenerateRoleVariantRequest {
  resume_id: string;
  resume_version_id?: string;
  target_role: string;
  job_description?: string;
  focus_areas?: string[];
  model_name?: string;
}

export interface RoleVariantDraftResponse {
  target_role: string;
  variant_title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resume_data: Record<string, any>;
  key_modifications: string[];
  verified_skills_prioritized: string[];
  factual_integrity_verified: boolean;
  confirmation_needed_items: string[];
}

export interface SaveRoleVariantRequest {
  resume_id?: string;
  title: string;
  target_role: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resume_data: Record<string, any>;
  version_notes?: string;
  save_as_new_document?: boolean;
}

export interface CompareVariantsRequest {
  base_version_id?: string;
  variant_version_id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  base_resume_data?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variant_resume_data?: Record<string, any>;
}

export interface VariantDiffSection {
  section_name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  original_content: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variant_content: any;
  changes_summary: string;
}

export interface VariantComparisonResponse {
  base_title: string;
  variant_title: string;
  target_role: string;
  sections: VariantDiffSection[];
  summary_of_differences: string[];
}

// ---------------------------------------------------------------------------
// 2. Writing Assistant Types
// ---------------------------------------------------------------------------

export interface WritingSuggestionItem {
  id: string;
  section: string;
  original_text: string;
  proposed_revision: string;
  explanation: string;
  target_role: string;
  requires_user_confirmation: boolean;
  verification_prompt?: string | null;
  action_verbs_used: string[];
  metric_focus?: string | null;
}

export interface WritingSuggestionRequest {
  section: WritingSection;
  target_role?: string;
  current_text?: string;
  resume_id?: string;
  resume_version_id?: string;
  job_description?: string;
  instruction?: string;
  model_name?: string;
}

export interface WritingSuggestionResponse {
  section: string;
  target_role: string;
  suggestions: WritingSuggestionItem[];
  editorial_notes: string;
}

// ---------------------------------------------------------------------------
// 3. Personalized Career Roadmap Types
// ---------------------------------------------------------------------------

export interface StrengthItem {
  skill: string;
  category?: string;
  evidence?: string;
}

export interface SkillGapItem {
  skill: string;
  priority?: 'high' | 'medium' | 'low';
  reason?: string;
}

export interface LearningTopicItem {
  topic: string;
  priority: string;
  reason: string;
  learning_objective: string;
  estimated_weeks: number;
}

export interface MilestoneItem {
  timeframe: string;
  title: string;
  completion_criteria: string;
  priority: string;
}

export interface CareerRoadmapResponse {
  id?: string;
  user_id?: string;
  resume_id?: string;
  resume_version_id?: string;
  target_role: string;
  current_level?: string;
  target_level?: string;
  strengths: StrengthItem[];
  skill_gaps: SkillGapItem[];
  potential_undocumented_skills: Array<{ skill: string; recommendation?: string }>;
  learning_topics: LearningTopicItem[];
  practical_projects: Array<{ title: string; description: string; skills_demonstrated?: string[] }>;
  portfolio_improvements: Array<{ area: string; action: string }>;
  certifications: Array<{ name: string; issuer?: string; relevance?: string }>;
  action_items: Array<{ task: string; priority?: string; timeline?: string }>;
  short_term_milestones: MilestoneItem[];
  medium_term_milestones: MilestoneItem[];
  disclaimer: string;
  created_at?: string;
}

export interface GenerateRoadmapRequest {
  resume_id?: string;
  resume_version_id?: string;
  target_role: string;
  current_level?: string;
  target_level?: string;
  job_description?: string;
  model_name?: string;
}

// ---------------------------------------------------------------------------
// 4. Multi-Role Comparison Engine Types
// ---------------------------------------------------------------------------

export interface RoleEvaluationResult {
  role: string;
  overall_score: number;
  required_skills_score: number;
  experience_score: number;
  keyword_score: number;
  evidenced_skills: string[];
  missing_required_skills: string[];
  missing_preferred_skills: string[];
  experience_alignment_summary: string;
  recommended_variant_title: string;
  suggested_improvements: string[];
}

export interface MultiRoleCompareResponse {
  id?: string;
  user_id?: string;
  resume_id: string;
  resume_version_id: string;
  roles_evaluated: string[];
  role_results: Record<string, RoleEvaluationResult>;
  best_fit_role: string;
  trade_offs_summary: string;
  scoring_version: string;
  created_at?: string;
}

export interface MultiRoleCompareRequest {
  resume_id: string;
  resume_version_id?: string;
  target_roles: string[];
  model_name?: string;
}

// ---------------------------------------------------------------------------
// 5. Project & Portfolio Recommendations Types
// ---------------------------------------------------------------------------

export interface ProjectRecommendationItem {
  id: string;
  title: string;
  target_role: string;
  problem_statement: string;
  skills_demonstrated: string[];
  tech_stack: string[];
  core_features: string[];
  milestones: Array<{ phase: string; deliverable: string }>;
  deliverables: string[];
  resume_documentation_guide: string[];
  is_proposed: boolean;
  guardrail_notice: string;
}

export interface ProjectRecommendRequest {
  target_role: string;
  resume_id?: string;
  resume_version_id?: string;
  skill_gaps?: string[];
  model_name?: string;
}

export interface ProjectRecommendResponse {
  target_role: string;
  projects: ProjectRecommendationItem[];
}
