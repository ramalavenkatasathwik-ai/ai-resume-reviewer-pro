import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  History as HistoryIcon,
  FileText,
  Linkedin,
  RefreshCw,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { resumeService } from '@/services/resumeService';
import { AnalysisHistoryItem } from '@/types/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';

export const HistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<AnalysisHistoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'resume' | 'linkedin'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = React.useCallback(async (type: string = filter) => {
    setIsLoading(true);
    setError(null);
    try {
      const records = await resumeService.getHistory(type, 50, 0);
      setHistoryItems(records);
    } catch (err: unknown) {
      let msg = 'Failed to load analysis history from database.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail || err.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchHistory(filter);
  }, [fetchHistory, filter]);

  // Statistics calculation
  const totalCount = historyItems.length;
  const completedCount = historyItems.filter((item) => item.status === 'completed').length;
  const scoresWithValues = historyItems.filter(
    (item) => typeof item.overall_score === 'number' && item.overall_score > 0
  );
  const avgOverallScore =
    scoresWithValues.length > 0
      ? Math.round(
          scoresWithValues.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) /
            scoresWithValues.length
        )
      : null;

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#303038]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#1C1C23] text-[#FF9B45] border border-[#303038] uppercase font-mono">
              PostgreSQL Telemetry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F7F7FA] tracking-tight">
            Analysis History
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            View, audit, and track previous AI resume benchmarks and LinkedIn profile reviews.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SecondaryButton
            size="sm"
            onClick={() => fetchHistory(filter)}
            disabled={isLoading}
            className="border-[#303038]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </SecondaryButton>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#141419] border border-[#303038]">
          <div className="flex items-center justify-between text-[#A1A1AA]">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Runs</span>
            <HistoryIcon className="w-4 h-4 text-[#FF7417]" />
          </div>
          <p className="text-3xl font-black text-[#F7F7FA] mt-2">{totalCount}</p>
          <p className="text-[11px] text-[#A1A1AA] mt-1">Across all assessment types</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#141419] border border-[#303038]">
          <div className="flex items-center justify-between text-[#A1A1AA]">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-[#F7F7FA] mt-2">{completedCount}</p>
          <p className="text-[11px] text-[#A1A1AA] mt-1">Successfully evaluated</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#141419] border border-[#303038]">
          <div className="flex items-center justify-between text-[#A1A1AA]">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Score</span>
            <BarChart3 className="w-4 h-4 text-[#F04452]" />
          </div>
          <p className="text-3xl font-black text-[#F7F7FA] mt-2">
            {avgOverallScore !== null ? `${avgOverallScore}/100` : '—'}
          </p>
          <p className="text-[11px] text-[#A1A1AA] mt-1">Aggregated candidate performance</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="inline-flex p-1 rounded-xl bg-[#141419] border border-[#303038] text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-[#C91432] text-white shadow font-semibold'
                : 'text-[#A1A1AA] hover:text-[#F7F7FA]'
            }`}
          >
            All Analyses
          </button>
          <button
            onClick={() => setFilter('resume')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              filter === 'resume'
                ? 'bg-[#C91432] text-white shadow font-semibold'
                : 'text-[#A1A1AA] hover:text-[#F7F7FA]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#F04452]" />
            <span>Resumes</span>
          </button>
          <button
            onClick={() => setFilter('linkedin')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              filter === 'linkedin'
                ? 'bg-[#FF7417] text-[#0B0B0E] shadow font-bold'
                : 'text-[#A1A1AA] hover:text-[#F7F7FA]'
            }`}
          >
            <Linkedin className="w-3.5 h-3.5 text-[#FF7417]" />
            <span>LinkedIn</span>
          </button>
        </div>

        <span className="text-xs text-[#A1A1AA] font-mono">
          Showing {historyItems.length} records
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-[#C91432]/10 border border-[#C91432]/30 text-[#F04452] text-xs">
          <p className="font-bold">Error loading history</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <div className="p-6 rounded-2xl bg-[#141419] border border-[#303038] space-y-4">
          <LoadingSkeleton count={4} />
        </div>
      ) : historyItems.length === 0 ? (
        <EmptyState
          title="No Analyses Recorded Yet"
          description="You haven't run any resume or LinkedIn analyses yet. Run an evaluation from the Resume Analyzer or LinkedIn Analyzer to record your first audit."
          icon={HistoryIcon}
          action={
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <PrimaryButton variant="crimson" size="sm">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Analyze Resume</span>
                </PrimaryButton>
              </Link>
              <Link to="/linkedin">
                <PrimaryButton variant="orange" size="sm">
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>Analyze LinkedIn</span>
                </PrimaryButton>
              </Link>
            </div>
          }
        />
      ) : (
        /* History Records Table / Cards */
        <div className="rounded-2xl bg-[#141419] border border-[#303038] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1C1C23] border-b border-[#303038] text-[#A1A1AA] uppercase font-mono tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Type</th>
                  <th className="py-3.5 px-4 font-semibold">Target Role</th>
                  <th className="py-3.5 px-4 font-semibold">File / Reference</th>
                  <th className="py-3.5 px-4 font-semibold">Overall</th>
                  <th className="py-3.5 px-4 font-semibold">ATS / Fit</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303038]">
                {historyItems.map((item) => {
                  const isResume = item.analysis_type === 'resume';
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#1C1C23]/50 transition-colors"
                    >
                      {/* Type Badge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                            isResume
                              ? 'bg-[#C91432]/10 border-[#C91432]/30 text-[#F04452]'
                              : 'bg-[#FF7417]/10 border-[#FF7417]/30 text-[#FF9B45]'
                          }`}
                        >
                          {isResume ? (
                            <FileText className="w-3.5 h-3.5 text-[#F04452]" />
                          ) : (
                            <Linkedin className="w-3.5 h-3.5 text-[#FF7417]" />
                          )}
                          <span className="capitalize">{item.analysis_type}</span>
                        </span>
                      </td>

                      {/* Target Role */}
                      <td className="py-4 px-4 font-bold text-[#F7F7FA] whitespace-nowrap">
                        {item.target_role}
                      </td>

                      {/* Filename or reference */}
                      <td className="py-4 px-4 text-[#A1A1AA] font-mono text-[11px] truncate max-w-[200px]">
                        {item.filename || '—'}
                      </td>

                      {/* Overall Score */}
                      <td className="py-4 px-4 whitespace-nowrap font-bold">
                        {typeof item.overall_score === 'number' ? (
                          <span
                            className={`px-2 py-0.5 rounded ${
                              item.overall_score >= 85
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : item.overall_score >= 70
                                ? 'bg-[#FF7417]/10 text-[#FF9B45] border border-[#FF7417]/20'
                                : 'bg-[#C91432]/10 text-[#F04452] border border-[#C91432]/20'
                            }`}
                          >
                            {item.overall_score}/100
                          </span>
                        ) : (
                          <span className="text-[#A1A1AA]">—</span>
                        )}
                      </td>

                      {/* ATS Score */}
                      <td className="py-4 px-4 whitespace-nowrap font-medium text-[#A1A1AA]">
                        {typeof item.ats_score === 'number' ? (
                          <span>{item.ats_score}/100</span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="capitalize">{item.status}</span>
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="py-4 px-4 whitespace-nowrap text-[#A1A1AA] font-mono text-[11px]">
                        {item.created_at ? (
                          new Date(item.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
