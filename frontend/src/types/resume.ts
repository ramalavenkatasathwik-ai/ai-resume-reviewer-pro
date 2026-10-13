export interface ResumeBasics {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  title?: string;
  summary?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface ResumeExperience {
  id?: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  highlights: string[];
}

export interface ResumeEducation {
  id?: string;
  institution: string;
  area: string;
  studyType: string;
  startDate?: string;
  endDate?: string;
  score?: string;
}

export interface StructuredResumeData {
  basics: ResumeBasics;
  experience?: ResumeExperience[];
  education?: ResumeEducation[];
  skills?: string[];
  certifications?: string[];
  projects?: Array<{
    name: string;
    description: string;
    highlights?: string[];
    url?: string;
  }>;
}

export interface ResumeVersionSummary {
  id: string;
  resume_id: string;
  version_number: intNumber;
  template_name: string;
  page_format: string;
  version_notes?: string | null;
  created_at: string;
}

type intNumber = number;

export interface ResumeVersionDetail extends ResumeVersionSummary {
  resume_data: StructuredResumeData;
  source_analysis_id?: string | null;
  job_description_metadata?: Record<string, unknown> | null;
}

export interface ResumeSummary {
  id: string;
  user_id: string;
  title: string;
  target_role: string;
  current_version_id?: string | null;
  is_archived: boolean;
  versions_count: number;
  created_at: string;
  updated_at: string;
}

export interface ResumeDetail extends ResumeSummary {
  current_version?: ResumeVersionDetail | null;
}

export interface ResumeCreatePayload {
  title: string;
  target_role: string;
  resume_data: StructuredResumeData;
  template_name?: string;
  page_format?: string;
  source_analysis_id?: string;
  version_notes?: string;
}

export interface ResumeUpdatePayload {
  title?: string;
  target_role?: string;
  is_archived?: boolean;
}

export interface ResumeVersionCreatePayload {
  resume_data: StructuredResumeData;
  template_name?: string;
  page_format?: string;
  version_notes?: string;
}
