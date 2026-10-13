import apiClient from '@/lib/axios';
import {
  AnalysisReportDetail,
  AnalysisReportListResponse,
} from '@/types/analysisReport';

export interface ListAnalysesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  analysisType?: string;
  sourceType?: string;
  status?: string;
}

export const analysisReportService = {
  /**
   * Retrieves paginated analysis reports with optional filters.
   */
  async listAnalyses(params: ListAnalysesParams = {}): Promise<AnalysisReportListResponse> {
    const queryParams: Record<string, string | number> = {
      page: params.page ?? 1,
      page_size: params.pageSize ?? 12,
    };
    if (params.search && params.search.trim()) {
      queryParams.search = params.search.trim();
    }
    if (params.analysisType && params.analysisType !== 'all') {
      queryParams.analysis_type = params.analysisType;
    }
    if (params.sourceType && params.sourceType !== 'all') {
      queryParams.source_type = params.sourceType;
    }
    if (params.status && params.status !== 'all') {
      queryParams.status = params.status;
    }

    const res = await apiClient.get<AnalysisReportListResponse>('/api/analyses', {
      params: queryParams,
    });
    return res.data;
  },

  /**
   * Retrieves the most recent report.
   */
  async getLatest(): Promise<AnalysisReportDetail> {
    const res = await apiClient.get<AnalysisReportDetail>('/api/analyses/latest');
    return res.data;
  },

  /**
   * Retrieves full report by primary ID.
   */
  async getById(id: string): Promise<AnalysisReportDetail> {
    const res = await apiClient.get<AnalysisReportDetail>(`/api/analyses/${id}`);
    return res.data;
  },

  /**
   * Deletes an analysis report owned by the current user.
   */
  async deleteReport(id: string): Promise<void> {
    await apiClient.delete(`/api/analyses/${id}`);
  },
};
