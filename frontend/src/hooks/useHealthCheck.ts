import { useState, useEffect, useCallback } from 'react';
import { HealthCheckState } from '@/types/api';
import { healthService } from '@/services/healthService';

export function useHealthCheck(pollIntervalMs?: number) {
  const [state, setState] = useState<HealthCheckState>({
    status: 'checking',
    data: null,
    error: null,
    lastChecked: null,
  });

  const checkStatus = useCallback(async () => {
    try {
      const data = await healthService.checkHealth();
      setState({
        status: 'connected',
        data,
        error: null,
        lastChecked: new Date(),
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to connect to backend';
      setState({
        status: 'offline',
        data: null,
        error: errorMessage,
        lastChecked: new Date(),
      });
    }
  }, []);

  useEffect(() => {
    checkStatus();

    if (pollIntervalMs && pollIntervalMs > 0) {
      const interval = setInterval(checkStatus, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [checkStatus, pollIntervalMs]);

  return {
    ...state,
    refresh: checkStatus,
    isConnected: state.status === 'connected',
    isOffline: state.status === 'offline',
    isChecking: state.status === 'checking',
  };
}
