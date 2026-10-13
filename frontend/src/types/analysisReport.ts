export interface AnalysisReportSummary {
  id: string;
  original_filename: string;
  filename?: string | null;
  source_type: 'pdf' | 'url' | 'text' | string;
  analysis_type: 'resume' | 'linkedin' | string;
  target_role: string;
  status: 'completed' | 'failed' | 'processing' | string;
  overall_score?: number | null;
  ats_score?: number | null;
  model_name?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
}

export interface AnalysisReportDetail extends AnalysisReportSummary {
  result_json?: Record<string, unknown> | null;
  prompt_version?: string | null;
  token_usage?: Record<string, unknown> | null;
  estimated_cost?: number | null;
  error_category?: string | null;
  error_message?: string | null;
  stored_file_id?: string | null;
}

export interface AnalysisReportListResponse {
  items: AnalysisReportSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
