import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const isPasswordProvided = password.length > 0;

  const emailError = touched.email && !email.trim()
    ? 'Email address is required.'
    : touched.email && !isEmailValid
    ? 'Please enter a valid email address.'
    : null;

  const passwordError = touched.password && !isPasswordProvided
    ? 'Password is required.'
    : null;

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    setTouched({ email: true, password: true });

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: cleanEmail, password });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      // Safe, generic error message that never reveals whether an email exists
      let message = 'Invalid email address or password. Please try again.';
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail;

        if (status === 401) {
          message = 'Invalid email address or password. Please try again.';
        } else if (status === 429) {
          message = 'Too many sign-in attempts. Please wait a moment and try again.';
        } else if (!err.response) {
          message = (!API_BASE_URL && typeof window !== 'undefined' && window.location.hostname !== 'localhost')
            ? 'Backend API not configured. Please add VITE_API_URL in your Vercel project environment variables.'
            : 'Unable to connect to the authentication server. Please verify your backend server is deployed and running.';
        } else if (typeof detail === 'object' && detail?.message) {
          message = detail.message;
        } else if (typeof detail === 'string') {
          message = detail;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-deep-charcoal border border-borders/60 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-red/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-elevated-surface border border-borders/40 mb-4 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-primary-red" />
          </div>
          <h1 className="text-2xl font-bold text-primary-text tracking-tight">Welcome Back</h1>
          <p className="text-secondary-text text-sm mt-1">
            Sign in to access your secure analysis reports and history
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-primary-red/10 border border-primary-red/30 flex items-start gap-3 text-sm text-bright-red"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Email Address */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-text">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="you@example.com"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'login-email-error' : undefined}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-elevated-surface border text-primary-text placeholder-secondary-text/50 text-sm focus:outline-none transition ${
                  emailError
                    ? 'border-bright-red focus:border-bright-red'
                    : 'border-borders/60 focus:border-primary-red'
                }`}
              />
            </div>
            {emailError && (
              <p id="login-email-error" className="text-xs text-bright-red mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{emailError}</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-secondary-text uppercase tracking-wider"
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-electric-orange hover:text-soft-orange transition font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-text">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                placeholder="••••••••"
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'login-password-error' : undefined}
                className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-elevated-surface border text-primary-text placeholder-secondary-text/50 text-sm focus:outline-none transition ${
                  passwordError
                    ? 'border-bright-red focus:border-bright-red'
                    : 'border-borders/60 focus:border-primary-red'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-secondary-text hover:text-primary-text transition"
                aria-label={showPassword ? 'Hide password text' : 'Show password text'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && (
              <p id="login-password-error" className="text-xs text-bright-red mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{passwordError}</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password}
            className="w-full py-3 px-4 rounded-xl bg-primary-red hover:bg-bright-red text-white font-semibold text-sm shadow-lg shadow-primary-red/25 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-borders/40 text-center">
          <p className="text-secondary-text text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-electric-orange hover:text-soft-orange font-semibold transition">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
