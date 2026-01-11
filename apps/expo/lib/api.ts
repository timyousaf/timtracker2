import type { HealthMetricsResponse, ApiError } from '@timtracker/shared';

/**
 * Get the API base URL based on environment
 * - In development, use the configured API URL
 * - In production (web), use relative paths
 * - In production (native), use the full URL
 */
function getApiBase(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  
  // If explicitly configured, use it
  if (configuredUrl) {
    return configuredUrl;
  }
  
  // For web builds, use relative paths (same origin)
  if (typeof window !== 'undefined' && window.location) {
    return '';
  }
  
  // For native builds, need the full URL
  // This should be set via EXPO_PUBLIC_API_URL for production
  return '';
}

/**
 * Fetch wrapper with authentication
 */
export async function apiFetch<T>(
  path: string,
  getToken: () => Promise<string | null>,
  options?: RequestInit
): Promise<T> {
  const token = await getToken();
  const baseUrl = getApiBase();
  
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: 'Request failed',
      details: response.statusText,
    }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

/**
 * Fetch health metrics
 */
export async function fetchHealthMetrics(
  getToken: () => Promise<string | null>
): Promise<HealthMetricsResponse> {
  return apiFetch<HealthMetricsResponse>('/api/health-metrics', getToken);
}
