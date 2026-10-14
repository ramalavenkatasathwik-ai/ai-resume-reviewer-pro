import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import {
  UserPlus,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password rules validation
  const rules = {
    length: password.length >= 8 && password.length <= 128,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[\W_]/.test(password),
  };

  const isPasswordValid = Object.values(rules).every(Boolean);
  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const isNameValid = displayName.trim().length >= 2;
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  // Validation helpers for field-adjacent errors
  const nameError = touched.displayName && !isNameValid
    ? 'Full name is required (at least 2 characters).'
    : null;

  const emailError = touched.email && !isEmailValid
    ? 'Please provide a valid email address.'
    : null;

  const passwordError = touched.password && !isPasswordValid
    ? 'Password must meet all complexity requirements.'
    : null;

  const confirmError = touched.confirmPassword && !doPasswordsMatch
    ? 'Passwords do not match.'
    : null;

  const isFormValid = isNameValid && isEmailValid && isPasswordValid && doPasswordsMatch;

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Mark all as touched on submit attempt
    setTouched({
      displayName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!isNameValid) {
      setErrorMessage('Please provide your full name (at least 2 characters).');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!isEmailValid) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Please ensure your password meets all security complexity requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: cleanEmail,
        password,
        display_name: displayName.trim(),
      });

      // Display genuine success message confirmed by the backend
      setSuccessMessage('Account created successfully! Welcome to AI Resume Reviewer Pro.');
      setTimeout(() => {
        navigate('/dashboard', { replace: true, state: { accountCreated: true } });
      }, 1000);
    } catch (err: unknown) {
      let message = 'Registration failed. Please check your information and try again.';
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (err.response?.status === 409) {
          message = 'An account with this email address already exists. Please sign in instead.';
        } else if (err.response?.status === 429) {
          message = 'Too many registration attempts. Please wait a moment and try again.';
        } else if (!err.response) {
          message = (!API_BASE_URL && typeof window !== 'undefined' && window.location.hostname !== 'localhost')
            ? 'Backend API not configured. Please add VITE_API_URL in your Vercel project environment variables.'
            : 'Unable to connect to the server. Please verify your backend server is deployed and running.';
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
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-deep-charcoal border border-borders/60 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-red/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-elevated-surface border border-borders/40 mb-4 shadow-inner">
            <UserPlus className="w-8 h-8 text-primary-red" />
          </div>
          <h1 className="text-2xl font-bold text-primary-text tracking-tight">Create Account</h1>
          <p className="text-secondary-text text-sm mt-1">
            Start analyzing and tracking your career performance
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

        {successMessage && (
          <div
            role="status"
            className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-sm text-emerald-400"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name */}
          <div>
            <label
              htmlFor="register-display-name"
              className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2"
            >
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-text">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                id="register-display-name"
                name="displayName"
                type="text"
                required
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => handleBlur('displayName')}
                placeholder="Jane Doe"
                aria-invalid={!!nameError}
                aria-describedby={nameError ? 'name-error' : undefined}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-elevated-surface border text-primary-text placeholder-secondary-text/50 text-sm focus:outline-none transition ${
                  nameError
                    ? 'border-bright-red focus:border-bright-red'
                    : 'border-borders/60 focus:border-primary-red'
                }`}
              />
            </div>
            {nameError && (
              <p id="name-error" className="text-xs text-bright-red mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{nameError}</span>
              </p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label
              htmlFor="register-email"
              className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-text">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="register-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="you@example.com"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-elevated-surface border text-primary-text placeholder-secondary-text/50 text-sm focus:outline-none transition ${
                  emailError
                    ? 'border-bright-red focus:border-bright-red'
                    : 'border-borders/60 focus:border-primary-red'
                }`}
              />
            </div>
            {emailError && (
              <p id="email-error" className="text-xs text-bright-red mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{emailError}</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="register-password"
              className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-text">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                placeholder="At least 8 characters"
                aria-invalid={!!passwordError}
                aria-describedby="password-rules"
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
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength checklist */}
            <div
              id="password-rules"
              className="mt-3 p-3 rounded-lg bg-elevated-surface/50 border border-borders/30 grid grid-cols-2 gap-1.5 text-xs text-secondary-text"
            >
              <span className={`flex items-center gap-1.5 ${rules.length ? 'text-green-400' : ''}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${rules.length ? 'text-green-400' : 'text-borders'}`} />
                8+ characters
              </span>
              <span className={`flex items-center gap-1.5 ${rules.uppercase ? 'text-green-400' : ''}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${rules.uppercase ? 'text-green-400' : 'text-borders'}`} />
                Uppercase letter
              </span>
              <span className={`flex items-center gap-1.5 ${rules.lowercase ? 'text-green-400' : ''}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${rules.lowercase ? 'text-green-400' : 'text-borders'}`} />
                Lowercase letter
              </span>
              <span className={`flex items-center gap-1.5 ${rules.number ? 'text-green-400' : ''}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${rules.number ? 'text-green-400' : 'text-borders'}`} />
                Number (0-9)
              </span>
              <span className={`flex items-center gap-1.5 col-span-2 ${rules.special ? 'text-green-400' : ''}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${rules.special ? 'text-green-400' : 'text-borders'}`} />
                Special character (!@#$%^&*)
              </span>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="register-confirm-password"
              className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2"
            >
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-text">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                placeholder="Confirm password"
                aria-invalid={!!confirmError}
                aria-describedby={confirmError ? 'confirm-error' : undefined}
                className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-elevated-surface border text-primary-text placeholder-secondary-text/50 text-sm focus:outline-none transition ${
                  confirmError
                    ? 'border-bright-red focus:border-bright-red'
                    : 'border-borders/60 focus:border-primary-red'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-secondary-text hover:text-primary-text transition"
                aria-label={showConfirmPassword ? 'Hide confirm password text' : 'Show confirm password text'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmError && (
              <p id="confirm-error" className="text-xs text-bright-red mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{confirmError}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="w-full py-3 px-4 rounded-xl bg-primary-red hover:bg-bright-red text-white font-semibold text-sm shadow-lg shadow-primary-red/25 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-borders/40 text-center">
          <p className="text-secondary-text text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-electric-orange hover:text-soft-orange font-semibold transition">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
