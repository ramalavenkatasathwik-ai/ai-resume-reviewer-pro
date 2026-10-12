import axios from 'axios';
import { ResumeAnalysisResult, AnalysisHistoryItem } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const resumeService = {
  /**
   * Evaluates a resume PDF against a target role using BYOK Gemini API key.
   */
  async analyzeResume(
    file: File,
    targetRole: string,
    apiKey: string,
    model?: string
  ): Promise<ResumeAnalysisResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_role', targetRole);
    if (model) {
      formData.append('model', model);
    }

    const response = await axios.post<ResumeAnalysisResult>(
      `${API_BASE_URL}/api/analyze`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Gemini-API-Key': apiKey,
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
    const params: Record<string, any> = { limit, offset };
    if (analysisType && analysisType !== 'all') {
      params.analysis_type = analysisType;
    }

    const response = await axios.get<AnalysisHistoryItem[]>(
      `${API_BASE_URL}/api/history`,
      { params }
    );

    return response.data;
  },
};

export default resumeService;
