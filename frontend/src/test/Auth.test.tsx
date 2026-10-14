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
    it('renders login form inputs, labels, and actions with zero BYOK notice', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Welcome Back/i);
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
      expect(screen.getByText(/Create an account/i)).toBeInTheDocument();
      expect(screen.getByText(/Forgot password\?/i)).toBeInTheDocument();

      // Verify BYOK notice is completely removed
      expect(screen.queryByText(/BYOK Privacy/i)).not.toBeInTheDocument();
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

      fireEvent.change(screen.getByLabelText('Email Address'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
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

    it('toggles password visibility with accessible show/hide button', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleButton = screen.getByRole('button', { name: /Show password text/i });
      fireEvent.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(screen.getByRole('button', { name: /Hide password text/i })).toBeInTheDocument();
    });

    it('displays safe generic error message on invalid credentials without leaking email existence', async () => {
      vi.spyOn(authService, 'login').mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 401,
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

      fireEvent.change(screen.getByLabelText('Email Address'), {
        target: { value: 'unknown@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'WrongPass123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Invalid email address or password/i);
      });
    });

    it('displays network failure message when server is unreachable', async () => {
      vi.spyOn(authService, 'login').mockRejectedValue({
        isAxiosError: true,
        request: {},
        response: undefined,
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText('Email Address'), {
        target: { value: 'user@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Unable to connect to the authentication server/i);
      });
    });
  });

  describe('RegisterPage', () => {
    it('renders registration form with required Full Name and password requirements checklist', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Create Account/i);
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();

      // Password checklist
      expect(screen.getByText(/8\+ characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Uppercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/Lowercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/Number \(0-9\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Special character/i)).toBeInTheDocument();
    });

    it('displays field-adjacent error for missing or too-short full name', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText('Full Name');
      fireEvent.focus(nameInput);
      fireEvent.change(nameInput, { target: { value: 'A' } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText(/Full name is required \(at least 2 characters\)/i)).toBeInTheDocument();
      });
    });

    it('displays field-adjacent error for malformed email address', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText('Email Address');
      fireEvent.focus(emailInput);
      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/Please provide a valid email address/i)).toBeInTheDocument();
      });
    });

    it('displays field-adjacent error when passwords do not match and prevents submission', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'SecurePass123!' },
      });
      const confirmInput = screen.getByLabelText('Confirm Password');
      fireEvent.change(confirmInput, {
        target: { value: 'DifferentPass123!' },
      });
      fireEvent.blur(confirmInput);

      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Create Account/i });
      expect(submitButton).toBeDisabled();
    });

    it('successfully creates account, shows genuine success message, and calls register', async () => {
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

      fireEvent.change(screen.getByLabelText('Full Name'), {
        target: { value: 'New User' },
      });
      fireEvent.change(screen.getByLabelText('Email Address'), {
        target: { value: 'newuser@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'ValidPass123!' },
      });
      fireEvent.change(screen.getByLabelText('Confirm Password'), {
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
        expect(screen.getByRole('status')).toHaveTextContent(/Account created successfully! Welcome to AI Resume Reviewer Pro/i);
      });
    });

    it('handles duplicate email registration failure from backend gracefully', async () => {
      vi.spyOn(authService, 'register').mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            detail: {
              error: 'EMAIL_ALREADY_REGISTERED',
              message: 'An account with this email address already exists.',
            },
          },
        },
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Duplicate Tester' } });
      fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'existing@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'ValidPass123!' } });
      fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'ValidPass123!' } });

      const submitButton = screen.getByRole('button', { name: /Create Account/i });
      await waitFor(() => expect(submitButton).not.toBeDisabled());

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/An account with this email address already exists\. Please sign in instead\./i);
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
