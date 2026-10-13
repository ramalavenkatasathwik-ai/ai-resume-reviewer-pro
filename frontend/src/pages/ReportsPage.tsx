import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  FileBarChart2,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  FileText,
  Globe,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Mail,
  FileDown,
  Loader2,
} from 'lucide-react';
import { analysisReportService } from '@/services/analysisReportService';
import { exportService } from '@/services/exportService';
import { AnalysisReportSummary, AnalysisReportDetail } from '@/types/analysisReport';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { EmailModal } from '@/components/ui/EmailModal';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<AnalysisReportSummary[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'error'>('info');

  // Selected report for view modal
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<AnalysisReportDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Delete modal state
  const [reportToDelete, setReportToDelete] = useState<AnalysisReportSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Export & Email state
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [emailReport, setEmailReport] = useState<{ id: string; title: string } | null>(null);

  const handleDownloadPdf = async (reportId: string) => {
    setIsDownloadingPdf(true);
    try {
      await exportService.downloadAnalysisReportPdf(reportId);
      setToastMessage('Analysis report PDF downloaded successfully.');
      setToastType('success');
    } catch (err: unknown) {
      let msg = 'Failed to download analysis report PDF.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await analysisReportService.listAnalyses({
        page,
        pageSize: 9,
        search,
        analysisType: typeFilter,
        sourceType: sourceFilter,
        status: statusFilter,
      });
      setReports(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err: unknown) {
      let msg = 'Failed to load analysis reports.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, typeFilter, sourceFilter, statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleOpenDetail = async (reportId: string) => {
    setSelectedReportId(reportId);
    setIsLoadingDetail(true);
    try {
      const detail = await analysisReportService.getById(reportId);
      setSelectedReport(detail);
    } catch (err: unknown) {
      let msg = 'Failed to load report details.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
      setSelectedReportId(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    try {
      await analysisReportService.deleteReport(reportToDelete.id);
      setToastMessage('Analysis report deleted successfully.');
      setToastType('success');
      setReportToDelete(null);
      if (selectedReportId === reportToDelete.id) {
        setSelectedReportId(null);
        setSelectedReport(null);
      }
      fetchReports();
    } catch (err: unknown) {
      let msg = 'Failed to delete analysis report.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail?.message || err.message || msg;
      }
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsDeleting(false);
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'url':
        return <Globe className="w-3.5 h-3.5 text-[#FF7417]" />;
      case 'text':
        return <FileText className="w-3.5 h-3.5 text-[#FF9B45]" />;
      default:
        return <FileBarChart2 className="w-3.5 h-3.5 text-[#F04452]" />;
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#303038]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#1C1C23] text-[#FF9B45] border border-[#303038] uppercase font-mono">
              Persistent Records
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F7F7FA] tracking-tight">
            My Analysis Reports
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Review past resume evaluations, LinkedIn audits, scoring breakdowns, and ATS feedback.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SecondaryButton
            size="sm"
            onClick={() => fetchReports()}
            disabled={isLoading}
            className="border-[#303038]"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#FF7417] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </SecondaryButton>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#141419] border border-[#303038] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, role, or filename..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-[#0B0B0E] border border-[#303038] rounded-xl text-sm text-[#F7F7FA] placeholder-[#A1A1AA] focus:outline-none focus:border-[#FF7417] transition-colors"
          />
        </div>

        {/* Filter selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Analysis Type */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#0B0B0E] border border-[#303038] text-xs text-[#F7F7FA] rounded-xl px-3 py-2 focus:outline-none focus:border-[#FF7417]"
          >
            <option value="all">All Types</option>
            <option value="resume">Resume Reviews</option>
            <option value="linkedin">LinkedIn Audits</option>
          </select>

          {/* Source Type */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#0B0B0E] border border-[#303038] text-xs text-[#F7F7FA] rounded-xl px-3 py-2 focus:outline-none focus:border-[#FF7417]"
          >
            <option value="all">All Sources</option>
            <option value="pdf">PDF Uploads</option>
            <option value="url">Profile URLs</option>
            <option value="text">Pasted Text</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#0B0B0E] border border-[#303038] text-xs text-[#F7F7FA] rounded-xl px-3 py-2 focus:outline-none focus:border-[#FF7417]"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="processing">Processing</option>
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
      ) : reports.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-[#141419] border border-[#303038]">
          <div className="w-12 h-12 rounded-xl bg-[#1C1C23] border border-[#303038] mx-auto flex items-center justify-center text-[#A1A1AA] mb-4">
            <FileBarChart2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#F7F7FA] mb-1">No Analysis Reports Found</h3>
          <p className="text-xs text-[#A1A1AA] max-w-md mx-auto mb-6">
            {search || typeFilter !== 'all' || sourceFilter !== 'all' || statusFilter !== 'all'
              ? 'No historical reports match the applied filters.'
              : 'Upload a resume or analyze a LinkedIn profile to generate your first audit report.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reports.map((report) => {
            const isCompleted = report.status === 'completed';
            const isFailed = report.status === 'failed';

            return (
              <div
                key={report.id}
                className="p-5 rounded-2xl bg-[#141419] border border-[#303038] hover:border-[#FF7417]/40 transition-all flex flex-col justify-between group shadow-sm"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#1C1C23] text-[#A1A1AA] border border-[#303038]">
                      {getSourceIcon(report.source_type)}
                      <span className="capitalize">{report.source_type}</span>
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isFailed
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>

                  {/* Title & Target Role */}
                  <div>
                    <h3
                      className="font-bold text-[#F7F7FA] text-base truncate group-hover:text-[#FF9B45] transition-colors"
                      title={report.original_filename}
                    >
                      {report.original_filename}
                    </h3>
                    <p className="text-xs text-[#FF7417] font-medium mt-0.5 truncate">
                      {report.target_role}
                    </p>
                  </div>

                  {/* Score pill or Error indicator */}
                  {isCompleted && typeof report.overall_score === 'number' ? (
                    <div className="pt-2 flex items-center justify-between bg-[#1C1C23]/60 p-3 rounded-xl border border-[#303038]">
                      <div>
                        <div className="text-[10px] text-[#A1A1AA] uppercase font-mono">
                          Overall Score
                        </div>
                        <div className="text-xl font-black text-[#F7F7FA]">
                          {report.overall_score}
                          <span className="text-xs text-[#A1A1AA] font-normal">/100</span>
                        </div>
                      </div>
                      {typeof report.ats_score === 'number' && (
                        <div className="text-right">
                          <div className="text-[10px] text-[#A1A1AA] uppercase font-mono">
                            ATS Score
                          </div>
                          <div className="text-sm font-bold text-[#FF9B45]">
                            {report.ats_score}%
                          </div>
                        </div>
                      )}
                    </div>
                  ) : isFailed ? (
                    <div className="pt-2 flex items-center gap-2 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-400 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="truncate">Analysis incomplete or encountered error</span>
                    </div>
                  ) : (
                    <div className="pt-2 flex items-center gap-2 p-3 rounded-xl bg-[#1C1C23] text-[#A1A1AA] text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#FF7417]" />
                      <span>Processing evaluation...</span>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-[11px] text-[#A1A1AA] pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#A1A1AA]" />
                      {formatDate(report.created_at)}
                    </span>
                    {report.model_name && (
                      <span className="font-mono text-[10px] text-[#FF9B45] truncate max-w-[120px]">
                        {report.model_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-[#303038] flex items-center justify-between gap-2">
                  <SecondaryButton
                    size="sm"
                    onClick={() => handleOpenDetail(report.id)}
                    className="flex-1 text-xs border-[#303038]"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#FF7417]" />
                    <span>View Report</span>
                  </SecondaryButton>

                  {isCompleted && (
                    <button
                      onClick={() => handleDownloadPdf(report.id)}
                      disabled={isDownloadingPdf}
                      className="p-2 rounded-xl text-[#A1A1AA] hover:text-[#FF7417] hover:bg-[#1C1C23] border border-[#303038] transition-all disabled:opacity-50"
                      title="Download PDF Summary"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isCompleted && (
                    <button
                      onClick={() =>
                        setEmailReport({
                          id: report.id,
                          title: report.original_filename || report.target_role,
                        })
                      }
                      className="p-2 rounded-xl text-[#A1A1AA] hover:text-[#FF7417] hover:bg-[#1C1C23] border border-[#303038] transition-all"
                      title="Email Report"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => setReportToDelete(report)}
                    className="p-2 rounded-xl text-[#A1A1AA] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                    title="Delete Report"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[#303038]">
          <div className="text-xs text-[#A1A1AA]">
            Showing <span className="text-[#F7F7FA] font-medium">{reports.length}</span> of{' '}
            <span className="text-[#F7F7FA] font-medium">{total}</span> reports
          </div>

          <div className="flex items-center gap-2">
            <SecondaryButton
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-[#303038]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </SecondaryButton>

            <span className="text-xs font-mono text-[#F7F7FA] px-3">
              Page {page} of {totalPages}
            </span>

            <SecondaryButton
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border-[#303038]"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </SecondaryButton>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedReportId && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedReportId(null);
            setSelectedReport(null);
          }}
          title={selectedReport?.original_filename || 'Analysis Report Details'}
          size="xl"
        >
          {isLoadingDetail ? (
            <div className="p-8 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#FF7417] animate-spin mx-auto" />
              <p className="text-xs text-[#A1A1AA]">Loading structured analysis...</p>
            </div>
          ) : selectedReport ? (
            <div className="space-y-6 text-sm text-[#F7F7FA]">
              {/* Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#0B0B0E] border border-[#303038]">
                <div>
                  <div className="text-[10px] text-[#A1A1AA] uppercase font-mono">Role</div>
                  <div className="font-semibold text-xs text-[#FF9B45] truncate">
                    {selectedReport.target_role}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#A1A1AA] uppercase font-mono">Overall Score</div>
                  <div className="font-black text-sm text-[#F7F7FA]">
                    {selectedReport.overall_score ?? '—'}/100
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#A1A1AA] uppercase font-mono">ATS Match</div>
                  <div className="font-semibold text-xs text-emerald-400">
                    {selectedReport.ats_score != null ? `${selectedReport.ats_score}%` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#A1A1AA] uppercase font-mono">Model</div>
                  <div className="font-mono text-[11px] text-[#A1A1AA] truncate">
                    {selectedReport.model_name || 'Gemini'}
                  </div>
                </div>
              </div>

              {/* Error Details if Failed */}
              {selectedReport.status === 'failed' && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase font-mono">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Error Category: {selectedReport.error_category || 'Processing Failure'}</span>
                  </div>
                  <p className="text-xs">{selectedReport.error_message || 'The evaluation could not be completed.'}</p>
                </div>
              )}

              {/* Strengths & Weaknesses if JSON available */}
              {selectedReport.result_json && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {/* Summary */}
                  {Boolean(selectedReport.result_json.professional_summary) && (
                    <div className="p-4 rounded-xl bg-[#1C1C23] border border-[#303038] space-y-1">
                      <div className="text-xs font-bold text-[#FF7417] uppercase font-mono">
                        Executive Summary
                      </div>
                      <p className="text-xs text-[#A1A1AA] leading-relaxed">
                        {String(selectedReport.result_json.professional_summary)}
                      </p>
                    </div>
                  )}

                  {/* Strengths */}
                  {Array.isArray(selectedReport.result_json.strengths) &&
                    selectedReport.result_json.strengths.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-emerald-400 uppercase font-mono">
                          Key Strengths
                        </div>
                        <ul className="space-y-1.5">
                          {selectedReport.result_json.strengths.map((str, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-[#A1A1AA] flex items-start gap-2 bg-[#0B0B0E] p-2.5 rounded-lg border border-[#303038]"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{String(str)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Weaknesses */}
                  {Array.isArray(selectedReport.result_json.weaknesses) &&
                    selectedReport.result_json.weaknesses.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-[#FF9B45] uppercase font-mono">
                          Areas for Improvement
                        </div>
                        <ul className="space-y-1.5">
                          {selectedReport.result_json.weaknesses.map((w, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-[#A1A1AA] flex items-start gap-2 bg-[#0B0B0E] p-2.5 rounded-lg border border-[#303038]"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-[#FF9B45] shrink-0 mt-0.5" />
                              <span>{String(w)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Interview Questions */}
                  {Array.isArray(selectedReport.result_json.interview_questions) &&
                    selectedReport.result_json.interview_questions.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-[#F04452] uppercase font-mono">
                          Targeted Interview Questions
                        </div>
                        <ul className="space-y-1.5">
                          {selectedReport.result_json.interview_questions.map((q, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-[#A1A1AA] bg-[#0B0B0E] p-2.5 rounded-lg border border-[#303038]"
                            >
                              <span className="text-[#F04452] font-mono mr-2">Q{idx + 1}:</span>
                              <span>{String(q)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}

              {/* Modal footer */}
              <div className="pt-4 border-t border-[#303038] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SecondaryButton
                    size="sm"
                    onClick={() => handleDownloadPdf(selectedReport.id)}
                    disabled={isDownloadingPdf}
                    className="border-[#303038]"
                    title="Download executive PDF analysis summary"
                  >
                    {isDownloadingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF7417]" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5 text-[#FF7417]" />
                    )}
                    <span>Download PDF</span>
                  </SecondaryButton>

                  <SecondaryButton
                    size="sm"
                    onClick={() =>
                      setEmailReport({
                        id: selectedReport.id,
                        title: selectedReport.original_filename || selectedReport.target_role,
                      })
                    }
                    className="border-[#303038]"
                    title="Email analysis report"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#FF7417]" />
                    <span>Email Report</span>
                  </SecondaryButton>

                  <SecondaryButton size="sm" onClick={() => window.print()} className="border-[#303038]">
                    <Printer className="w-3.5 h-3.5 text-[#FF7417]" />
                    <span>Print</span>
                  </SecondaryButton>
                </div>

                <SecondaryButton
                  size="sm"
                  onClick={() => {
                    setSelectedReportId(null);
                    setSelectedReport(null);
                  }}
                  className="border-[#303038]"
                >
                  Close
                </SecondaryButton>
              </div>
            </div>
          ) : null}
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setReportToDelete(null)}
          title="Delete Analysis Report"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-[#A1A1AA]">
              Are you sure you want to delete the analysis report for{' '}
              <span className="text-[#F7F7FA] font-semibold">
                "{reportToDelete.original_filename}"
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#303038]">
              <SecondaryButton
                size="sm"
                onClick={() => setReportToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </SecondaryButton>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Report'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Email Report Modal */}
      {emailReport && (
        <EmailModal
          isOpen={!!emailReport}
          onClose={() => setEmailReport(null)}
          documentType="analysis_pdf"
          documentId={emailReport.id}
          documentTitle={emailReport.title}
        />
      )}
    </div>
  );
};
