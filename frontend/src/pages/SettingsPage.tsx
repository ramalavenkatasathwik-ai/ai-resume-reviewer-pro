import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ShieldCheck,
  Check,
  Server,
  Trash2,
  ExternalLink,
  Sliders,
  User as UserIcon,
  Lock,
  KeyRound,
  AlertTriangle,
  Loader2,
  Calendar,
  Mail,
} from 'lucide-react';
import { ApiKeyInput } from '@/components/ui/ApiKeyInput';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Toast } from '@/components/ui/Toast';
import { linkedinService } from '@/services/linkedinService';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'account' | 'byok'>(
    isAuthenticated ? 'account' : 'byok'
  );

  // BYOK States
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('gemini_api_key') || '';
    } catch {
      return '';
    }
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    try {
      return localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
    } catch {
      return 'gemini-2.5-flash';
    }
  });

  const [availableModels, setAvailableModels] = useState<string[]>([
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ]);

  // Account Profile States
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Account Deletion States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (isAuthenticated) {
      setActiveTab('account');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (user?.display_name) {
      setDisplayName(user.display_name);
    }
  }, [user]);

  useEffect(() => {
    linkedinService
      .getSupportedModels()
      .then((res) => {
        if (res.models && res.models.length > 0) {
          setAvailableModels(res.models);
          setSelectedModel((curr) => curr || res.default_model || res.models[0]);
        }
      })
      .catch(() => {
        // Fallback default models already set
      });
  }, []);

  const handleSaveBYOK = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      localStorage.setItem('gemini_model', selectedModel);
      setToastType('success');
      setToastMessage('Preferences and BYOK settings saved locally!');
    } catch {
      setToastType('error');
      setToastMessage('Failed to write settings to local storage.');
    }
  };

  const handleClearBYOK = () => {
    try {
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('gemini_model');
      setApiKey('');
      setSelectedModel('gemini-2.5-flash');
      setToastType('success');
      setToastMessage('Cleared all locally cached keys and preferences.');
    } catch {
      // ignore
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      await updateProfile({ display_name: displayName.trim() || undefined });
      setToastType('success');
      setToastMessage('Profile display name updated successfully.');
    } catch {
      setToastType('error');
      setToastMessage('Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setToastType('success');
      setToastMessage('Password updated successfully.');
    } catch (err: unknown) {
      let msg = 'Failed to change password. Check your current password.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || msg;
      }
      setPasswordError(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm account deletion.');
      return;
    }

    setIsDeletingAccount(true);
    try {
      await authService.deleteAccount({ password: deletePassword });
      await logout();
      setShowDeleteModal(false);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      let msg = 'Incorrect password. Account deletion aborted.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || msg;
      }
      setDeleteError(msg);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Page Header */}
      <div className="pb-6 border-b border-[#303038]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#1C1C23] text-[#FF9B45] border border-[#303038] uppercase font-mono">
            Configuration Hub
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F7F7FA] tracking-tight">
          Application & Account Settings
        </h1>
        <p className="text-sm text-[#A1A1AA] mt-1">
          Manage your account security, personal profile, and client-side Google Gemini BYOK preferences.
        </p>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'account'
                ? 'bg-primary-red text-white shadow-md'
                : 'bg-elevated-surface text-secondary-text hover:text-primary-text border border-borders/60'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Account & Security</span>
          </button>
          <button
            onClick={() => setActiveTab('byok')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'byok'
                ? 'bg-primary-red text-white shadow-md'
                : 'bg-elevated-surface text-secondary-text hover:text-primary-text border border-borders/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>BYOK & AI Preferences</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Account Profile & Security */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {isAuthenticated && user ? (
            <>
              {/* Profile Card */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#141419] border border-[#303038] space-y-6 shadow-xl">
                <div className="flex items-center gap-2 text-base font-bold text-[#F7F7FA] pb-2 border-b border-[#303038]">
                  <UserIcon className="w-4 h-4 text-primary-red" />
                  <span>Personal Account Profile</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038]">
                    <div className="flex items-center gap-1.5 text-secondary-text font-semibold">
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Address</span>
                    </div>
                    <div className="font-mono text-primary-text mt-1 text-sm font-semibold">
                      {user.email}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038]">
                    <div className="flex items-center gap-1.5 text-secondary-text font-semibold">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Member Since</span>
                    </div>
                    <div className="text-primary-text mt-1 text-sm font-medium">
                      {new Date(user.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-secondary-text mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 rounded-xl bg-elevated-surface border border-borders/60 text-primary-text placeholder-secondary-text/50 text-sm focus:outline-none focus:border-primary-red transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="py-2.5 px-4 rounded-xl bg-primary-red hover:bg-bright-red text-white text-xs font-semibold shadow flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Update Name</span>
                  </button>
                </form>
              </div>

              {/* Change Password Card */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#141419] border border-[#303038] space-y-6 shadow-xl">
                <div className="flex items-center gap-2 text-base font-bold text-[#F7F7FA] pb-2 border-b border-[#303038]">
                  <Lock className="w-4 h-4 text-electric-orange" />
                  <span>Change Password</span>
                </div>

                {passwordError && (
                  <div className="p-4 rounded-xl bg-primary-red/10 border border-primary-red/30 text-xs text-bright-red">
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-secondary-text mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-elevated-surface border border-borders/60 text-primary-text text-sm focus:outline-none focus:border-primary-red transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary-text mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full px-4 py-2.5 rounded-xl bg-elevated-surface border border-borders/60 text-primary-text text-sm focus:outline-none focus:border-primary-red transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary-text mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full px-4 py-2.5 rounded-xl bg-elevated-surface border border-borders/60 text-primary-text text-sm focus:outline-none focus:border-primary-red transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword || !currentPassword || !newPassword}
                    className="py-2.5 px-4 rounded-xl bg-electric-orange hover:bg-soft-orange text-obsidian-black text-xs font-semibold shadow flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {isChangingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    <span>Update Password</span>
                  </button>
                </form>
              </div>

              {/* Danger Zone: Account Deletion */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#141419] border border-primary-red/30 space-y-4">
                <div className="flex items-center gap-2 text-base font-bold text-bright-red pb-2 border-b border-primary-red/20">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Danger Zone: Delete Account</span>
                </div>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Permanently deletes your account credentials and cascades all associated personal resume and LinkedIn analysis records. This operation is permanent and cannot be reversed.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="py-2.5 px-4 rounded-xl bg-primary-red/20 hover:bg-primary-red text-bright-red hover:text-white border border-primary-red/40 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete My Account...</span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 rounded-2xl bg-[#141419] border border-[#303038] text-center space-y-4">
              <div className="inline-flex p-3 rounded-xl bg-[#1C1C23] border border-[#303038]">
                <UserIcon className="w-8 h-8 text-secondary-text" />
              </div>
              <h2 className="text-lg font-bold text-primary-text">Sign in to Manage Account</h2>
              <p className="text-xs text-secondary-text max-w-md mx-auto">
                Sign in or register an account to view and update your profile, change your password, and isolate your personal resume review records.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => navigate('/login')}
                  className="py-2.5 px-5 rounded-xl bg-primary-red hover:bg-bright-red text-white text-xs font-semibold shadow transition cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="py-2.5 px-5 rounded-xl bg-elevated-surface hover:bg-[#25252E] text-primary-text border border-borders/60 text-xs font-semibold transition cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BYOK & AI Preferences */}
      {activeTab === 'byok' && (
        <div className="space-y-6">
          {/* BYOK Security Privacy Guarantee */}
          <div className="p-5 rounded-2xl bg-[#141419] border border-[#FF7417]/30 flex items-start gap-4">
            <div className="p-2 rounded-xl bg-[#FF7417]/15 text-[#FF7417] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs text-[#A1A1AA] space-y-1">
              <p className="font-bold text-[#F7F7FA] text-sm">
                Zero-Storage BYOK (Bring Your Own Key) Security
              </p>
              <p className="leading-relaxed">
                Your Google Gemini API key is stored only in your personal browser's local memory/storage and passed via request headers (<code className="text-[#FF7417] font-mono">X-Gemini-API-Key</code>). It is never saved into database tables or log files on our servers.
              </p>
            </div>
          </div>

          {/* Main BYOK Form */}
          <form
            onSubmit={handleSaveBYOK}
            className="p-6 sm:p-8 rounded-2xl bg-[#141419] border border-[#303038] space-y-6 shadow-xl"
          >
            <div className="flex items-center gap-2 text-base font-bold text-[#F7F7FA] pb-2 border-b border-[#303038]">
              <Sliders className="w-4 h-4 text-[#FF7417]" />
              <span>Gemini AI Engine Parameters</span>
            </div>

            {/* API Key Input with Live Validate Probe */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#F7F7FA] mb-2">
                Google Gemini API Key
              </label>
              <ApiKeyInput
                value={apiKey}
                onChange={setApiKey}
                selectedModel={selectedModel}
              />
            </div>

            {/* Model Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#F7F7FA] mb-2">
                Default Evaluation Model
              </label>
              <ModelSelector
                models={availableModels}
                selectedModel={selectedModel}
                onChange={setSelectedModel}
              />
              <p className="text-[11px] text-[#A1A1AA] mt-2">
                <span className="text-[#FF7417] font-semibold">gemini-2.5-flash</span> is recommended for low-latency ATS evaluation. <span className="text-[#FF7417] font-semibold">gemini-1.5-pro</span> provides extended reasoning depth.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-[#303038] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <PrimaryButton variant="crimson" type="submit">
                  <Check className="w-4 h-4" />
                  <span>Save Preferences</span>
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={handleClearBYOK}
                  className="text-[#F04452] hover:border-[#C91432]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Cached Key</span>
                </SecondaryButton>
              </div>

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#FF7417] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get Free Gemini Key</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </form>

          {/* Backend Environment Diagnostics */}
          <div className="p-6 rounded-2xl bg-[#141419] border border-[#303038] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#303038] text-sm font-bold text-[#F7F7FA]">
              <Server className="w-4 h-4 text-[#FF7417]" />
              <span>System Environment Diagnostics</span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038]">
                <dt className="text-[#A1A1AA] font-semibold">Frontend Origin</dt>
                <dd className="font-mono text-[#F7F7FA] mt-1 break-all">
                  {window.location.origin}
                </dd>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038]">
                <dt className="text-[#A1A1AA] font-semibold">Backend Target Endpoint</dt>
                <dd className="font-mono text-[#F7F7FA] mt-1 break-all">
                  {import.meta.env.VITE_API_URL || '(Proxy to backend via /api)'}
                </dd>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038]">
                <dt className="text-[#A1A1AA] font-semibold">Architecture</dt>
                <dd className="font-mono text-[#FF9B45] mt-1">
                  FastAPI + React 18 + PostgreSQL + BYOK Gemini
                </dd>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038]">
                <dt className="text-[#A1A1AA] font-semibold">Release Version</dt>
                <dd className="font-mono text-emerald-400 mt-1">
                  v2.2.0-auth-production
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-deep-charcoal border border-primary-red/50 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-bright-red">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold">Permanently Delete Account?</h3>
            </div>

            <p className="text-xs text-secondary-text leading-relaxed">
              This action cannot be undone. Your user profile, credentials, and all personal analysis records will be permanently erased.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-primary-red/10 border border-primary-red/30 text-xs text-bright-red">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
                  Confirm Password to Proceed
                </label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full px-4 py-2.5 rounded-xl bg-elevated-surface border border-borders/60 text-primary-text text-sm focus:outline-none focus:border-primary-red transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary-text hover:text-primary-text bg-elevated-surface border border-borders/60 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeletingAccount || !deletePassword}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary-red hover:bg-bright-red text-white flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isDeletingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Account Deletion</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
