import apiClient from '@/lib/axios';
import {
  JobRequirements,
  JobRequirementsExtractRequest,
  JobMatchAnalyzeRequest,
  JobMatchReportSummary,
  JobMatchReportDetail,
  TailorResumeRequest,
  TailoredResumeDraftResponse,
  SaveTailoredResumeRequest,
  SaveTailoredResumeResult,
} from '@/types/jobMatch';

export const jobMatchService = {
  /**
   * Parses qualifications, required/preferred technical skills, and keywords from a pasted job description.
   */
  async extractRequirements(
    payload: JobRequirementsExtractRequest,
    apiKey: string
  ): Promise<JobRequirements> {
    const res = await apiClient.post<JobRequirements>(
      '/api/job-matches/extract',
      payload,
      {
        headers: {
          'X-Gemini-API-Key': apiKey,
        },
      }
    );
    return res.data;
  },

  /**
   * Compares the candidate's exact resume version against extracted job requirements,
   * generating explainable scores and tailored recommendations.
   */
  async analyzeJobMatch(
    payload: JobMatchAnalyzeRequest,
    apiKey: string
  ): Promise<JobMatchReportDetail> {
    const res = await apiClient.post<JobMatchReportDetail>(
      '/api/job-matches/analyze',
      payload,
      {
        headers: {
          'X-Gemini-API-Key': apiKey,
        },
      }
    );
    return res.data;
  },

  /**
   * Retrieves a list of previous job description match analyses for the authenticated user.
   */
  async listJobMatches(
    search?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<JobMatchReportSummary[]> {
    const params: Record<string, string | number> = { limit, offset };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    const res = await apiClient.get<JobMatchReportSummary[]>('/api/job-matches', {
      params,
    });
    return res.data;
  },

  /**
   * Retrieves complete report including extracted qualifications, score breakdown, and recommendations.
   */
  async getJobMatch(reportId: string): Promise<JobMatchReportDetail> {
    const res = await apiClient.get<JobMatchReportDetail>(`/api/job-matches/${reportId}`);
    return res.data;
  },

  /**
   * Deletes a saved job match report.
   */
  async deleteJobMatch(reportId: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/job-matches/${reportId}`
    );
    return res.data;
  },

  /**
   * Synthesizes a tailored resume draft by applying selected accepted recommendations.
   */
  async tailorResumeDraft(
    reportId: string,
    payload: TailorResumeRequest
  ): Promise<TailoredResumeDraftResponse> {
    const res = await apiClient.post<TailoredResumeDraftResponse>(
      `/api/job-matches/${reportId}/tailor`,
      payload
    );
    return res.data;
  },

  /**
   * Saves the tailored resume as a new version or new document.
   */
  async saveTailoredResume(
    reportId: string,
    payload: SaveTailoredResumeRequest
  ): Promise<SaveTailoredResumeResult> {
    const res = await apiClient.post<SaveTailoredResumeResult>(
      `/api/job-matches/${reportId}/save-tailored`,
      payload
    );
    return res.data;
  },
};
