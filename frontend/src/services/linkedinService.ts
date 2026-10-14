import apiClient from '@/lib/axios';
import { LinkedInAnalysisResult } from '@/types/linkedin';

export const linkedinService = {
  /**
   * Client-side validation for LinkedIn profile URLs against security and domain rules.
   */
  validateProfileUrl(rawUrl: string): {
    valid: boolean;
    error?: string;
    normalizedUrl?: string;
    username?: string;
  } {
    if (!rawUrl || !rawUrl.trim()) {
      return { valid: false, error: 'LinkedIn profile URL is required.' };
    }
    const cleaned = rawUrl.trim();
    if (cleaned.startsWith('http://')) {
      return {
        valid: false,
        error: 'Insecure HTTP is not allowed. Only HTTPS LinkedIn profile URLs are supported.',
      };
    }
    if (!cleaned.startsWith('https://')) {
      return {
        valid: false,
        error: 'Only HTTPS LinkedIn profile URLs are supported (must start with https://).',
      };
    }

    try {
      const parsed = new URL(cleaned);
      if (parsed.username || parsed.password) {
        return {
          valid: false,
          error: 'URLs containing embedded credentials are not permitted.',
        };
      }
      if (parsed.port && parsed.port !== '443') {
        return {
          valid: false,
          error: `Custom port '${parsed.port}' is not allowed. Only default HTTPS port 443 is permitted.`,
        };
      }
      const host = parsed.hostname.toLowerCase();
      const hostRegex = /^(?:www\.|[a-z]{2}\.)?linkedin\.com$/i;
      if (!hostRegex.test(host)) {
        return {
          valid: false,
          error: `Domain '${host}' is not supported. Only approved LinkedIn personal profile URLs are accepted.`,
        };
      }
      const match = parsed.pathname.match(/^\/in\/([a-zA-Z0-9_\-.]+)\/?$/i);
      if (!match || !match[1]) {
        if (parsed.pathname.startsWith('/company')) {
          return {
            valid: false,
            error: 'Company pages are not supported. Please supply a personal LinkedIn member profile (/in/username).',
          };
        }
        if (parsed.pathname.startsWith('/jobs')) {
          return {
            valid: false,
            error: 'Job postings are not supported. Please supply a personal LinkedIn member profile.',
          };
        }
        return {
          valid: false,
          error: 'URL path must point to a personal LinkedIn member profile (e.g., https://www.linkedin.com/in/username).',
        };
      }
      const username = match[1].replace(/\/$/, '');
      return {
        valid: true,
        normalizedUrl: `https://www.linkedin.com/in/${username}`,
        username,
      };
    } catch {
      return { valid: false, error: 'The provided URL format is malformed or invalid.' };
    }
  },

  /**
   * Evaluates a LinkedIn profile via URL using server-side Gemini AI.
   */
  async analyzeUrl(
    payload: {
      linkedin_url?: string;
      url?: string;
      target_role: string;
      model?: string;
      profile_text?: string;
      fallback_text?: string;
    }
  ): Promise<LinkedInAnalysisResult> {
    const body = {
      linkedin_url: payload.linkedin_url || payload.url,
      url: payload.url || payload.linkedin_url,
      target_role: payload.target_role,
      model: payload.model,
      profile_text: payload.profile_text || payload.fallback_text,
      fallback_text: payload.fallback_text || payload.profile_text,
    };
    const response = await apiClient.post<LinkedInAnalysisResult>(
      '/api/linkedin/analyze-url',
      body
    );
    return response.data;
  },

  /**
   * Evaluates a LinkedIn profile via 'Save to PDF' export using server-side Gemini AI.
   */
  async analyzePdf(
    file: File,
    targetRole: string,
    model?: string,
    profileUrl?: string
  ): Promise<LinkedInAnalysisResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_role', targetRole);
    if (model) formData.append('model', model);
    if (profileUrl) formData.append('profile_url', profileUrl);

    const response = await apiClient.post<LinkedInAnalysisResult>(
      '/api/linkedin/analyze-pdf',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Evaluates pasted LinkedIn profile text using server-side Gemini AI.
   */
  async analyzeText(
    payload: {
      profile_text: string;
      target_role: string;
      model?: string;
      profile_url?: string;
    }
  ): Promise<LinkedInAnalysisResult> {
    const response = await apiClient.post<LinkedInAnalysisResult>(
      '/api/linkedin/analyze-text',
      payload
    );
    return response.data;
  },

  /**
   * Fetches supported Gemini models from backend.
   */
  async getSupportedModels(): Promise<{ models: string[]; default_model: string }> {
    try {
      const response = await apiClient.get<{ models: Array<{ id: string }>; default_model: string }>(
        '/api/models'
      );
      return {
        models: response.data.models.map((m) => m.id),
        default_model: response.data.default_model,
      };
    } catch {
      return {
        models: ['gemini-4-argon', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
        default_model: 'gemini-4-argon',
      };
    }
  },

  /**
   * Validates server AI service connectivity.
   */
  async validateKey(model?: string): Promise<{ valid: boolean; message: string }> {
    const response = await apiClient.post<{ valid: boolean; message: string }>(
      '/api/keys/validate',
      { model }
    );
    return response.data;
  },
};

export default linkedinService;
