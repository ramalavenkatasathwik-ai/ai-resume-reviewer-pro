import axios from 'axios';

/**
 * Normalizes an API base URL so that:
 * 1. Surrounding whitespace and quotes are removed.
 * 2. Trailing slashes are stripped.
 * 3. If a domain is passed without scheme (e.g. "ai-resume-reviewer-backend.onrender.com"),
 *    "https://" is automatically prepended to prevent "Failed to construct 'URL': Invalid URL" errors.
 * 4. Relative paths (e.g. "/api" or empty string) are preserved.
 */
export const normalizeApiUrl = (url?: string | null): string => {
  let cleaned = (url || '').trim().replace(/^["']|["']$/g, '');
  if (!cleaned) return '';
  if (!/^https?:\/\//i.test(cleaned) && !cleaned.startsWith('/') && cleaned.includes('.')) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned.replace(/\/+$/, '');
};

export const API_BASE_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

let inMemoryToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  inMemoryToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => inMemoryToken;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
