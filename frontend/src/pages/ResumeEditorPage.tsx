import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Save,
  Printer,
  History,
  Plus,
  Trash2,
  RefreshCw,
  RotateCcw,
  Mail,
  FileDown,
  FileText,
  Loader2,
} from 'lucide-react';
import { resumeDocumentService } from '@/services/resumeDocumentService';
import { exportService } from '@/services/exportService';
import {
  ResumeDetail,
  ResumeVersionSummary,
  StructuredResumeData,
} from '@/types/resume';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { EmailModal } from '@/components/ui/EmailModal';

export const ResumeEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [resumeData, setResumeData] = useState<StructuredResumeData>({
    basics: {
      name: '',
      email: '',
      title: '',
      summary: '',
    },
    experience: [],
    skills: [],
    education: [],
  });
  const [templateName, setTemplateName] = useState<string>('modern');
  const [pageFormat, setPageFormat] = useState<string>('letter');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'error'>('info');

  // Save Version Modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [versionNotes, setVersionNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Version History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [versionsList, setVersionsList] = useState<ResumeVersionSummary[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Export & Email State
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);

  // New skill input
  const [newSkill, setNewSkill] = useState<string>('');

  const loadResume = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await resumeDocumentService.getResume(id);
      setResume(data);
      if (data.current_version) {
        setResumeData(data.current_version.resume_data || { basics: { name: '', email: '' } });
        setTemplateName(data.current_version.template_name || 'modern');
        setPageFormat(data.current_version.page_format || 'letter');
      }
    } catch (err: unknown) {
      let msg = 'Failed to load resume document.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadResume();
  }, [loadResume]);

  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSaving(true);
    try {
      const newVersion = await resumeDocumentService.createVersion(id, {
        resume_data: resumeData,
        template_name: templateName,
        page_format: pageFormat,
        version_notes: versionNotes.trim() || 'Updated content',
      });
      setIsSaveModalOpen(false);
      setVersionNotes('');
      setToastMessage(`Saved snapshot as Version ${newVersion.version_number}.`);
      setToastType('success');
      loadResume();
    } catch (err: unknown) {
      let msg = 'Failed to save version snapshot.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!id) return;
    setIsExportingPdf(true);
    try {
      await exportService.downloadUnsavedResumePdf(id, {
        resume_data: resumeData,
        template_name: templateName,
        page_format: pageFormat === 'a4' ? 'a4' : 'letter',
      });
      setToastMessage('Resume PDF generated and downloaded successfully.');
      setToastType('success');
    } catch (err: unknown) {
      let msg = 'Failed to generate resume PDF.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportDocx = async () => {
    if (!id) return;
    setIsExportingDocx(true);
    try {
      await exportService.downloadUnsavedResumeDocx(id, {
        resume_data: resumeData,
        template_name: templateName,
        page_format: pageFormat === 'a4' ? 'a4' : 'letter',
      });
      setToastMessage('Resume Word DOCX generated and downloaded successfully.');
      setToastType('success');
    } catch (err: unknown) {
      let msg = 'Failed to generate resume DOCX.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleOpenHistory = async () => {
    if (!id) return;
    setIsHistoryModalOpen(true);
    setIsLoadingVersions(true);
    try {
      const list = await resumeDocumentService.listVersions(id);
      setVersionsList(list);
    } catch (err: unknown) {
      let msg = 'Failed to fetch version history.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!id) return;
    setIsRestoring(true);
    try {
      await resumeDocumentService.restoreVersion(id, versionId);
      setToastMessage('Restored historical version snapshot.');
      setToastType('success');
      setIsHistoryModalOpen(false);
      loadResume();
    } catch (err: unknown) {
      let msg = 'Failed to restore version.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Field helpers
  const handleBasicsChange = (field: keyof typeof resumeData.basics, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      basics: { ...prev.basics, [field]: value },
    }));
  };

  const handleAddExperience = () => {
    setResumeData((prev) => ({
      ...prev,
      experience: [
        ...(prev.experience || []),
        {
          id: Date.now().toString(),
          company: '',
          position: '',
          startDate: '',
          endDate: 'Present',
          highlights: [''],
        },
      ],
    }));
  };

  const handleRemoveExperience = (idx: number) => {
    setResumeData((prev) => ({
      ...prev,
      experience: (prev.experience || []).filter((_, i) => i !== idx),
    }));
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!(resumeData.skills || []).includes(newSkill.trim())) {
      setResumeData((prev) => ({
        ...prev,
        skills: [...(prev.skills || []), newSkill.trim()],
      }));
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setResumeData((prev) => ({
      ...prev,
      skills: (prev.skills || []).filter((s) => s !== skillToRemove),
    }));
  };

  const handleAddEducation = () => {
    setResumeData((prev) => ({
      ...prev,
      education: [
        ...(prev.education || []),
        {
          id: Date.now().toString(),
          institution: '',
          area: '',
          studyType: 'B.S.',
          startDate: '',
          endDate: '',
        },
      ],
    }));
  };

  const handleRemoveEducation = (idx: number) => {
    setResumeData((prev) => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== idx),
    }));
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-[#FF7417] animate-spin mx-auto" />
        <p className="text-sm text-[#A1A1AA]">Loading resume document...</p>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="py-24 text-center space-y-4">
        <p className="text-sm text-[#A1A1AA]">Resume not found.</p>
        <SecondaryButton onClick={() => navigate('/resumes')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Back to Library</span>
        </SecondaryButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#303038]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/resumes')}
            className="p-2 rounded-xl text-[#A1A1AA] hover:text-[#F7F7FA] hover:bg-[#1C1C23] border border-[#303038] transition-colors"
            title="Back to Resumes"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#F7F7FA]">{resume.title}</h1>
              {resume.current_version && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1C1C23] text-[#FF9B45] border border-[#303038] font-mono">
                  v{resume.current_version.version_number}
                </span>
              )}
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Target Role:{' '}
              <span className="text-[#FF7417] font-semibold">{resume.target_role}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Template Selector */}
          <select
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="bg-[#141419] border border-[#303038] text-xs text-[#F7F7FA] rounded-xl px-3 py-2 focus:outline-none focus:border-[#FF7417]"
          >
            <option value="modern">Modern Theme</option>
            <option value="classic">Classic Theme</option>
            <option value="minimal">Minimal Theme</option>
            <option value="technical">Technical Theme</option>
          </select>

          {/* Page Format */}
          <select
            value={pageFormat}
            onChange={(e) => setPageFormat(e.target.value)}
            className="bg-[#141419] border border-[#303038] text-xs text-[#F7F7FA] rounded-xl px-3 py-2 focus:outline-none focus:border-[#FF7417]"
          >
            <option value="letter">Letter Format</option>
            <option value="a4">A4 Format</option>
          </select>

          {/* Version History Button */}
          <SecondaryButton size="sm" onClick={handleOpenHistory} className="border-[#303038]">
            <History className="w-3.5 h-3.5 text-[#FF7417]" />
            <span className="hidden sm:inline">Versions</span>
          </SecondaryButton>

          {/* Export PDF Button */}
          <SecondaryButton
            size="sm"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="border-[#303038]"
            title="Download text-selectable PDF"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF7417]" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-[#FF7417]" />
            )}
            <span className="hidden md:inline">PDF</span>
          </SecondaryButton>

          {/* Export DOCX Button */}
          <SecondaryButton
            size="sm"
            onClick={handleExportDocx}
            disabled={isExportingDocx}
            className="border-[#303038]"
            title="Download editable Microsoft Word DOCX"
          >
            {isExportingDocx ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF7417]" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-[#FF7417]" />
            )}
            <span className="hidden md:inline">Word</span>
          </SecondaryButton>

          {/* Email Document Button */}
          <SecondaryButton
            size="sm"
            onClick={() => setIsEmailModalOpen(true)}
            className="border-[#303038]"
            title="Email resume attachment"
          >
            <Mail className="w-3.5 h-3.5 text-[#FF7417]" />
            <span className="hidden md:inline">Email</span>
          </SecondaryButton>

          {/* Print Button */}
          <SecondaryButton size="sm" onClick={() => window.print()} className="border-[#303038]">
            <Printer className="w-3.5 h-3.5 text-[#FF7417]" />
            <span className="hidden sm:inline">Print</span>
          </SecondaryButton>

          {/* Save Version */}
          <PrimaryButton size="sm" onClick={() => setIsSaveModalOpen(true)}>
            <Save className="w-3.5 h-3.5" />
            <span>Save Snapshot</span>
          </PrimaryButton>
        </div>
      </div>

      {/* Mobile Tab Toggle */}
      <div className="flex md:hidden items-center p-1 bg-[#141419] rounded-xl border border-[#303038]">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'editor'
              ? 'bg-[#C91432] text-white shadow-sm'
              : 'text-[#A1A1AA] hover:text-[#F7F7FA]'
          }`}
        >
          Edit Form
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'preview'
              ? 'bg-[#C91432] text-white shadow-sm'
              : 'text-[#A1A1AA] hover:text-[#F7F7FA]'
          }`}
        >
          Live Preview
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Editor Pane */}
        <div
          className={`space-y-6 ${
            activeTab === 'preview' ? 'hidden md:block' : 'block'
          }`}
        >
          {/* Section: Basics */}
          <div className="p-5 rounded-2xl bg-[#141419] border border-[#303038] space-y-4">
            <h2 className="text-sm font-bold text-[#F7F7FA] uppercase font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF7417]" />
              Personal & Contact Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={resumeData.basics.name}
                  onChange={(e) => handleBasicsChange('name', e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 bg-[#0B0B0E] border border-[#303038] rounded-xl text-xs text-[#F7F7FA] focus:outline-none focus:border-[#FF7417]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                  Professional Title
                </label>
                <input
                  type="text"
                  value={resumeData.basics.title || ''}
                  onChange={(e) => handleBasicsChange('title', e.target.value)}
                  placeholder="Senior AI Engineer"
                  className="w-full px-3 py-2 bg-[#0B0B0E] border border-[#303038] rounded-xl text-xs text-[#F7F7FA] focus:outline-none focus:border-[#FF7417]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={resumeData.basics.email}
                  onChange={(e) => handleBasicsChange('email', e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-3 py-2 bg-[#0B0B0E] border border-[#303038] rounded-xl text-xs text-[#F7F7FA] focus:outline-none focus:border-[#FF7417]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={resumeData.basics.phone || ''}
                  onChange={(e) => handleBasicsChange('phone', e.target.value)}
                  placeholder="+1 (555) 0199"
                  className="w-full px-3 py-2 bg-[#0B0B0E] border border-[#303038] rounded-xl text-xs text-[#F7F7FA] focus:outline-none focus:border-[#FF7417]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={resumeData.basics.location || ''}
                  onChange={(e) => handleBasicsChange('location', e.target.value)}
                  placeholder="San Francisco, CA"
                  className="w-full px-3 py-2 bg-[#0B0B0E] border border-[#303038] rounded-xl text-xs text-[#F7F7FA] focus:outline-none focus:border-[#FF7417]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="text"
                  value={resumeData.basics.linkedin || ''}
                  onChange={(e) => handleBasicsChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/janedoe"
                  className="w-full px-3 py-2 bg-[#0B0B0E] border border-[#303038] rounded-xl text-xs text-[#F7F7FA] focus:outline-none focus:border-[#FF7417]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                Executive Professional Summary
              </label>
              <textarea
                rows={3}
                value={resumeData.basics.summary || ''}
                onChange={(e) => handleBasicsChange('summary', e.target.value)}
                placeholder="High-impact engineering leader specializing in scalable machine learning systems..."
                className="w-full px-3 py-2 bg-[#0B0B0E] border border-[#303038] rounded-xl text-xs text-[#F7F7FA] focus:outline-none focus:border-[#FF7417] resize-y"
              />
            </div>
          </div>

          {/* Section: Work Experience */}
          <div className="p-5 rounded-2xl bg-[#141419] border border-[#303038] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#F7F7FA] uppercase font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C91432]" />
                Work Experience
              </h2>
              <button
                type="button"
                onClick={handleAddExperience}
                className="text-xs text-[#FF7417] hover:text-[#FF9B45] flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Position</span>
              </button>
            </div>

            {(!resumeData.experience || resumeData.experience.length === 0) && (
              <p className="text-xs text-[#A1A1AA] italic">No work positions added yet.</p>
            )}

            <div className="space-y-4">
              {(resumeData.experience || []).map((exp, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-3 relative group"
                >
                  <button
                    type="button"
                    onClick={() => handleRemoveExperience(idx)}
                    className="absolute top-3 right-3 text-[#A1A1AA] hover:text-rose-400 p-1 rounded-lg"
                    title="Remove Position"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                    <div>
                      <label className="block text-[10px] text-[#A1A1AA] uppercase font-mono mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => {
                          const updated = [...(resumeData.experience || [])];
                          updated[idx].company = e.target.value;
                          setResumeData({ ...resumeData, experience: updated });
                        }}
                        placeholder="Company Inc."
                        className="w-full px-3 py-1.5 bg-[#141419] border border-[#303038] rounded-lg text-xs text-[#F7F7FA]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#A1A1AA] uppercase font-mono mb-1">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={exp.position}
                        onChange={(e) => {
                          const updated = [...(resumeData.experience || [])];
                          updated[idx].position = e.target.value;
                          setResumeData({ ...resumeData, experience: updated });
                        }}
                        placeholder="Staff Software Engineer"
                        className="w-full px-3 py-1.5 bg-[#141419] border border-[#303038] rounded-lg text-xs text-[#F7F7FA]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#A1A1AA] uppercase font-mono mb-1">
                        Start Date
                      </label>
                      <input
                        type="text"
                        value={exp.startDate}
                        onChange={(e) => {
                          const updated = [...(resumeData.experience || [])];
                          updated[idx].startDate = e.target.value;
                          setResumeData({ ...resumeData, experience: updated });
                        }}
                        placeholder="2021-06"
                        className="w-full px-3 py-1.5 bg-[#141419] border border-[#303038] rounded-lg text-xs text-[#F7F7FA]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#A1A1AA] uppercase font-mono mb-1">
                        End Date
                      </label>
                      <input
                        type="text"
                        value={exp.endDate}
                        onChange={(e) => {
                          const updated = [...(resumeData.experience || [])];
                          updated[idx].endDate = e.target.value;
                          setResumeData({ ...resumeData, experience: updated });
                        }}
                        placeholder="Present"
                        className="w-full px-3 py-1.5 bg-[#141419] border border-[#303038] rounded-lg text-xs text-[#F7F7FA]"
                      />
                    </div>
                  </div>

                  {/* Highlights/Bullets */}
                  <div>
                    <label className="block text-[10px] text-[#A1A1AA] uppercase font-mono mb-1">
                      Key Impact Bullets (one per line)
                    </label>
                    <textarea
                      rows={3}
                      value={(exp.highlights || []).join('\n')}
                      onChange={(e) => {
                        const updated = [...(resumeData.experience || [])];
                        updated[idx].highlights = e.target.value.split('\n');
                        setResumeData({ ...resumeData, experience: updated });
                      }}
                      placeholder="• Engineered high-performance backend pipelines reducing latency by 40%..."
                      className="w-full px-3 py-2 bg-[#141419] border border-[#303038] rounded-lg text-xs text-[#F7F7FA] font-mono leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Skills */}
          <div className="p-5 rounded-2xl bg-[#141419] border border-[#303038] space-y-4">
            <h2 className="text-sm font-bold text-[#F7F7FA] uppercase font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF7417]" />
              Core Competencies & Skills
            </h2>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Type skill (e.g. FastAPI, PyTorch, Docker) and press Add..."
                className="flex-1 px-3 py-2 bg-[#0B0B0E] border border-[#303038] rounded-xl text-xs text-[#F7F7FA] focus:outline-none focus:border-[#FF7417]"
              />
              <SecondaryButton size="sm" onClick={handleAddSkill} className="border-[#303038]">
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </SecondaryButton>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {(resumeData.skills || []).map((skill, sIdx) => (
                <span
                  key={sIdx}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#1C1C23] text-[#F7F7FA] border border-[#303038] flex items-center gap-1.5"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-[#A1A1AA] hover:text-rose-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Section: Education */}
          <div className="p-5 rounded-2xl bg-[#141419] border border-[#303038] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#F7F7FA] uppercase font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C91432]" />
                Education & Credentials
              </h2>
              <button
                type="button"
                onClick={handleAddEducation}
                className="text-xs text-[#FF7417] hover:text-[#FF9B45] flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Degree</span>
              </button>
            </div>

            <div className="space-y-3">
              {(resumeData.education || []).map((edu, eIdx) => (
                <div
                  key={eIdx}
                  className="p-3.5 rounded-xl bg-[#0B0B0E] border border-[#303038] grid grid-cols-1 sm:grid-cols-2 gap-3 relative"
                >
                  <button
                    type="button"
                    onClick={() => handleRemoveEducation(eIdx)}
                    className="absolute top-2 right-2 text-[#A1A1AA] hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div>
                    <label className="block text-[10px] text-[#A1A1AA] uppercase font-mono mb-1">
                      Institution
                    </label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => {
                        const updated = [...(resumeData.education || [])];
                        updated[eIdx].institution = e.target.value;
                        setResumeData({ ...resumeData, education: updated });
                      }}
                      placeholder="Stanford University"
                      className="w-full px-3 py-1.5 bg-[#141419] border border-[#303038] rounded-lg text-xs text-[#F7F7FA]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#A1A1AA] uppercase font-mono mb-1">
                      Degree / Major
                    </label>
                    <input
                      type="text"
                      value={edu.area}
                      onChange={(e) => {
                        const updated = [...(resumeData.education || [])];
                        updated[eIdx].area = e.target.value;
                        setResumeData({ ...resumeData, education: updated });
                      }}
                      placeholder="B.S. Computer Science"
                      className="w-full px-3 py-1.5 bg-[#141419] border border-[#303038] rounded-lg text-xs text-[#F7F7FA]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview Pane */}
        <div
          className={`sticky top-20 ${
            activeTab === 'editor' ? 'hidden md:block' : 'block'
          }`}
        >
          <div className="p-6 sm:p-8 rounded-2xl bg-white text-zinc-900 border border-[#303038] shadow-2xl min-h-[700px] print:m-0 print:p-0 print:border-none print:shadow-none">
            {/* Resume Header */}
            <div className="border-b-2 border-zinc-900 pb-4 mb-4">
              <h1 className="text-2xl font-black tracking-tight uppercase">
                {resumeData.basics.name || 'Candidate Name'}
              </h1>
              <p className="text-sm font-bold text-zinc-700 tracking-wide mt-0.5">
                {resumeData.basics.title || resume.target_role}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 mt-2 font-mono">
                {resumeData.basics.email && <span>{resumeData.basics.email}</span>}
                {resumeData.basics.phone && <span>· {resumeData.basics.phone}</span>}
                {resumeData.basics.location && <span>· {resumeData.basics.location}</span>}
                {resumeData.basics.linkedin && <span>· {resumeData.basics.linkedin}</span>}
              </div>
            </div>

            {/* Summary */}
            {resumeData.basics.summary && (
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-300 pb-1 mb-1.5 font-mono">
                  Executive Summary
                </h3>
                <p className="text-xs text-zinc-700 leading-relaxed">
                  {resumeData.basics.summary}
                </p>
              </div>
            )}

            {/* Experience */}
            {(resumeData.experience || []).length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-300 pb-1 mb-2 font-mono">
                  Professional Experience
                </h3>
                <div className="space-y-3">
                  {resumeData.experience?.map((exp, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between items-baseline font-bold text-zinc-900">
                        <span>
                          {exp.position || 'Position'} —{' '}
                          <span className="font-semibold text-zinc-700">
                            {exp.company || 'Company'}
                          </span>
                        </span>
                        <span className="font-mono text-[11px] text-zinc-500 font-normal">
                          {exp.startDate} – {exp.endDate}
                        </span>
                      </div>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-zinc-700 pl-1">
                        {exp.highlights?.filter(Boolean).map((bullet, bIdx) => (
                          <li key={bIdx} className="leading-snug">
                            {bullet.replace(/^[•\s-]+/, '')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {(resumeData.skills || []).length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-300 pb-1 mb-1.5 font-mono">
                  Technical Expertise
                </h3>
                <p className="text-xs text-zinc-700 leading-relaxed font-mono">
                  {resumeData.skills?.join(' · ')}
                </p>
              </div>
            )}

            {/* Education */}
            {(resumeData.education || []).length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-300 pb-1 mb-2 font-mono">
                  Education
                </h3>
                <div className="space-y-1.5 text-xs text-zinc-800">
                  {resumeData.education?.map((edu, idx) => (
                    <div key={idx} className="flex justify-between items-baseline">
                      <span className="font-bold">
                        {edu.institution}{' '}
                        <span className="font-normal text-zinc-600">
                          {edu.area ? `— ${edu.area}` : ''}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] text-zinc-500">
                        {edu.startDate} – {edu.endDate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Version Modal */}
      {isSaveModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsSaveModalOpen(false)}
          title="Save Immutable Version Snapshot"
          size="md"
        >
          <form onSubmit={handleSaveVersion} className="space-y-4">
            <p className="text-xs text-[#A1A1AA]">
              Saving will create an incremental version snapshot (e.g. Version{' '}
              {(resume.current_version?.version_number || 0) + 1}), preserving your previous version
              snapshots without overwriting them.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase font-mono mb-1.5">
                Version Note / Summary of Changes
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Added distributed systems bullet; updated skills"
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B0B0E] border border-[#303038] rounded-xl text-sm text-[#F7F7FA] focus:outline-none focus:border-[#FF7417]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#303038]">
              <SecondaryButton
                size="sm"
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton size="sm" type="submit" disabled={isSaving || !versionNotes.trim()}>
                {isSaving ? 'Saving...' : 'Save Snapshot'}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Version History Modal */}
      {isHistoryModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsHistoryModalOpen(false)}
          title={`Version History — ${resume.title}`}
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#A1A1AA]">
              Restoring a previous version snapshot creates a new version with the historical content, preserving the full immutable audit trail.
            </p>

            {isLoadingVersions ? (
              <div className="py-8 text-center">
                <RefreshCw className="w-6 h-6 animate-spin text-[#FF7417] mx-auto" />
              </div>
            ) : (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {versionsList.map((ver) => {
                  const isCurrent = ver.id === resume.current_version_id;

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
                      </div>

                      {!isCurrent && (
                        <SecondaryButton
                          size="sm"
                          onClick={() => handleRestoreVersion(ver.id)}
                          disabled={isRestoring}
                          className="text-xs border-[#303038]"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#FF7417]" />
                          <span>Restore</span>
                        </SecondaryButton>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-[#303038] flex justify-end">
              <SecondaryButton size="sm" onClick={() => setIsHistoryModalOpen(false)}>
                Close
              </SecondaryButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Email Delivery Modal */}
      {isEmailModalOpen && resume && (
        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          documentType="resume_pdf"
          documentId={resume.id}
          documentTitle={resume.title}
          versionId={resume.current_version_id}
          unsavedResumeData={resumeData}
          templateName={templateName}
          pageFormat={pageFormat === 'a4' ? 'a4' : 'letter'}
        />
      )}
    </div>
  );
};
