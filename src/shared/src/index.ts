export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: 'family-tree-api';
  timestamp: string;
}
