import { StructuredResumeData } from '@/types/resume';

export interface DocumentEmailRequest {
  recipient_email: string;
  document_type: 'resume_pdf' | 'resume_docx' | 'analysis_pdf' | 'job_match_pdf';
  document_id: string;
  version_id?: string | null;
  unsaved_resume_data?: StructuredResumeData | Record<string, unknown> | null;
  template_name?: string;
  page_format?: 'letter' | 'a4';
  subject?: string;
  custom_message?: string;
}

export interface DocumentEmailResponse {
  success: boolean;
  log_id: string;
  recipient_email: string;
  status: string;
  provider: string;
  message: string;
}

export interface EmailConfigStatusResponse {
  is_configured: boolean;
  provider: string;
  from_address?: string | null;
}

export interface UnsavedExportRequest {
  resume_data: StructuredResumeData | Record<string, unknown>;
  template_name?: string;
  page_format?: 'letter' | 'a4';
}
