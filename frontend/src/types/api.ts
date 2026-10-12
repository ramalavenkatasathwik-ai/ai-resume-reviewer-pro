export interface HealthResponse {
  status: string;
  service: string;
}

export type ConnectionStatus = 'checking' | 'connected' | 'offline';

export interface HealthCheckState {
  status: ConnectionStatus;
  data: HealthResponse | null;
  error: string | null;
  lastChecked: Date | null;
}

export interface CandidateInformation {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface ResumeAnalysisResult {
  candidate_information: CandidateInformation;
  overall_score: number;
  ats_score: number;
  skills_score: number;
  content_score: number;
  experience_score: number;
  formatting_score: number;
  professional_summary: string;
  strengths: string[];
  weaknesses: string[];
  missing_skills: string[];
  ats_keywords: string[];
  grammar_issues: string[];
  formatting_issues: string[];
  recommended_skills: string[];
  recommended_certifications: string[];
  recommended_courses: string[];
  interview_questions: string[];
  career_suggestions: string[];
  final_assessment: string;
  target_role: string;
  model_used: string;
  disclaimer: string;
}

export interface AnalysisHistoryItem {
  id: string;
  filename: string;
  target_role: string;
  status: string;
  analysis_type: 'resume' | 'linkedin' | string;
  overall_score: number | null;
  ats_score: number | null;
  created_at: string | null;
}

