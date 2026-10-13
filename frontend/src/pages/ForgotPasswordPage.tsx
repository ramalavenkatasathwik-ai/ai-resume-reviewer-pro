import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '@/services/authService';
import { KeyRound, Mail, ArrowLeft, Loader2, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isNotConfigured, setIsNotConfigured] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResultMessage(null);
    setIsNotConfigured(false);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.forgotPassword({ email: cleanEmail });
      if (response.status === 'not_configured' || !response.smtp_configured) {
        setIsNotConfigured(true);
        setResultMessage(response.message);
      } else {
        setResultMessage(response.message);
      }
    } catch {
      setErrorMessage('Unable to process password reset request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-deep-charcoal border border-borders/60 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-electric-orange/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-elevated-surface border border-borders/40 mb-4 shadow-inner">
            <KeyRound className="w-8 h-8 text-electric-orange" />
          </div>
          <h1 className="text-2xl font-bold text-primary-text tracking-tight">Reset Password</h1>
          <p className="text-secondary-text text-sm mt-1">
            Request password recovery instructions for your account
          </p>
        </div>

        {/* Clear notice when SMTP is disabled or unconfigured */}
        {isNotConfigured && (
          <div className="mb-6 p-4 rounded-xl bg-electric-orange/10 border border-electric-orange/30 text-sm text-soft-orange space-y-2">
            <div className="flex items-center gap-2 font-semibold text-primary-text">
              <Info className="w-5 h-5 text-electric-orange shrink-0" />
              <span>Email Service Not Configured</span>
            </div>
            <p className="text-xs leading-relaxed text-secondary-text">
              {resultMessage || 'Automated email delivery is currently disabled on this instance.'}
            </p>
            <div className="p-2.5 rounded-lg bg-obsidian-black/50 border border-borders/40 text-xs font-mono text-secondary-text space-y-1">
              <div>Required Environment Variables:</div>
              <div className="text-electric-orange">SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD</div>
            </div>
          </div>
        )}

        {/* Success message when sent */}
        {!isNotConfigured && resultMessage && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-start gap-3 text-sm text-green-400">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{resultMessage}</span>
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

        {!resultMessage && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
                Account Email
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-elevated-surface border border-borders/60 text-primary-text placeholder-secondary-text/50 text-sm focus:outline-none focus:border-electric-orange transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-electric-orange hover:bg-soft-orange text-obsidian-black font-semibold text-sm shadow-lg shadow-electric-orange/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking Configuration...</span>
                </>
              ) : (
                'Send Reset Instructions'
              )}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-borders/40 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-secondary-text hover:text-primary-text transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
