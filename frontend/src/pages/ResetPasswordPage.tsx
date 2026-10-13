import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { authService } from '@/services/authService';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rules = {
    length: newPassword.length >= 8,
    lowercase: /[a-z]/.test(newPassword),
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[\W_]/.test(newPassword),
  };

  const isPasswordValid = Object.values(rules).every(Boolean);
  const doPasswordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Missing password reset token. Please request a new reset link.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Please ensure your password meets all complexity requirements.');
      return;
    }

    if (!doPasswordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({
        token,
        new_password: newPassword,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      let message = 'Failed to reset password. The link may have expired or already been used.';
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'object' && detail?.message) {
          message = detail.message;
        } else if (typeof detail === 'string') {
          message = detail;
        }
      }
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-deep-charcoal border border-borders/60 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-elevated-surface border border-borders/40 mb-4 shadow-inner">
            <Lock className="w-8 h-8 text-primary-red" />
          </div>
          <h1 className="text-2xl font-bold text-primary-text tracking-tight">Set New Password</h1>
          <p className="text-secondary-text text-sm mt-1">
            Choose a strong, secure password for your account
          </p>
        </div>

        {!token && (
          <div className="mb-6 p-4 rounded-xl bg-primary-red/10 border border-primary-red/30 flex items-start gap-3 text-sm text-bright-red">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>
              Invalid or missing reset token. Please check the link from your email or request a new reset link.
            </span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-primary-red/10 border border-primary-red/30 flex items-start gap-3 text-sm text-bright-red"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="text-center space-y-6">
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center gap-3 text-sm text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span>Password successfully updated!</span>
            </div>
            <Link
              to="/login"
              className="inline-block w-full py-3 px-4 rounded-xl bg-primary-red hover:bg-bright-red text-white font-semibold text-sm shadow-lg transition"
            >
              Sign In with New Password
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-4 pr-11 py-2.5 rounded-xl bg-elevated-surface border border-borders/60 text-primary-text placeholder-secondary-text/50 text-sm focus:outline-none focus:border-primary-red transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-secondary-text hover:text-primary-text transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-2.5 rounded-xl bg-elevated-surface border border-borders/60 text-primary-text placeholder-secondary-text/50 text-sm focus:outline-none focus:border-primary-red transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !isPasswordValid || !doPasswordsMatch || !token}
              className="w-full py-3 px-4 rounded-xl bg-primary-red hover:bg-bright-red text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                'Set New Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
