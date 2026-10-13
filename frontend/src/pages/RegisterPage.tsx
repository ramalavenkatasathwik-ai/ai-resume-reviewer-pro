import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { UserPlus, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time password validation indicators
  const rules = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[\W_]/.test(password),
  };

  const isPasswordValid = Object.values(rules).every(Boolean);
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
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
        display_name: displayName.trim() || undefined,
      });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      let message = 'Registration failed. Please check your information and try again.';
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
              Full Name <span className="text-secondary-text/50 lowercase">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-text">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-elevated-surface border border-borders/60 text-primary-text placeholder-secondary-text/50 text-sm focus:outline-none focus:border-primary-red transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-text">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-elevated-surface border border-borders/60 text-primary-text placeholder-secondary-text/50 text-sm focus:outline-none focus:border-primary-red transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-text">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-elevated-surface border border-borders/60 text-primary-text placeholder-secondary-text/50 text-sm focus:outline-none focus:border-primary-red transition"
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
            <div className="mt-3 p-3 rounded-lg bg-elevated-surface/50 border border-borders/30 grid grid-cols-2 gap-1.5 text-xs text-secondary-text">
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

          <div>
            <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-text">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-elevated-surface border text-primary-text placeholder-secondary-text/50 text-sm focus:outline-none transition ${
                  confirmPassword && !doPasswordsMatch
                    ? 'border-bright-red focus:border-bright-red'
                    : 'border-borders/60 focus:border-primary-red'
                }`}
              />
            </div>
            {confirmPassword && !doPasswordsMatch && (
              <p className="text-xs text-bright-red mt-1">Passwords do not match.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
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
