import apiClient from '@/lib/axios';
import { ResumeAnalysisResult, AnalysisHistoryItem } from '@/types/api';

export const resumeService = {
  /**
   * Evaluates a resume PDF against a target role using server-side Gemini AI.
   */
  async analyzeResume(
    file: File,
    targetRole: string,
    model?: string
  ): Promise<ResumeAnalysisResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_role', targetRole);
    if (model) {
      formData.append('model', model);
    }

    const response = await apiClient.post<ResumeAnalysisResult>(
      '/api/analyze',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 90000, // LLMs may take up to 60-90s on complex files
      }
    );

    return response.data;
  },

  /**
   * Fetches analysis history from the backend database.
   */
  async getHistory(
    analysisType?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AnalysisHistoryItem[]> {
    const params: Record<string, string | number> = { limit, offset };
    if (analysisType && analysisType !== 'all') {
      params.analysis_type = analysisType;
    }

    const response = await apiClient.get<AnalysisHistoryItem[]>(
      '/api/history',
      { params }
    );

    return response.data;
  },
};

export default resumeService;
