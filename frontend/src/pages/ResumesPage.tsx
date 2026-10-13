import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Copy,
  Edit2,
  Trash2,
  History,
  Archive,
  Calendar,
  Layers,
  RotateCcw,
  Briefcase,
  Mail,
  FileDown,
  Loader2,
} from 'lucide-react';
import { resumeDocumentService } from '@/services/resumeDocumentService';
import { exportService } from '@/services/exportService';
import { ResumeSummary, ResumeVersionSummary } from '@/types/resume';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { EmailModal } from '@/components/ui/EmailModal';

export const ResumesPage: React.FC = () => {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [search, setSearch] = useState<string>('');
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'error'>('info');

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('AI Developer');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  // Rename/Edit Modal
  const [editingResume, setEditingResume] = useState<ResumeSummary | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editRole, setEditRole] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // Versions Modal
  const [versionResume, setVersionResume] = useState<ResumeSummary | null>(null);
  const [versionsList, setVersionsList] = useState<ResumeVersionSummary[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  // Delete Modal
  const [resumeToDelete, setResumeToDelete] = useState<ResumeSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Export & Email State
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<string | null>(null);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState<string | null>(null);
  const [emailResumeData, setEmailResumeData] = useState<{ id: string; title: string; versionId?: string } | null>(null);

  const handleDownloadPdf = async (resumeId: string, versionId: string) => {
    setIsDownloadingPdf(versionId);
    try {
      await exportService.downloadResumeVersionPdf(resumeId, versionId);
      setToastMessage('Resume PDF downloaded successfully.');
      setToastType('success');
    } catch (err: unknown) {
      let msg = 'Failed to download resume PDF.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsDownloadingPdf(null);
    }
  };

  const handleDownloadDocx = async (resumeId: string, versionId: string) => {
    setIsDownloadingDocx(versionId);
    try {
      await exportService.downloadResumeVersionDocx(resumeId, versionId);
      setToastMessage('Resume Word DOCX downloaded successfully.');
      setToastType('success');
    } catch (err: unknown) {
      let msg = 'Failed to download Word DOCX.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsDownloadingDocx(null);
    }
  };

  const fetchResumes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await resumeDocumentService.listResumes(search, showArchived);
      setResumes(data);
    } catch (err: unknown) {
      let msg = 'Failed to load resumes from database.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsLoading(false);
    }
  }, [search, showArchived]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmittingCreate(true);
    try {
      const created = await resumeDocumentService.createResume({
        title: newTitle.trim(),
        target_role: newRole.trim() || 'AI Developer',
        resume_data: {
          basics: {
            name: 'Your Name',
            email: 'email@example.com',
            title: newRole.trim() || 'AI Developer',
            summary: 'Experienced professional dedicated to building high-impact software systems.',
          },
          experience: [],
          skills: ['Python', 'TypeScript', 'System Architecture'],
          education: [],
        },
        template_name: 'modern',
        page_format: 'letter',
        version_notes: 'Initial version',
      });
      setIsCreateOpen(false);
      setNewTitle('');
      setToastMessage('New resume document initialized.');
      setToastType('success');
      navigate(`/resumes/${created.id}`);
    } catch (err: unknown) {
      let msg = 'Failed to create resume.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResume) return;

    setIsSubmittingEdit(true);
    try {
      await resumeDocumentService.updateResume(editingResume.id, {
        title: editTitle.trim(),
        target_role: editRole.trim(),
      });
      setToastMessage('Resume details updated.');
      setToastType('success');
      setEditingResume(null);
      fetchResumes();
    } catch (err: unknown) {
      let msg = 'Failed to update resume.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDuplicate = async (resume: ResumeSummary) => {
    try {
      const dup = await resumeDocumentService.duplicateResume(resume.id);
      setToastMessage(`Created copy "${dup.title}".`);
      setToastType('success');
      fetchResumes();
    } catch (err: unknown) {
      let msg = 'Failed to duplicate resume.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    }
  };

  const handleToggleArchive = async (resume: ResumeSummary) => {
    try {
      await resumeDocumentService.updateResume(resume.id, {
        is_archived: !resume.is_archived,
      });
      setToastMessage(
        resume.is_archived ? 'Resume unarchived.' : 'Resume moved to archive.'
      );
      setToastType('info');
      fetchResumes();
    } catch (err: unknown) {
      let msg = 'Failed to change archive status.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    }
  };

  const handleOpenVersions = async (resume: ResumeSummary) => {
    setVersionResume(resume);
    setIsLoadingVersions(true);
    try {
      const versions = await resumeDocumentService.listVersions(resume.id);
      setVersionsList(versions);
    } catch (err: unknown) {
      let msg = 'Failed to load version history.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
      setVersionResume(null);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!versionResume) return;
    setRestoringVersionId(versionId);
    try {
      await resumeDocumentService.restoreVersion(versionResume.id, versionId);
      setToastMessage('Restored historical version into new active version snapshot.');
      setToastType('success');
      const updatedVersions = await resumeDocumentService.listVersions(versionResume.id);
      setVersionsList(updatedVersions);
      fetchResumes();
    } catch (err: unknown) {
      let msg = 'Failed to restore version.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setRestoringVersionId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!resumeToDelete) return;
    setIsDeleting(true);
    try {
      await resumeDocumentService.deleteResume(resumeToDelete.id);
      setToastMessage('Resume document deleted successfully.');
      setToastType('success');
      setResumeToDelete(null);
      fetchResumes();
    } catch (err: unknown) {
      let msg = 'Failed to delete resume.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#303038]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#1C1C23] text-[#FF9B45] border border-[#303038] uppercase font-mono">
              Resume Library
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F7F7FA] tracking-tight">
            My Resumes
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Manage your tailored resumes, track incremental version snapshots, and branch customized iterations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PrimaryButton size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            <span>Create New Resume</span>
          </PrimaryButton>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 rounded-2xl bg-[#141419] border border-[#303038] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search resumes by title or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0B0B0E] border border-[#303038] rounded-xl text-sm text-[#F7F7FA] placeholder-[#A1A1AA] focus:outline-none focus:border-[#FF7417] transition-colors"
          />
        </div>

        {/* Archive toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              !showArchived
                ? 'bg-[#C91432] text-white shadow-sm font-semibold'
                : 'text-[#A1A1AA] hover:text-[#F7F7FA] bg-[#1C1C23]'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              showArchived
                ? 'bg-[#C91432] text-white shadow-sm font-semibold'
                : 'text-[#A1A1AA] hover:text-[#F7F7FA] bg-[#1C1C23]'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Resumes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[#141419] border border-[#303038] animate-pulse space-y-4"
            >
              <div className="h-4 bg-[#1C1C23] rounded w-3/4" />
              <div className="h-3 bg-[#1C1C23] rounded w-1/2" />
              <div className="h-20 bg-[#1C1C23] rounded" />
            </div>
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-[#141419] border border-[#303038]">
          <div className="w-12 h-12 rounded-xl bg-[#1C1C23] border border-[#303038] mx-auto flex items-center justify-center text-[#A1A1AA] mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#F7F7FA] mb-1">No Resumes Found</h3>
          <p className="text-xs text-[#A1A1AA] max-w-md mx-auto mb-6">
            {search
              ? 'No resumes match your search query.'
              : showArchived
              ? 'No archived resumes found.'
              : 'Create your first structured resume or import from an analysis report.'}
          </p>
          {!showArchived && (
            <PrimaryButton size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              <span>Create Resume Now</span>
            </PrimaryButton>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="p-5 rounded-2xl bg-[#141419] border border-[#303038] hover:border-[#FF7417]/40 transition-all flex flex-col justify-between group shadow-sm"
            >
              <div className="space-y-3">
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#1C1C23] text-[#A1A1AA] border border-[#303038]">
                    <Layers className="w-3.5 h-3.5 text-[#FF7417]" />
                    <span>v{resume.versions_count} Snapshot</span>
                  </span>

                  {resume.is_archived && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Archived
                    </span>
                  )}
                </div>

                {/* Title & Role */}
                <div>
                  <h3
                    className="font-bold text-[#F7F7FA] text-base truncate group-hover:text-[#FF9B45] transition-colors cursor-pointer"
                    onClick={() => navigate(`/resumes/${resume.id}`)}
                    title={resume.title}
                  >
                    {resume.title}
                  </h3>
                  <p className="text-xs text-[#FF7417] font-medium mt-0.5 truncate">
                    {resume.target_role}
                  </p>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-[11px] text-[#A1A1AA] pt-2 border-t border-[#303038]/60">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#A1A1AA]" />
                    Modified {formatDate(resume.updated_at)}
                  </span>
                  <span className="font-mono text-[10px] text-[#A1A1AA]">
                    {resume.versions_count} {resume.versions_count === 1 ? 'version' : 'versions'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-[#303038] flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <PrimaryButton
                    size="sm"
                    onClick={() => navigate(`/resumes/${resume.id}`)}
                    className="flex-1 text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Open Editor</span>
                  </PrimaryButton>

                  <SecondaryButton
                    size="sm"
                    onClick={() => navigate(`/job-match?resume_id=${resume.id}`)}
                    className="text-xs border-[#303038]"
                    title="Match with Job Description"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-[#FF7417]" />
                  </SecondaryButton>

                  <SecondaryButton
                    size="sm"
                    onClick={() => handleOpenVersions(resume)}
                    className="text-xs border-[#303038]"
                    title="Version History"
                  >
                    <History className="w-3.5 h-3.5 text-[#A1A1AA]" />
                  </SecondaryButton>

                  {resume.current_version_id && (
                    <button
                      onClick={() => handleDownloadPdf(resume.id, resume.current_version_id!)}
                      disabled={isDownloadingPdf === resume.current_version_id}
                      className="p-2 rounded-xl text-xs text-[#A1A1AA] hover:text-[#FF7417] hover:bg-[#1C1C23] border border-[#303038] transition-colors disabled:opacity-50"
                      title="Download PDF"
                    >
                      {isDownloadingPdf === resume.current_version_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF7417]" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  {resume.current_version_id && (
                    <button
                      onClick={() => handleDownloadDocx(resume.id, resume.current_version_id!)}
                      disabled={isDownloadingDocx === resume.current_version_id}
                      className="p-2 rounded-xl text-xs text-[#A1A1AA] hover:text-[#FF7417] hover:bg-[#1C1C23] border border-[#303038] transition-colors disabled:opacity-50"
                      title="Download Word DOCX"
                    >
                      {isDownloadingDocx === resume.current_version_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF7417]" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  {resume.current_version_id && (
                    <button
                      onClick={() =>
                        setEmailResumeData({
                          id: resume.id,
                          title: resume.title,
                          versionId: resume.current_version_id || undefined,
                        })
                      }
                      className="p-2 rounded-xl text-xs text-[#A1A1AA] hover:text-[#FF7417] hover:bg-[#1C1C23] border border-[#303038] transition-colors"
                      title="Email Resume"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1 pt-1">
                  <button
                    onClick={() => handleDuplicate(resume)}
                    className="p-1.5 rounded-lg text-xs text-[#A1A1AA] hover:text-[#F7F7FA] hover:bg-[#1C1C23] flex items-center gap-1 transition-colors"
                    title="Duplicate Resume"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#FF7417]" />
                    <span>Clone</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingResume(resume);
                      setEditTitle(resume.title);
                      setEditRole(resume.target_role);
                    }}
                    className="p-1.5 rounded-lg text-xs text-[#A1A1AA] hover:text-[#F7F7FA] hover:bg-[#1C1C23] flex items-center gap-1 transition-colors"
                    title="Rename"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#A1A1AA]" />
                    <span>Rename</span>
                  </button>

                  <button
                    onClick={() => handleToggleArchive(resume)}
                    className="p-1.5 rounded-lg text-xs text-[#A1A1AA] hover:text-amber-400 hover:bg-[#1C1C23] flex items-center gap-1 transition-colors"
                    title={resume.is_archived ? 'Restore from Archive' : 'Archive'}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{resume.is_archived ? 'Unarchive' : 'Archive'}</span>
                  </button>

                  <button
                    onClick={() => setResumeToDelete(resume)}
                    className="p-1.5 rounded-lg text-xs text-[#A1A1AA] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Resume"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCreateOpen(false)}
          title="Create New Resume Document"
          size="md"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase font-mono mb-1.5">
                Resume Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Machine Learning Engineer"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B0B0E] border border-[#303038] rounded-xl text-sm text-[#F7F7FA] focus:outline-none focus:border-[#FF7417]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase font-mono mb-1.5">
                Target Job Role
              </label>
              <input
                type="text"
                required
                placeholder="e.g. AI Developer"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B0B0E] border border-[#303038] rounded-xl text-sm text-[#F7F7FA] focus:outline-none focus:border-[#FF7417]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#303038]">
              <SecondaryButton
                size="sm"
                type="button"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmittingCreate}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton size="sm" type="submit" disabled={isSubmittingCreate || !newTitle.trim()}>
                {isSubmittingCreate ? 'Creating...' : 'Create & Open Editor'}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Rename Modal */}
      {editingResume && (
        <Modal
          isOpen={true}
          onClose={() => setEditingResume(null)}
          title="Edit Resume Details"
          size="md"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase font-mono mb-1.5">
                Title
              </label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B0B0E] border border-[#303038] rounded-xl text-sm text-[#F7F7FA] focus:outline-none focus:border-[#FF7417]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase font-mono mb-1.5">
                Target Role
              </label>
              <input
                type="text"
                required
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B0B0E] border border-[#303038] rounded-xl text-sm text-[#F7F7FA] focus:outline-none focus:border-[#FF7417]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#303038]">
              <SecondaryButton
                size="sm"
                type="button"
                onClick={() => setEditingResume(null)}
                disabled={isSubmittingEdit}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton size="sm" type="submit" disabled={isSubmittingEdit || !editTitle.trim()}>
                {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Versions Modal */}
      {versionResume && (
        <Modal
          isOpen={true}
          onClose={() => setVersionResume(null)}
          title={`Version History — ${versionResume.title}`}
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#A1A1AA]">
              Every edit snapshot is stored as an immutable audit record. Restoring a version creates a new incremented version, keeping previous history completely intact.
            </p>

            {isLoadingVersions ? (
              <div className="py-8 text-center">
                <RefreshCw className="w-6 h-6 animate-spin text-[#FF7417] mx-auto" />
              </div>
            ) : versionsList.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#A1A1AA]">No versions recorded yet.</div>
            ) : (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {versionsList.map((ver) => {
                  const isCurrent = ver.id === versionResume.current_version_id;

                  return (
                    <div
                      key={ver.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-[#1C1C23] border-[#FF7417]/50'
                          : 'bg-[#0B0B0E] border-[#303038]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#F7F7FA]">
                            Version {ver.version_number}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 font-mono">
                              ACTIVE
                            </span>
                          )}
                          <span className="text-[11px] text-[#A1A1AA] uppercase font-mono">
                            {ver.template_name} · {ver.page_format}
                          </span>
                        </div>
                        <p className="text-xs text-[#A1A1AA]">
                          {ver.version_notes || 'No description entered.'}
                        </p>
                        <div className="text-[10px] text-[#A1A1AA] font-mono">
                          {formatDate(ver.created_at)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDownloadPdf(versionResume.id, ver.id)}
                          disabled={isDownloadingPdf === ver.id}
                          className="p-1.5 rounded-lg text-xs text-[#A1A1AA] hover:text-[#FF7417] hover:bg-[#1C1C23] border border-[#303038] transition-colors disabled:opacity-50"
                          title="Download PDF version snapshot"
                        >
                          {isDownloadingPdf === ver.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF7417]" />
                          ) : (
                            <FileDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDownloadDocx(versionResume.id, ver.id)}
                          disabled={isDownloadingDocx === ver.id}
                          className="p-1.5 rounded-lg text-xs text-[#A1A1AA] hover:text-[#FF7417] hover:bg-[#1C1C23] border border-[#303038] transition-colors disabled:opacity-50"
                          title="Download Word DOCX version snapshot"
                        >
                          {isDownloadingDocx === ver.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF7417]" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            setEmailResumeData({
                              id: versionResume.id,
                              title: `${versionResume.title} (v${ver.version_number})`,
                              versionId: ver.id,
                            })
                          }
                          className="p-1.5 rounded-lg text-xs text-[#A1A1AA] hover:text-[#FF7417] hover:bg-[#1C1C23] border border-[#303038] transition-colors"
                          title="Email version snapshot"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        {!isCurrent && (
                          <SecondaryButton
                            size="sm"
                            onClick={() => handleRestoreVersion(ver.id)}
                            disabled={restoringVersionId === ver.id}
                            className="text-xs border-[#303038]"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#FF7417]" />
                            <span>
                              {restoringVersionId === ver.id ? 'Restoring...' : 'Restore'}
                            </span>
                          </SecondaryButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-[#303038] flex justify-end">
              <SecondaryButton size="sm" onClick={() => setVersionResume(null)}>
                Close
              </SecondaryButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {resumeToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setResumeToDelete(null)}
          title="Delete Resume Document"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-[#A1A1AA]">
              Are you sure you want to delete{' '}
              <span className="text-[#F7F7FA] font-semibold">
                "{resumeToDelete.title}"
              </span>{' '}
              and all of its version history? This action cannot be reversed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#303038]">
              <SecondaryButton
                size="sm"
                onClick={() => setResumeToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </SecondaryButton>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Resume'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Email Resume Modal */}
      {emailResumeData && (
        <EmailModal
          isOpen={!!emailResumeData}
          onClose={() => setEmailResumeData(null)}
          documentType="resume_pdf"
          documentId={emailResumeData.id}
          documentTitle={emailResumeData.title}
          versionId={emailResumeData.versionId}
        />
      )}
    </div>
  );
};
