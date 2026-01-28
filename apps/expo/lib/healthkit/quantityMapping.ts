/**
 * Mapping from HealthKit quantity types to our canonical metric types.
 * 
 * HealthKit type identifiers in @kingstinct/react-native-healthkit v9+
 * no longer use the HK prefix (e.g., 'bodyMass' instead of 'HKQuantityTypeIdentifierBodyMass').
 */

import { MetricMapping, AggregationMethod } from './types';

/**
 * Quantity type mappings for daily health metrics.
 * 
 * Note: Heart rate requires special handling since we store min/max/avg as separate types.
 * Sleep and mindful minutes are category types, handled in categoryMapping.ts.
 */
export const QUANTITY_MAPPINGS: MetricMapping[] = [
  // Activity
  {
    healthkitType: 'appleExerciseTime',
    canonicalType: 'Apple Exercise Time (min)',
    unit: 'min',
    aggregation: 'sum',
  },
  {
    healthkitType: 'appleMoveTime',
    canonicalType: 'Apple Move Time (min)',
    unit: 'min',
    aggregation: 'sum',
  },
  {
    healthkitType: 'distanceWalkingRunning',
    canonicalType: 'Walking + Running Distance (mi)',
    unit: 'mi',
    healthkitUnit: 'mi', // Request in miles
    aggregation: 'sum',
  },
  {
    healthkitType: 'runningSpeed',
    canonicalType: 'Running Speed (mi/hr)',
    unit: 'mi/hr',
    healthkitUnit: 'mi/hr',
    aggregation: 'avg',
  },

  // Body measurements
  {
    healthkitType: 'bodyMass',
    canonicalType: 'Weight/Body Mass (lb)',
    unit: 'lb',
    healthkitUnit: 'lb',
    aggregation: 'avg',
  },
  {
    healthkitType: 'bodyFatPercentage',
    canonicalType: 'Body Fat Percentage (%)',
    unit: '%',
    healthkitUnit: '%',
    aggregation: 'avg',
  },
  {
    healthkitType: 'bodyMassIndex',
    canonicalType: 'Body Mass Index (count)',
    unit: 'count',
    aggregation: 'avg',
  },
  {
    healthkitType: 'leanBodyMass',
    canonicalType: 'Lean Body Mass (lb)',
    unit: 'lb',
    healthkitUnit: 'lb',
    aggregation: 'avg',
  },
  {
    healthkitType: 'waistCircumference',
    canonicalType: 'Waist Circumference (in)',
    unit: 'in',
    healthkitUnit: 'in',
    aggregation: 'avg',
  },

  // Heart
  {
    healthkitType: 'restingHeartRate',
    canonicalType: 'Resting Heart Rate (bpm)',
    unit: 'bpm',
    healthkitUnit: 'count/min',
    aggregation: 'avg',
  },
  {
    healthkitType: 'walkingHeartRateAverage',
    canonicalType: 'Walking Heart Rate Average (bpm)',
    unit: 'bpm',
    healthkitUnit: 'count/min',
    aggregation: 'avg',
  },
  {
    healthkitType: 'heartRateVariabilitySDNN',
    canonicalType: 'Heart Rate Variability (ms)',
    unit: 'ms',
    aggregation: 'avg',
  },
  {
    healthkitType: 'vo2Max',
    canonicalType: 'VO2 Max (ml/(kg·min))',
    unit: 'ml/(kg·min)',
    aggregation: 'avg',
  },

  // Nutrition
  {
    healthkitType: 'dietaryCarbohydrates',
    canonicalType: 'Carbohydrates (g)',
    unit: 'g',
    aggregation: 'sum',
  },
  {
    healthkitType: 'dietaryProtein',
    canonicalType: 'Protein (g)',
    unit: 'g',
    aggregation: 'sum',
  },
  {
    healthkitType: 'dietaryFatTotal',
    canonicalType: 'Total Fat (g)',
    unit: 'g',
    aggregation: 'sum',
  },
  {
    healthkitType: 'dietaryFiber',
    canonicalType: 'Fiber (g)',
    unit: 'g',
    aggregation: 'sum',
  },
  {
    healthkitType: 'dietaryEnergyConsumed',
    canonicalType: 'Dietary Energy (kcal)',
    unit: 'kcal',
    aggregation: 'sum',
  },
];

/**
 * Heart rate needs special handling - we query once and compute min/max/avg
 */
export const HEART_RATE_MAPPING = {
  healthkitType: 'heartRate',
  healthkitUnit: 'count/min',
  outputs: [
    { canonicalType: 'Heart Rate [Min] (bpm)' as const, aggregation: 'min' as AggregationMethod, unit: 'bpm' },
    { canonicalType: 'Heart Rate [Max] (bpm)' as const, aggregation: 'max' as AggregationMethod, unit: 'bpm' },
    { canonicalType: 'Heart Rate [Avg] (bpm)' as const, aggregation: 'avg' as AggregationMethod, unit: 'bpm' },
  ],
};

/**
 * Get the HealthKit type identifiers we need to request permissions for
 */
export function getQuantityTypeIdentifiers(): string[] {
  const types = QUANTITY_MAPPINGS.map((m) => m.healthkitType);
  types.push(HEART_RATE_MAPPING.healthkitType);
  return [...new Set(types)];
}

/**
 * Get all canonical type strings
 */
export function getCanonicalMetricTypes(): string[] {
  const types = QUANTITY_MAPPINGS.map((m) => m.canonicalType);
  types.push(...HEART_RATE_MAPPING.outputs.map((o) => o.canonicalType));
  return types;
}
