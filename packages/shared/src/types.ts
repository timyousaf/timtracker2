/**
 * Health metric from apple_health_metrics table
 */
export interface HealthMetric {
  id: number;
  date: string;
  type: string;
  value: number;
  unit: string | null;
  timezone: string | null;
}

/**
 * API response wrapper for health metrics
 */
export interface HealthMetricsResponse {
  data: HealthMetric[];
  count: number;
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  details?: string;
}
