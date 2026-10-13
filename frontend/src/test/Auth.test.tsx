import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AuthProvider } from '@/context/AuthContext';
import { authService } from '@/services/authService';

describe('Authentication & Account Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('LoginPage', () => {
    it('renders login form inputs and actions', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Welcome Back/i);
      expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
      expect(screen.getByText(/Create an account/i)).toBeInTheDocument();
      expect(screen.getByText(/Forgot password\?/i)).toBeInTheDocument();
    });

    it('submits credentials and calls authService.login', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Test User',
        is_active: true,
        created_at: '2026-10-13T12:00:00Z',
        updated_at: '2026-10-13T12:00:00Z',
      };
      vi.spyOn(authService, 'login').mockResolvedValue(mockUser);

      render(
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123!',
        });
      });

      // Verify zero tokens stored in localStorage or sessionStorage
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(sessionStorage.getItem('token')).toBeNull();
    });

    it('displays error message on invalid credentials', async () => {
      vi.spyOn(authService, 'login').mockRejectedValue({
        response: {
          data: {
            detail: {
              error: 'INVALID_CREDENTIALS',
              message: 'Invalid email address or password.',
            },
          },
        },
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
        target: { value: 'wrong@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
        target: { value: 'WrongPass123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Invalid email address or password/i);
      });
    });
  });

  describe('RegisterPage', () => {
    it('renders registration form with password requirements checklist', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Create Account/i);
      expect(screen.getByText(/8\+ characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Uppercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/Lowercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/Number \(0-9\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Special character/i)).toBeInTheDocument();
    });

    it('enables submit only when password meets complexity and matches confirm password', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'newuser@example.com',
        display_name: 'New User',
        is_active: true,
        created_at: '2026-10-13T12:00:00Z',
        updated_at: '2026-10-13T12:00:00Z',
      };
      vi.spyOn(authService, 'register').mockResolvedValue(mockUser);

      render(
        <MemoryRouter>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const submitButton = screen.getByRole('button', { name: /Create Account/i });
      expect(submitButton).toBeDisabled();

      fireEvent.change(screen.getByPlaceholderText(/Jane Doe/i), {
        target: { value: 'New User' },
      });
      fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
        target: { value: 'newuser@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText(/At least 8 characters/i), {
        target: { value: 'ValidPass123!' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Confirm password/i), {
        target: { value: 'ValidPass123!' },
      });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(authService.register).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'ValidPass123!',
          display_name: 'New User',
        });
      });
    });
  });

  describe('ForgotPasswordPage', () => {
    it('shows email service not configured message when SMTP is unconfigured', async () => {
      vi.spyOn(authService, 'forgotPassword').mockResolvedValue({
        status: 'not_configured',
        message: 'Automated email delivery is not configured on this server.',
        smtp_configured: false,
      });

      render(
        <MemoryRouter>
          <ForgotPasswordPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
        target: { value: 'user@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Send Reset Instructions/i }));

      await waitFor(() => {
        expect(screen.getByText(/Email Service Not Configured/i)).toBeInTheDocument();
        expect(screen.getByText(/SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD/i)).toBeInTheDocument();
      });
    });
  });

  describe('ResetPasswordPage', () => {
    it('shows missing token error when no token query parameter is provided', () => {
      render(
        <MemoryRouter initialEntries={['/reset-password']}>
          <ResetPasswordPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Invalid or missing reset token/i)).toBeInTheDocument();
    });

    it('submits reset request when token is provided with matching passwords', async () => {
      vi.spyOn(authService, 'resetPassword').mockResolvedValue({
        status: 'success',
        message: 'Password reset successfully.',
      });

      render(
        <MemoryRouter initialEntries={['/reset-password?token=valid_test_token_123']}>
          <ResetPasswordPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText(/At least 8 characters/i), {
        target: { value: 'NewSecurePass123!' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Confirm new password/i), {
        target: { value: 'NewSecurePass123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Set New Password/i }));

      await waitFor(() => {
        expect(authService.resetPassword).toHaveBeenCalledWith({
          token: 'valid_test_token_123',
          new_password: 'NewSecurePass123!',
        });
        expect(screen.getByText(/Password successfully updated!/i)).toBeInTheDocument();
      });
    });
  });

  describe('SettingsPage Account Management & Deletion Modal', () => {
    it('displays sign in prompt when user is not authenticated', () => {
      vi.spyOn(authService, 'getCurrentUser').mockRejectedValue(new Error('Unauthenticated'));

      render(
        <MemoryRouter>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      // In BYOK or account tab
      fireEvent.click(screen.getByRole('button', { name: /Account & Security/i }));
      expect(screen.getByText(/Sign in to Manage Account/i)).toBeInTheDocument();
    });

    it('shows account profile, change password form, and deletion modal when authenticated', async () => {
      const mockUser = {
        id: 'user-789',
        email: 'authuser@example.com',
        display_name: 'Auth User',
        is_active: true,
        created_at: '2026-10-13T12:00:00Z',
        updated_at: '2026-10-13T12:00:00Z',
      };
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockUser);
      vi.spyOn(authService, 'deleteAccount').mockResolvedValue({
        status: 'success',
        message: 'Account deleted.',
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('authuser@example.com')).toBeInTheDocument();
      });

      // Open deletion modal
      const deleteButton = screen.getByRole('button', { name: /Delete My Account\.\.\./i });
      fireEvent.click(deleteButton);

      expect(screen.getByText(/Permanently Delete Account\?/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter your account password/i)).toBeInTheDocument();

      // Submit deletion
      fireEvent.change(screen.getByPlaceholderText(/Enter your account password/i), {
        target: { value: 'MySecretPassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Confirm Account Deletion/i }));

      await waitFor(() => {
        expect(authService.deleteAccount).toHaveBeenCalledWith({
          password: 'MySecretPassword123!',
        });
      });
    });
  });
});
