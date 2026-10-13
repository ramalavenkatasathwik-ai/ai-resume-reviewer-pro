import apiClient from '@/lib/axios';
import {
  DocumentEmailRequest,
  DocumentEmailResponse,
  EmailConfigStatusResponse,
  UnsavedExportRequest,
} from '@/types/export';

/**
 * Triggers a native browser file download from a Blob.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

/**
 * Extracts attachment filename from Content-Disposition header if available.
 */
function extractFilename(contentDisposition?: string, fallback: string = 'document'): string {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename=["']?([^"';]+)["']?/i);
  return match && match[1] ? match[1].trim() : fallback;
}

export const exportService = {
  /**
   * Downloads a PDF of a saved resume version snapshot.
   */
  async downloadResumeVersionPdf(resumeId: string, versionId: string): Promise<void> {
    const res = await apiClient.get<Blob>(
      `/api/resumes/${resumeId}/versions/${versionId}/export/pdf`,
      { responseType: 'blob' }
    );
    const filename = extractFilename(res.headers['content-disposition'], 'resume.pdf');
    triggerBlobDownload(res.data, filename);
  },

  /**
   * Downloads an editable DOCX of a saved resume version snapshot.
   */
  async downloadResumeVersionDocx(resumeId: string, versionId: string): Promise<void> {
    const res = await apiClient.get<Blob>(
      `/api/resumes/${resumeId}/versions/${versionId}/export/docx`,
      { responseType: 'blob' }
    );
    const filename = extractFilename(res.headers['content-disposition'], 'resume.docx');
    triggerBlobDownload(res.data, filename);
  },

  /**
   * Downloads an unsaved in-memory resume draft as PDF.
   */
  async downloadUnsavedResumePdf(resumeId: string, payload: UnsavedExportRequest): Promise<void> {
    const res = await apiClient.post<Blob>(
      `/api/resumes/${resumeId}/export/pdf-preview`,
      payload,
      { responseType: 'blob' }
    );
    const filename = extractFilename(res.headers['content-disposition'], 'resume-draft.pdf');
    triggerBlobDownload(res.data, filename);
  },

  /**
   * Downloads an unsaved in-memory resume draft as editable DOCX.
   */
  async downloadUnsavedResumeDocx(resumeId: string, payload: UnsavedExportRequest): Promise<void> {
    const res = await apiClient.post<Blob>(
      `/api/resumes/${resumeId}/export/docx-preview`,
      payload,
      { responseType: 'blob' }
    );
    const filename = extractFilename(res.headers['content-disposition'], 'resume-draft.docx');
    triggerBlobDownload(res.data, filename);
  },

  /**
   * Downloads a multi-page PDF summary of an executive resume or LinkedIn analysis report.
   */
  async downloadAnalysisReportPdf(analysisId: string): Promise<void> {
    const res = await apiClient.get<Blob>(
      `/api/analyses/${analysisId}/export/pdf`,
      { responseType: 'blob' }
    );
    const filename = extractFilename(res.headers['content-disposition'], 'analysis-report.pdf');
    triggerBlobDownload(res.data, filename);
  },

  /**
   * Downloads a multi-page PDF summary of a job description fit report.
   */
  async downloadJobMatchReportPdf(matchId: string): Promise<void> {
    const res = await apiClient.get<Blob>(
      `/api/job-matches/${matchId}/export/pdf`,
      { responseType: 'blob' }
    );
    const filename = extractFilename(res.headers['content-disposition'], 'job-match-report.pdf');
    triggerBlobDownload(res.data, filename);
  },

  /**
   * Checks whether the server has an active email provider configured.
   */
  async getEmailStatus(): Promise<EmailConfigStatusResponse> {
    const res = await apiClient.get<EmailConfigStatusResponse>('/api/email/status');
    return res.data;
  },

  /**
   * Dispatches a document via transactional email attachment.
   */
  async sendDocumentEmail(payload: DocumentEmailRequest): Promise<DocumentEmailResponse> {
    const res = await apiClient.post<DocumentEmailResponse>('/api/email/send', payload);
    return res.data;
  },
};
