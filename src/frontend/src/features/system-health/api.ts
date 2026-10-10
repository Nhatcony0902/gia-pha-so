import type { HealthResponse } from '@family-tree/shared-types';
import { apiGet } from '../../lib/api/client';

export function getHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>('/health');
}