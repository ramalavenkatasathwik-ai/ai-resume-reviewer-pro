import apiClient, { setAuthToken } from '@/lib/axios';
import { User, TokenResponse, ForgotPasswordResponse } from '@/types/auth';

export const authService = {
  /**
   * Register a new account.
   */
  async register(data: {
    email: string;
    password: string;
    display_name: string;
  }): Promise<User> {
    const res = await apiClient.post<TokenResponse>('/api/auth/register', data);
    setAuthToken(res.data.access_token);
    return res.data.user;
  },

  /**
   * Log into an existing account.
   */
  async login(data: { email: string; password: string }): Promise<User> {
    const res = await apiClient.post<TokenResponse>('/api/auth/login', data);
    setAuthToken(res.data.access_token);
    return res.data.user;
  },

  /**
   * Log out and clear session cookie and memory.
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } finally {
      setAuthToken(null);
    }
  },

  /**
   * Restore/fetch current active user session.
   */
  async getCurrentUser(): Promise<User> {
    const res = await apiClient.get<User>('/api/auth/me');
    return res.data;
  },

  /**
   * Update editable profile fields (display name).
   */
  async updateProfile(data: { display_name?: string }): Promise<User> {
    const res = await apiClient.put<User>('/api/auth/me', data);
    return res.data;
  },

  /**
   * Change account password after verifying current password.
   */
  async changePassword(data: {
    current_password: string;
    new_password: string;
  }): Promise<{ status: string; message: string }> {
    const res = await apiClient.post<{ status: string; message: string }>(
      '/api/auth/change-password',
      data
    );
    return res.data;
  },

  /**
   * Request password reset instructions.
   */
  async forgotPassword(data: { email: string }): Promise<ForgotPasswordResponse> {
    const res = await apiClient.post<ForgotPasswordResponse>(
      '/api/auth/forgot-password',
      data
    );
    return res.data;
  },

  /**
   * Reset password using cryptographic token.
   */
  async resetPassword(data: {
    token: string;
    new_password: string;
  }): Promise<{ status: string; message: string }> {
    const res = await apiClient.post<{ status: string; message: string }>(
      '/api/auth/reset-password',
      data
    );
    return res.data;
  },

  /**
   * Permanently delete user account and personal history with password confirmation.
   */
  async deleteAccount(data: { password: string }): Promise<{ status: string; message: string }> {
    const res = await apiClient.delete<{ status: string; message: string }>(
      '/api/auth/account',
      { data }
    );
    setAuthToken(null);
    return res.data;
  },
};

export default authService;
