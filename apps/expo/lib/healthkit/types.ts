/**
 * Types for HealthKit sync operations.
 * Maps between HealthKit native types and our canonical database schema.
 */

/**
 * Canonical metric type strings as stored in apple_health_metrics.type
 */
export type CanonicalMetricType =
  | 'Apple Exercise Time (min)'
  | 'Apple Move Time (min)'
  | 'Body Fat Percentage (%)'
  | 'Body Mass Index (count)'
  | 'Carbohydrates (g)'
  | 'Dietary Energy (kcal)'
  | 'Fiber (g)'
  | 'Heart Rate [Min] (bpm)'
  | 'Heart Rate [Max] (bpm)'
  | 'Heart Rate [Avg] (bpm)'
  | 'Heart Rate Variability (ms)'
  | 'Lean Body Mass (lb)'
  | 'Mindful Minutes (min)'
  | 'Protein (g)'
  | 'Resting Heart Rate (bpm)'
  | 'Running Speed (mi/hr)'
  | 'Sleep Analysis [Asleep] (hr)'
  | 'Sleep Analysis [In Bed] (hr)'
  | 'Sleep Analysis [Core] (hr)'
  | 'Sleep Analysis [Deep] (hr)'
  | 'Sleep Analysis [REM] (hr)'
  | 'Sleep Analysis [Awake] (hr)'
  | 'Total Fat (g)'
  | 'VO2 Max (ml/(kg·min))'
  | 'Waist Circumference (in)'
  | 'Walking + Running Distance (mi)'
  | 'Walking Heart Rate Average (bpm)'
  | 'Weight/Body Mass (lb)';

/**
 * Aggregation method for daily values
 */
export type AggregationMethod = 'sum' | 'avg' | 'min' | 'max';

/**
 * Configuration for a metric type mapping
 */
export interface MetricMapping {
  healthkitType: string; // HealthKit identifier (without HK prefix in v9+)
  canonicalType: CanonicalMetricType;
  unit: string; // Unit for storage
  healthkitUnit?: string; // HealthKit unit if different
  aggregation: AggregationMethod;
  conversionFactor?: number; // Multiply HealthKit value by this
}

/**
 * Record to be sent to the API
 */
export interface HealthMetricRecord {
  healthkit_uuid: string;
  date: string;
  type: string;
  value: number;
  unit: string;
  timezone: string;
}

export interface WorkoutRecord {
  healthkit_uuid: string;
  type: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  timezone: string;
  metrics: Record<string, { value: number; unit: string }>;
}

export interface SleepRecord {
  healthkit_uuid: string;
  start_time: string;
  end_time: string;
  source: string;
  qty: number;
  value: string;
}

/**
 * API response from ingest endpoints
 */
export interface IngestResponse {
  received: number;
  inserted: number;
  duplicates: number;
}

/**
 * Stored anchor for incremental sync
 */
export interface SyncAnchor {
  anchor: string;
  lastSyncedAt: string;
}
