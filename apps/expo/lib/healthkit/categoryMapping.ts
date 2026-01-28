/**
 * Mapping from HealthKit category types to our canonical types.
 * 
 * Category types include sleep analysis and mindful sessions.
 */

import { CanonicalMetricType } from './types';

/**
 * Sleep stage values from HealthKit
 * In @kingstinct/react-native-healthkit v9+, these are returned as string values
 */
export const SLEEP_STAGES = {
  inBed: 'InBed',
  asleepUnspecified: 'Asleep',
  asleepCore: 'AsleepCore',
  asleepDeep: 'AsleepDeep',
  asleepREM: 'AsleepREM',
  awake: 'Awake',
} as const;

/**
 * Map HealthKit sleep value to our canonical type
 */
export function getSleepCanonicalType(
  sleepValue: string
): CanonicalMetricType | null {
  switch (sleepValue) {
    case 'inBed':
    case 'InBed':
    case '0': // Legacy numeric value
      return 'Sleep Analysis [In Bed] (hr)';
    case 'asleepUnspecified':
    case 'Asleep':
    case '1':
      return 'Sleep Analysis [Asleep] (hr)';
    case 'asleepCore':
    case 'AsleepCore':
    case '3':
      return 'Sleep Analysis [Core] (hr)';
    case 'asleepDeep':
    case 'AsleepDeep':
    case '4':
      return 'Sleep Analysis [Deep] (hr)';
    case 'asleepREM':
    case 'AsleepREM':
    case '5':
      return 'Sleep Analysis [REM] (hr)';
    case 'awake':
    case 'Awake':
    case '2':
      return 'Sleep Analysis [Awake] (hr)';
    default:
      console.warn(`Unknown sleep value: ${sleepValue}`);
      return null;
  }
}

/**
 * Map our canonical sleep type back to a simple stage name for the value column
 */
export function getSleepValueFromCanonicalType(canonicalType: string): string {
  switch (canonicalType) {
    case 'Sleep Analysis [In Bed] (hr)':
      return 'InBed';
    case 'Sleep Analysis [Asleep] (hr)':
      return 'Asleep';
    case 'Sleep Analysis [Core] (hr)':
      return 'AsleepCore';
    case 'Sleep Analysis [Deep] (hr)':
      return 'AsleepDeep';
    case 'Sleep Analysis [REM] (hr)':
      return 'AsleepREM';
    case 'Sleep Analysis [Awake] (hr)':
      return 'Awake';
    default:
      return 'Unknown';
  }
}

/**
 * Category type identifiers we need permissions for
 */
export const CATEGORY_TYPE_IDENTIFIERS = [
  'sleepAnalysis',
  'mindfulSession',
];

/**
 * Mindful session mapping
 * Mindful sessions are stored as duration in the metrics table
 */
export const MINDFUL_MAPPING = {
  healthkitType: 'mindfulSession',
  canonicalType: 'Mindful Minutes (min)' as CanonicalMetricType,
  unit: 'min',
  aggregation: 'sum' as const,
};
