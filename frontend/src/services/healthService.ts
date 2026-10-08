import apiClient from '@/lib/axios';
import { HealthResponse } from '@/types/api';

/**
 * Service to query backend health and availability.
 */
export const healthService = {
  /**
   * Performs a GET request to /api/health to verify service status.
   */
  async checkHealth(): Promise<HealthResponse> {
    const response = await apiClient.get<HealthResponse>('/api/health');
    return response.data;
  },
};

export default healthService;
