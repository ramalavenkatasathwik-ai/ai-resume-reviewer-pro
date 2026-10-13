import { StructuredResumeData, ResumeDetail } from './resume';

export type RequirementCategory =
  | 'required_skill'
  | 'preferred_skill'
  | 'experience'
  | 'education'
  | 'responsibility';

export type MatchStatus = 'matched' | 'partial' | 'not_evidenced' | 'not_assessable';

export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface RequirementMatchItem {
  requirement: string;
  category: RequirementCategory;
  status: MatchStatus;
  evidence?: string | null;
  gap_analysis?: string | null;
  is_required: boolean;
}

export interface ScoreBreakdown {
  overall_score: number;
  required_skills_score: number;
  preferred_skills_score: number;
  experience_score: number;
  keyword_score: number;
  total_requirements_count: number;
  matched_count: number;
  partial_count: number;
  not_evidenced_count: number;
  not_assessable_count: number;
  matched_keywords: string[];
  missing_keywords: string[];
}

export interface JobMatchComparison {
  score_breakdown: ScoreBreakdown;
  items: RequirementMatchItem[];
}

export interface JobRequirements {
  job_title: string;
  company_name?: string | null;
  summary?: string | null;
  required_technical_skills: string[];
  preferred_technical_skills: string[];
  required_experience_years?: number | null;
  education_qualifications: string[];
  responsibilities: string[];
  relevant_keywords: string[];
  seniority_level?: string | null;
}

export interface JobMatchRecommendation {
  id: string;
  category: string;
  target_section: string;
  current_state: string;
  recommended_action: string;
  reason: string;
  proposed_text: string;
  requires_user_confirmation: boolean;
  priority: RecommendationPriority;
}

export interface JobMatchAnalyzeRequest {
  resume_id: string;
  version_id?: string | null;
  job_description: string;
  job_title?: string | null;
  company_name?: string | null;
  target_role?: string | null;
  model?: string;
}

export interface JobRequirementsExtractRequest {
  job_description: string;
  job_title?: string | null;
  company_name?: string | null;
  model?: string;
}

export interface TailorResumeRequest {
  accepted_recommendation_ids: string[];
  custom_edits?: Record<string, string>;
  confirmed_missing_facts?: string[];
}

export interface DiffItem {
  section: string;
  original: string;
  tailored: string;
  recommendation_id?: string;
}

export interface TailoredResumeDraftResponse {
  report_id: string;
  resume_id: string;
  resume_version_id: string;
  original_resume_data: StructuredResumeData;
  tailored_resume_data: StructuredResumeData;
  applied_recommendations: JobMatchRecommendation[];
  diff_summary: DiffItem[];
}

export interface SaveTailoredResumeRequest {
  tailored_resume_data: StructuredResumeData;
  action: 'new_version' | 'new_document';
  target_resume_id?: string | null;
  title?: string | null;
  version_notes?: string | null;
  template_name?: string;
  page_format?: string;
}

export interface JobMatchReportSummary {
  id: string;
  resume_id: string;
  resume_version_id: string;
  job_title: string;
  company_name?: string | null;
  overall_score: number;
  required_skills_score: number;
  keyword_score: number;
  status: string;
  scoring_version: string;
  created_at: string;
}

export interface JobMatchReportDetail {
  id: string;
  resume_id: string;
  resume_version_id: string;
  job_title: string;
  company_name?: string | null;
  job_description_raw: string;
  extracted_requirements: JobRequirements;
  comparison_result: JobMatchComparison;
  recommendations: JobMatchRecommendation[];
  overall_score: number;
  required_skills_score: number;
  keyword_score: number;
  scoring_version: string;
  model_name: string;
  status: string;
  retention_days: number;
  created_at: string;
}

export type SaveTailoredResumeResult = ResumeDetail;
