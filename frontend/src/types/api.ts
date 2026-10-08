export interface HealthResponse {
  status: string;
  service: string;
}

export type ConnectionStatus = 'checking' | 'connected' | 'offline';

export interface HealthCheckState {
  status: ConnectionStatus;
  data: HealthResponse | null;
  error: string | null;
  lastChecked: Date | null;
}
