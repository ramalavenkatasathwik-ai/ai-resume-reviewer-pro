import axios from 'axios';
import { LinkedInAnalysisResult } from '@/types/linkedin';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const linkedinService = {
  /**
   * Evaluates a LinkedIn profile via URL using BYOK header.
   */
  async analyzeUrl(
    payload: {
      url: string;
      target_role: string;
      model?: string;
      fallback_text?: string;
    },
    apiKey: string
  ): Promise<LinkedInAnalysisResult> {
    const response = await axios.post<LinkedInAnalysisResult>(
      `${API_BASE_URL}/api/linkedin/analyze-url`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': apiKey,
        },
      }
    );
    return response.data;
  },

  /**
   * Evaluates a LinkedIn profile via 'Save to PDF' export using BYOK header.
   */
  async analyzePdf(
    file: File,
    targetRole: string,
    apiKey: string,
    model?: string,
    profileUrl?: string
  ): Promise<LinkedInAnalysisResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_role', targetRole);
    if (model) formData.append('model', model);
    if (profileUrl) formData.append('profile_url', profileUrl);

    const response = await axios.post<LinkedInAnalysisResult>(
      `${API_BASE_URL}/api/linkedin/analyze-pdf`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Gemini-API-Key': apiKey,
        },
      }
    );
    return response.data;
  },

  /**
   * Evaluates pasted LinkedIn profile text using BYOK header.
   */
  async analyzeText(
    payload: {
      profile_text: string;
      target_role: string;
      model?: string;
      profile_url?: string;
    },
    apiKey: string
  ): Promise<LinkedInAnalysisResult> {
    const response = await axios.post<LinkedInAnalysisResult>(
      `${API_BASE_URL}/api/linkedin/analyze-text`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': apiKey,
        },
      }
    );
    return response.data;
  },

  /**
   * Fetches supported Gemini models from backend.
   */
  async getSupportedModels(): Promise<{ models: string[]; default_model: string }> {
    try {
      const response = await axios.get<{ models: Array<{ id: string }>; default_model: string }>(
        `${API_BASE_URL}/api/models`
      );
      return {
        models: response.data.models.map((m) => m.id),
        default_model: response.data.default_model,
      };
    } catch {
      return {
        models: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
        default_model: 'gemini-2.5-flash',
      };
    }
  },

  /**
   * Validates user API key with minimal probe.
   */
  async validateKey(apiKey: string, model?: string): Promise<{ valid: boolean; message: string }> {
    const response = await axios.post<{ valid: boolean; message: string }>(
      `${API_BASE_URL}/api/keys/validate`,
      { model },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': apiKey,
        },
      }
    );
    return response.data;
  },
};

export default linkedinService;
