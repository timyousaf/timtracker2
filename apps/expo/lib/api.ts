import type { HealthMetricsResponse, ApiError } from '@timtracker/shared';
import type {
  MetricsApiResponse,
  SleepApiResponse,
  CalendarHeatmapApiResponse,
  WeeklyWorkoutsApiResponse,
  StrengthVolumeApiResponse,
  ExerciseProgressApiResponse,
  MealScoresApiResponse,
  WeeklySummaryApiResponse,
} from '@timtracker/ui';

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
 * Fetch health metrics (legacy)
 */
export async function fetchHealthMetrics(
  getToken: () => Promise<string | null>
): Promise<HealthMetricsResponse> {
  return apiFetch<HealthMetricsResponse>('/api/health-metrics', getToken);
}

/**
 * Fetch metrics for charts
 */
export async function fetchMetrics(
  getToken: () => Promise<string | null>,
  params: { type: string; start?: string; end?: string; period?: 'day' | 'week' }
): Promise<MetricsApiResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('type', params.type);
  if (params.start) searchParams.set('start', params.start);
  if (params.end) searchParams.set('end', params.end);
  if (params.period) searchParams.set('period', params.period);
  
  return apiFetch<MetricsApiResponse>(`/api/metrics?${searchParams}`, getToken);
}

/**
 * Fetch sleep data
 */
export async function fetchSleep(
  getToken: () => Promise<string | null>,
  params?: { start?: string; end?: string }
): Promise<SleepApiResponse> {
  const searchParams = new URLSearchParams();
  if (params?.start) searchParams.set('start', params.start);
  if (params?.end) searchParams.set('end', params.end);
  
  const query = searchParams.toString();
  return apiFetch<SleepApiResponse>(`/api/sleep${query ? `?${query}` : ''}`, getToken);
}

/**
 * Fetch calendar heatmap data
 */
export async function fetchCalendarHeatmap(
  getToken: () => Promise<string | null>,
  params: { type: 'exercise' | 'mindful' | 'interaction' | 'meal'; offset?: number }
): Promise<CalendarHeatmapApiResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('type', params.type);
  if (params.offset !== undefined) searchParams.set('offset', params.offset.toString());
  
  return apiFetch<CalendarHeatmapApiResponse>(`/api/calendar-heatmap?${searchParams}`, getToken);
}

/**
 * Fetch weekly workouts
 */
export async function fetchWeeklyWorkouts(
  getToken: () => Promise<string | null>,
  params?: { start?: string; end?: string }
): Promise<WeeklyWorkoutsApiResponse> {
  const searchParams = new URLSearchParams();
  if (params?.start) searchParams.set('start', params.start);
  if (params?.end) searchParams.set('end', params.end);
  
  const query = searchParams.toString();
  return apiFetch<WeeklyWorkoutsApiResponse>(`/api/weekly-workouts${query ? `?${query}` : ''}`, getToken);
}

/**
 * Fetch strength volume
 */
export async function fetchStrengthVolume(
  getToken: () => Promise<string | null>,
  params?: { start?: string; end?: string }
): Promise<StrengthVolumeApiResponse> {
  const searchParams = new URLSearchParams();
  if (params?.start) searchParams.set('start', params.start);
  if (params?.end) searchParams.set('end', params.end);
  
  const query = searchParams.toString();
  return apiFetch<StrengthVolumeApiResponse>(`/api/strength-volume${query ? `?${query}` : ''}`, getToken);
}

/**
 * Fetch exercise progress
 */
export async function fetchExerciseProgress(
  getToken: () => Promise<string | null>,
  params: { exercise: string; start?: string; end?: string }
): Promise<ExerciseProgressApiResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('exercise', params.exercise);
  if (params.start) searchParams.set('start', params.start);
  if (params.end) searchParams.set('end', params.end);
  
  return apiFetch<ExerciseProgressApiResponse>(`/api/exercise-progress?${searchParams}`, getToken);
}

/**
 * Fetch meal scores
 */
export async function fetchMealScores(
  getToken: () => Promise<string | null>,
  params?: { start?: string; end?: string }
): Promise<MealScoresApiResponse> {
  const searchParams = new URLSearchParams();
  if (params?.start) searchParams.set('start', params.start);
  if (params?.end) searchParams.set('end', params.end);
  
  const query = searchParams.toString();
  return apiFetch<MealScoresApiResponse>(`/api/meal-scores${query ? `?${query}` : ''}`, getToken);
}

/**
 * Fetch weekly summary (exercise, diet, sleep, mindfulness for one week)
 */
export async function fetchWeeklySummary(
  getToken: () => Promise<string | null>,
  params?: { offset?: number }
): Promise<WeeklySummaryApiResponse> {
  const searchParams = new URLSearchParams();
  if (params?.offset !== undefined) searchParams.set('offset', params.offset.toString());
  
  const query = searchParams.toString();
  return apiFetch<WeeklySummaryApiResponse>(`/api/weekly-summary${query ? `?${query}` : ''}`, getToken);
}

/**
 * Reset health data response
 */
export interface ResetHealthDataResponse {
  success: boolean;
  deleted: {
    metrics: number;
    workouts: number;
    sleep: number;
  };
}

/**
 * Reset all health data (clear ios_* tables for a full re-sync)
 */
export async function resetHealthData(
  getToken: () => Promise<string | null>
): Promise<ResetHealthDataResponse> {
  return apiFetch<ResetHealthDataResponse>('/api/ingest/reset', getToken, {
    method: 'DELETE',
  });
}
