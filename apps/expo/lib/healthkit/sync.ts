/**
 * HealthKit sync implementation.
 * 
 * Handles:
 * - Requesting permissions
 * - Querying HealthKit with anchors for incremental sync
 * - Aggregating samples to daily values
 * - Uploading to the API
 */

import {
  isHealthDataAvailable,
  requestAuthorization,
  queryQuantitySamplesWithAnchor,
  queryCategorySamplesWithAnchor,
  queryWorkoutSamples,
} from '@kingstinct/react-native-healthkit';

import { apiFetch } from '../api';
import { logger } from '../logger';
import {
  HealthMetricRecord,
  WorkoutRecord,
  SleepRecord,
  IngestResponse,
} from './types';
import {
  QUANTITY_MAPPINGS,
  HEART_RATE_MAPPING,
  getQuantityTypeIdentifiers,
} from './quantityMapping';
import {
  CATEGORY_TYPE_IDENTIFIERS,
  MINDFUL_MAPPING,
  getSleepCanonicalType,
  getSleepValueString,
} from './categoryMapping';
import { getWorkoutTypeName } from './workoutMapping';
import { roundTo, convertUnit } from './unitConversions';
import {
  getAnchor,
  setAnchor,
  setLastSyncTime,
} from './anchorStorage';
import {
  aggregateSamplesToDaily,
  aggregateHeartRate,
  aggregateMindfulSessions,
  getDateString,
  getStartOfDay,
  calculateDurationHours,
  calculateDurationSeconds,
} from './aggregation';

// Get the current timezone
function getTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Upload batch size - Vercel has timeout limits, so keep batches small
const UPLOAD_BATCH_SIZE = 500;

/**
 * Upload records in batches to avoid timeout/size limits
 */
async function uploadInBatches<T>(
  records: T[],
  endpoint: string,
  getToken: () => Promise<string | null>,
  onProgress?: (uploaded: number, total: number) => void
): Promise<{ inserted: number; duplicates: number }> {
  let totalInserted = 0;
  let totalDuplicates = 0;
  
  for (let i = 0; i < records.length; i += UPLOAD_BATCH_SIZE) {
    const batch = records.slice(i, i + UPLOAD_BATCH_SIZE);
    const batchNum = Math.floor(i / UPLOAD_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(records.length / UPLOAD_BATCH_SIZE);
    
    logger.info('HealthKit', `Uploading batch ${batchNum}/${totalBatches} (${batch.length} records)`);
    onProgress?.(i + batch.length, records.length);
    
    try {
      const response = await apiFetch<IngestResponse>(
        endpoint,
        getToken,
        {
          method: 'POST',
          body: JSON.stringify({ records: batch }),
        }
      );
      
      totalInserted += response.inserted;
      totalDuplicates += response.duplicates;
    } catch (error) {
      logger.error('HealthKit', `Failed to upload batch ${batchNum}`, {
        error: error instanceof Error ? error.message : String(error),
        batchSize: batch.length,
      });
      throw error;
    }
  }
  
  return { inserted: totalInserted, duplicates: totalDuplicates };
}

/**
 * Check if HealthKit is available on this device
 */
export async function checkHealthKitAvailable(): Promise<boolean> {
  try {
    logger.info('HealthKit', 'Checking HealthKit availability...');
    const available = await isHealthDataAvailable();
    logger.info('HealthKit', `HealthKit available: ${available}`);
    return available;
  } catch (error) {
    logger.error('HealthKit', 'Error checking HealthKit availability', error);
    return false;
  }
}

/**
 * Mapping from our short type identifiers to the full HK identifiers
 * This is needed because the library requires exact HK identifier strings
 */
const QUANTITY_TYPE_TO_HK_IDENTIFIER: Record<string, string> = {
  // Activity
  appleExerciseTime: 'HKQuantityTypeIdentifierAppleExerciseTime',
  appleMoveTime: 'HKQuantityTypeIdentifierAppleMoveTime',
  distanceWalkingRunning: 'HKQuantityTypeIdentifierDistanceWalkingRunning',
  runningSpeed: 'HKQuantityTypeIdentifierRunningSpeed',
  // Body measurements
  bodyMass: 'HKQuantityTypeIdentifierBodyMass',
  bodyFatPercentage: 'HKQuantityTypeIdentifierBodyFatPercentage',
  bodyMassIndex: 'HKQuantityTypeIdentifierBodyMassIndex',
  leanBodyMass: 'HKQuantityTypeIdentifierLeanBodyMass',
  waistCircumference: 'HKQuantityTypeIdentifierWaistCircumference',
  // Heart
  heartRate: 'HKQuantityTypeIdentifierHeartRate',
  restingHeartRate: 'HKQuantityTypeIdentifierRestingHeartRate',
  walkingHeartRateAverage: 'HKQuantityTypeIdentifierWalkingHeartRateAverage',
  heartRateVariabilitySDNN: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  vo2Max: 'HKQuantityTypeIdentifierVO2Max', // Note: VO2 is uppercase
  // Nutrition
  dietaryCarbohydrates: 'HKQuantityTypeIdentifierDietaryCarbohydrates',
  dietaryProtein: 'HKQuantityTypeIdentifierDietaryProtein',
  dietaryFatTotal: 'HKQuantityTypeIdentifierDietaryFatTotal',
  dietaryFiber: 'HKQuantityTypeIdentifierDietaryFiber',
  dietaryEnergyConsumed: 'HKQuantityTypeIdentifierDietaryEnergyConsumed',
};

const CATEGORY_TYPE_TO_HK_IDENTIFIER: Record<string, string> = {
  sleepAnalysis: 'HKCategoryTypeIdentifierSleepAnalysis',
  mindfulSession: 'HKCategoryTypeIdentifierMindfulSession',
};

/**
 * Request all necessary HealthKit permissions
 */
export async function requestHealthKitPermissions(): Promise<boolean> {
  try {
    // Build the list of HealthKit type identifiers to request
    const quantityTypes = getQuantityTypeIdentifiers()
      .map((type) => QUANTITY_TYPE_TO_HK_IDENTIFIER[type])
      .filter(Boolean);
    
    const categoryTypes = CATEGORY_TYPE_IDENTIFIERS
      .map((type) => CATEGORY_TYPE_TO_HK_IDENTIFIER[type])
      .filter(Boolean);
    
    // For workouts, use HKWorkoutTypeIdentifier
    const allTypes = [...quantityTypes, ...categoryTypes, 'HKWorkoutTypeIdentifier'];
    
    logger.info('HealthKit', 'Requesting HealthKit permissions', { 
      typeCount: allTypes.length,
      types: allTypes 
    });
    
    // Cast to any to handle library type variations
    await requestAuthorization({
      toRead: allTypes as any,
    });
    
    logger.info('HealthKit', 'HealthKit permissions granted successfully');
    return true;
  } catch (error) {
    logger.error('HealthKit', 'Error requesting HealthKit permissions', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorObject: error,
    });
    return false;
  }
}

/**
 * Sync progress callback type
 */
export type SyncProgressCallback = (progress: {
  phase: string;
  current: number;
  total: number;
  message: string;
}) => void;

/**
 * Sync quantity metrics (body mass, HRV, distance, etc.)
 */
async function syncQuantityMetrics(
  getToken: () => Promise<string | null>,
  onProgress?: SyncProgressCallback
): Promise<{ inserted: number; duplicates: number }> {
  const records: HealthMetricRecord[] = [];
  const timezone = getTimezone();
  
  // Process each quantity mapping
  for (let i = 0; i < QUANTITY_MAPPINGS.length; i++) {
    const mapping = QUANTITY_MAPPINGS[i];
    onProgress?.({
      phase: 'metrics',
      current: i + 1,
      total: QUANTITY_MAPPINGS.length + 1, // +1 for heart rate
      message: `Syncing ${mapping.canonicalType}...`,
    });
    
    try {
      // Get the full HK identifier for this type
      const hkIdentifier = QUANTITY_TYPE_TO_HK_IDENTIFIER[mapping.healthkitType];
      if (!hkIdentifier) {
        logger.warn('HealthKit', `No HK identifier mapping for ${mapping.healthkitType}`);
        continue;
      }
      
      const anchor = await getAnchor(mapping.healthkitType);
      const result = await queryQuantitySamplesWithAnchor(
        hkIdentifier as any,
        {
          limit: 0, // No limit - get all
          anchor: anchor || undefined,
          unit: mapping.healthkitUnit,
        }
      );
      
      logger.info('HealthKit', `Fetched ${result.samples.length} samples for ${mapping.canonicalType}`);
      
      if (result.samples.length > 0) {
        // Aggregate to daily values
        const dailyValues = aggregateSamplesToDaily(
          result.samples,
          mapping.aggregation,
          (s) => s.quantity
        );
        
        logger.info('HealthKit', `Aggregated to ${dailyValues.length} daily values for ${mapping.canonicalType}`);
        
        // Convert to records
        for (const daily of dailyValues) {
          let value = daily.value;
          
          // Apply unit conversion if needed
          if (mapping.healthkitUnit && mapping.healthkitUnit !== mapping.unit) {
            value = convertUnit(value, mapping.healthkitUnit, mapping.unit);
          }
          
          records.push({
            healthkit_uuid: `${daily.date}_${mapping.canonicalType}`,
            date: getStartOfDay(daily.date),
            type: mapping.canonicalType,
            value: roundTo(value, 2),
            unit: mapping.unit,
            timezone,
          });
        }
      } else {
        logger.info('HealthKit', `No samples found for ${mapping.canonicalType} (may need permission or no data exists)`);
      }
      
      // Store new anchor
      if (result.newAnchor) {
        await setAnchor(mapping.healthkitType, result.newAnchor);
      }
    } catch (error) {
      logger.error('HealthKit', `Error syncing ${mapping.canonicalType}`, {
        error: error instanceof Error ? error.message : String(error),
        healthkitType: mapping.healthkitType,
        hkIdentifier: QUANTITY_TYPE_TO_HK_IDENTIFIER[mapping.healthkitType],
      });
      // Continue with other metrics
    }
  }
  
  // Handle heart rate separately (min/max/avg) - use batching to avoid memory crash
  onProgress?.({
    phase: 'metrics',
    current: QUANTITY_MAPPINGS.length + 1,
    total: QUANTITY_MAPPINGS.length + 1,
    message: 'Syncing heart rate...',
  });
  
  try {
    const hrHkIdentifier = QUANTITY_TYPE_TO_HK_IDENTIFIER[HEART_RATE_MAPPING.healthkitType];
    let hrAnchor = await getAnchor(HEART_RATE_MAPPING.healthkitType);
    
    // Heart rate can have millions of samples - fetch in batches to avoid memory crash
    const HR_BATCH_SIZE = 5000;
    let batchCount = 0;
    let totalHrSamples = 0;
    
    // Accumulate daily stats across batches using a map
    const dailyHrStats: Map<string, { min: number; max: number; sum: number; count: number }> = new Map();
    
    let hasMoreData = true;
    while (hasMoreData) {
      batchCount++;
      logger.info('HealthKit', `Fetching heart rate batch ${batchCount}...`);
      
      const hrResult = await queryQuantitySamplesWithAnchor(
        hrHkIdentifier as any,
        {
          limit: HR_BATCH_SIZE,
          anchor: hrAnchor || undefined,
          unit: HEART_RATE_MAPPING.healthkitUnit,
        }
      );
      
      totalHrSamples += hrResult.samples.length;
      logger.info('HealthKit', `Heart rate batch ${batchCount}: ${hrResult.samples.length} samples (total: ${totalHrSamples})`);
      
      // Process this batch - accumulate into daily stats
      for (const sample of hrResult.samples) {
        const dateKey = new Date(sample.startDate).toISOString().split('T')[0];
        const value = sample.quantity;
        
        const existing = dailyHrStats.get(dateKey);
        if (existing) {
          existing.min = Math.min(existing.min, value);
          existing.max = Math.max(existing.max, value);
          existing.sum += value;
          existing.count++;
        } else {
          dailyHrStats.set(dateKey, { min: value, max: value, sum: value, count: 1 });
        }
      }
      
      // Update anchor for next batch or final save
      if (hrResult.newAnchor) {
        hrAnchor = hrResult.newAnchor;
      }
      
      // Check if we got fewer samples than batch size (means we're done)
      hasMoreData = hrResult.samples.length === HR_BATCH_SIZE;
      
      // Update progress
      onProgress?.({
        phase: 'metrics',
        current: QUANTITY_MAPPINGS.length + 1,
        total: QUANTITY_MAPPINGS.length + 1,
        message: `Syncing heart rate... (${totalHrSamples} samples)`,
      });
    }
    
    // Convert accumulated stats to records
    for (const [dateKey, stats] of dailyHrStats) {
      for (const output of HEART_RATE_MAPPING.outputs) {
        const value =
          output.aggregation === 'min'
            ? stats.min
            : output.aggregation === 'max'
            ? stats.max
            : Math.round(stats.sum / stats.count);
        
        records.push({
          healthkit_uuid: `${dateKey}_${output.canonicalType}`,
          date: getStartOfDay(dateKey),
          type: output.canonicalType,
          value,
          unit: output.unit,
          timezone,
        });
      }
    }
    
    logger.info('HealthKit', `Heart rate sync complete: ${totalHrSamples} samples → ${dailyHrStats.size} days`);
    
    // Save final anchor
    if (hrAnchor) {
      await setAnchor(HEART_RATE_MAPPING.healthkitType, hrAnchor);
    }
  } catch (error) {
    logger.error('HealthKit', 'Error syncing heart rate', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Upload to API in batches
  if (records.length === 0) {
    return { inserted: 0, duplicates: 0 };
  }
  
  logger.info('HealthKit', `Uploading ${records.length} metric records in batches...`);
  
  const result = await uploadInBatches(
    records,
    '/api/ingest/health-metrics',
    getToken,
    (uploaded, total) => {
      onProgress?.({
        phase: 'upload',
        current: uploaded,
        total,
        message: `Uploading metrics... ${uploaded}/${total}`,
      });
    }
  );
  
  logger.info('HealthKit', `Metrics upload complete: ${result.inserted} inserted, ${result.duplicates} duplicates`);
  return result;
}

/**
 * Deduplicate sleep records by (start_time, end_time, value, source)
 * This reduces data transfer since HealthKit often has duplicate entries with different UUIDs
 */
function deduplicateSleepRecords(records: SleepRecord[]): SleepRecord[] {
  const seen = new Set<string>();
  const deduped: SleepRecord[] = [];
  
  for (const record of records) {
    // Create a key from start_time, end_time, value, source
    const key = `${record.start_time}|${record.end_time}|${record.value}|${record.source}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(record);
    }
  }
  
  return deduped;
}

/**
 * Sync sleep data
 */
async function syncSleep(
  getToken: () => Promise<string | null>,
  onProgress?: SyncProgressCallback
): Promise<{ inserted: number; duplicates: number }> {
  const records: SleepRecord[] = [];
  const timezone = getTimezone();
  
  onProgress?.({
    phase: 'sleep',
    current: 0,
    total: 1,
    message: 'Syncing sleep data...',
  });
  
  try {
    const sleepHkIdentifier = CATEGORY_TYPE_TO_HK_IDENTIFIER['sleepAnalysis'];
    let sleepAnchor = await getAnchor('sleepAnalysis');
    
    // Sleep can have many segments - fetch in batches
    const SLEEP_BATCH_SIZE = 2000;
    let batchCount = 0;
    let totalSleepSamples = 0;
    let hasMoreData = true;
    
    while (hasMoreData) {
      batchCount++;
      logger.info('HealthKit', `Fetching sleep batch ${batchCount}...`);
      
      const result = await queryCategorySamplesWithAnchor(sleepHkIdentifier as any, {
        limit: SLEEP_BATCH_SIZE,
        anchor: sleepAnchor || undefined,
      });
      
      totalSleepSamples += result.samples.length;
      logger.info('HealthKit', `Sleep batch ${batchCount}: ${result.samples.length} samples (total: ${totalSleepSamples})`);
      
      for (const sample of result.samples) {
        const sleepValue = sample.value?.toString() || '';
        const canonicalType = getSleepCanonicalType(sleepValue);
        
        if (canonicalType) {
          const durationHours = calculateDurationHours(
            sample.startDate,
            sample.endDate
          );
          
          // Extract source name - try multiple properties since HealthKit may use proxies
          const sampleAny = sample as any;
          let sourceName = 'Unknown';
          
          // Try source name first
          if (sampleAny.sourceRevision?.source?.name && 
              sampleAny.sourceRevision.source.name !== 'SourceProxy') {
            sourceName = sampleAny.sourceRevision.source.name;
          } 
          // Try to extract from bundle identifier (e.g., "com.ouraring.oura" -> "Oura")
          else if (sampleAny.sourceRevision?.source?.bundleIdentifier) {
            const bundleId = sampleAny.sourceRevision.source.bundleIdentifier;
            // Extract app name from bundle ID
            if (bundleId.includes('ouraring')) {
              sourceName = 'Oura';
            } else if (bundleId.includes('eightsleep')) {
              sourceName = 'Eight Sleep';
            } else if (bundleId.includes('apple.health')) {
              sourceName = 'Apple Health';
            } else {
              // Use last part of bundle ID as fallback
              const parts = bundleId.split('.');
              sourceName = parts[parts.length - 1] || 'Unknown';
            }
          }
          // Try device name as last resort
          else if (sampleAny.device?.name) {
            sourceName = sampleAny.device.name;
          }
          
          // Map numeric sleep value to string name for consistency with old table
          const valueString = getSleepValueString(sleepValue);
          
          records.push({
            healthkit_uuid: sample.uuid || `sleep_${sample.startDate}_${sample.endDate}`,
            start_time: new Date(sample.startDate).toISOString(),
            end_time: new Date(sample.endDate).toISOString(),
            source: sourceName,
            qty: roundTo(durationHours, 2),
            value: valueString,
          });
        }
      }
      
      if (result.newAnchor) {
        sleepAnchor = result.newAnchor;
      }
      
      hasMoreData = result.samples.length === SLEEP_BATCH_SIZE;
      
      onProgress?.({
        phase: 'sleep',
        current: 0,
        total: 1,
        message: `Syncing sleep data... (${totalSleepSamples} samples)`,
      });
    }
    
    logger.info('HealthKit', `Sleep sync complete: ${totalSleepSamples} samples → ${records.length} records`);
    
    if (sleepAnchor) {
      await setAnchor('sleepAnalysis', sleepAnchor);
    }
  } catch (error) {
    logger.error('HealthKit', 'Error syncing sleep', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Also sync mindful minutes to metrics (with batching)
  try {
    const mindfulHkIdentifier = CATEGORY_TYPE_TO_HK_IDENTIFIER[MINDFUL_MAPPING.healthkitType];
    let mindfulAnchor = await getAnchor(MINDFUL_MAPPING.healthkitType);
    
    const MINDFUL_BATCH_SIZE = 2000;
    let batchCount = 0;
    let totalMindfulSamples = 0;
    let hasMoreData = true;
    
    // Accumulate daily totals across batches
    const dailyMindfulMap: Map<string, number> = new Map();
    
    while (hasMoreData) {
      batchCount++;
      
      const mindfulResult = await queryCategorySamplesWithAnchor(
        mindfulHkIdentifier as any,
        {
          limit: MINDFUL_BATCH_SIZE,
          anchor: mindfulAnchor || undefined,
        }
      );
      
      totalMindfulSamples += mindfulResult.samples.length;
      
      // Accumulate into daily totals
      for (const sample of mindfulResult.samples) {
        const dateKey = new Date(sample.startDate).toISOString().split('T')[0];
        const durationMinutes = calculateDurationHours(sample.startDate, sample.endDate) * 60;
        const existing = dailyMindfulMap.get(dateKey) || 0;
        dailyMindfulMap.set(dateKey, existing + durationMinutes);
      }
      
      if (mindfulResult.newAnchor) {
        mindfulAnchor = mindfulResult.newAnchor;
      }
      
      hasMoreData = mindfulResult.samples.length === MINDFUL_BATCH_SIZE;
    }
    
    // Convert to records and upload
    if (dailyMindfulMap.size > 0) {
      const mindfulRecords: HealthMetricRecord[] = Array.from(dailyMindfulMap).map(([date, value]) => ({
        healthkit_uuid: `${date}_${MINDFUL_MAPPING.canonicalType}`,
        date: getStartOfDay(date),
        type: MINDFUL_MAPPING.canonicalType,
        value: roundTo(value, 2),
        unit: MINDFUL_MAPPING.unit,
        timezone,
      }));
      
      await apiFetch<IngestResponse>(
        '/api/ingest/health-metrics',
        getToken,
        {
          method: 'POST',
          body: JSON.stringify({ records: mindfulRecords }),
        }
      );
      
      logger.info('HealthKit', `Mindful sync complete: ${totalMindfulSamples} samples → ${mindfulRecords.length} days`);
    }
    
    if (mindfulAnchor) {
      await setAnchor(MINDFUL_MAPPING.healthkitType, mindfulAnchor);
    }
  } catch (error) {
    logger.error('HealthKit', 'Error syncing mindful minutes', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Upload sleep records in batches
  if (records.length === 0) {
    return { inserted: 0, duplicates: 0 };
  }
  
  // Deduplicate by (start_time, end_time, value, source) to reduce data transfer
  // HealthKit often has duplicate entries with different UUIDs
  const dedupedRecords = deduplicateSleepRecords(records);
  const removedDupes = records.length - dedupedRecords.length;
  
  if (removedDupes > 0) {
    logger.info('HealthKit', `Deduplicated sleep records: ${records.length} → ${dedupedRecords.length} (removed ${removedDupes} client-side duplicates)`);
  }
  
  logger.info('HealthKit', `Uploading ${dedupedRecords.length} sleep records in batches...`);
  
  const result = await uploadInBatches(
    dedupedRecords,
    '/api/ingest/health-sleep',
    getToken,
    (uploaded, total) => {
      onProgress?.({
        phase: 'upload',
        current: uploaded,
        total,
        message: `Uploading sleep... ${uploaded}/${total}`,
      });
    }
  );
  
  logger.info('HealthKit', `Sleep upload complete: ${result.inserted} inserted, ${result.duplicates} duplicates`);
  return result;
}

/**
 * Sync workouts
 */
async function syncWorkouts(
  getToken: () => Promise<string | null>,
  onProgress?: SyncProgressCallback
): Promise<{ inserted: number; duplicates: number }> {
  const records: WorkoutRecord[] = [];
  const timezone = getTimezone();
  
  onProgress?.({
    phase: 'workouts',
    current: 0,
    total: 1,
    message: 'Syncing workouts...',
  });
  
  try {
    // Query workouts - the library doesn't support anchors for workouts yet,
    // so we query all and rely on server-side deduplication
    const workouts = await queryWorkoutSamples({
      limit: 0, // Get all
    });
    
    for (const workout of workouts) {
      // Cast workout to access properties - library types may not expose all fields
      const w = workout as any;
      
      const durationSeconds = calculateDurationSeconds(
        w.startDate,
        w.endDate
      );
      
      // Build metrics object
      const metrics: Record<string, { value: number; unit: string }> = {};
      
      metrics['duration'] = { value: durationSeconds, unit: 'seconds' };
      
      if (w.totalDistance) {
        metrics['Distance (mi)'] = {
          value: roundTo(convertUnit(w.totalDistance, 'm', 'mi'), 2),
          unit: 'mi',
        };
      }
      
      if (w.totalEnergyBurned) {
        metrics['Total Energy (kcal)'] = {
          value: roundTo(w.totalEnergyBurned, 0),
          unit: 'kcal',
        };
      }
      
      // Note: Heart rate stats require additional queries to workout statistics
      // This can be enhanced in the future
      
      records.push({
        healthkit_uuid: w.uuid || `workout_${w.startDate}_${w.endDate}`,
        type: getWorkoutTypeName(String(w.workoutActivityType)),
        start_time: new Date(w.startDate).toISOString(),
        end_time: new Date(w.endDate).toISOString(),
        duration_seconds: durationSeconds,
        timezone,
        metrics,
      });
    }
  } catch (error) {
    logger.error('HealthKit', 'Error syncing workouts', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  if (records.length === 0) {
    return { inserted: 0, duplicates: 0 };
  }
  
  logger.info('HealthKit', `Uploading ${records.length} workout records in batches...`);
  
  const result = await uploadInBatches(
    records,
    '/api/ingest/health-workouts',
    getToken,
    (uploaded, total) => {
      onProgress?.({
        phase: 'upload',
        current: uploaded,
        total,
        message: `Uploading workouts... ${uploaded}/${total}`,
      });
    }
  );
  
  logger.info('HealthKit', `Workouts upload complete: ${result.inserted} inserted, ${result.duplicates} duplicates`);
  return result;
}

/**
 * Full sync of all health data
 */
export interface SyncResult {
  success: boolean;
  metrics: { inserted: number; duplicates: number };
  sleep: { inserted: number; duplicates: number };
  workouts: { inserted: number; duplicates: number };
  error?: string;
}

export async function syncAllHealthData(
  getToken: () => Promise<string | null>,
  onProgress?: SyncProgressCallback
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    metrics: { inserted: 0, duplicates: 0 },
    sleep: { inserted: 0, duplicates: 0 },
    workouts: { inserted: 0, duplicates: 0 },
  };
  
  try {
    // Check if HealthKit is available
    const available = await checkHealthKitAvailable();
    if (!available) {
      result.error = 'HealthKit is not available on this device';
      return result;
    }
    
    // Request permissions
    onProgress?.({
      phase: 'permissions',
      current: 0,
      total: 1,
      message: 'Requesting permissions...',
    });
    
    const permissionsGranted = await requestHealthKitPermissions();
    if (!permissionsGranted) {
      result.error = 'Failed to get HealthKit permissions';
      return result;
    }
    
    // Sync metrics
    result.metrics = await syncQuantityMetrics(getToken, onProgress);
    
    // Sync sleep
    result.sleep = await syncSleep(getToken, onProgress);
    
    // Sync workouts
    result.workouts = await syncWorkouts(getToken, onProgress);
    
    // Update last sync time
    await setLastSyncTime();
    
    result.success = true;
    
    onProgress?.({
      phase: 'complete',
      current: 1,
      total: 1,
      message: 'Sync complete!',
    });
    
    return result;
  } catch (error) {
    logger.error('HealthKit', 'Sync failed with error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}
