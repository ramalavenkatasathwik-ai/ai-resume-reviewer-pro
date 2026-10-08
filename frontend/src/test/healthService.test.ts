import { describe, it, expect, vi, beforeEach } from 'vitest';
import { healthService } from '../services/healthService';
import apiClient from '../lib/axios';

vi.mock('../lib/axios');

describe('healthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully fetches health status from /api/health', async () => {
    const mockData = {
      status: 'healthy',
      service: 'ai-resume-reviewer-api',
    };

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

    const result = await healthService.checkHealth();

    expect(apiClient.get).toHaveBeenCalledWith('/api/health');
    expect(result).toEqual(mockData);
    expect(result.status).toBe('healthy');
    expect(result.service).toBe('ai-resume-reviewer-api');
  });

  it('throws an error when the endpoint is unreachable', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network Error'));

    await expect(healthService.checkHealth()).rejects.toThrow('Network Error');
  });
});
