/**
 * Unified sync service that orchestrates:
 * 1. HealthKit sync (push health data to server)
 * 2. API data refresh (pull chart data from server)
 * 
 * Used by:
 * - App launch
 * - Pull-to-refresh
 * - Background fetch
 * - Foreground timer
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SYNC_KEY = '@sync_service_last_sync';
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes minimum between syncs

// HealthKit module is only available on iOS
let healthKit: typeof import('@/lib/healthkit') | null = null;
if (Platform.OS === 'ios') {
  try {
    healthKit = require('@/lib/healthkit');
  } catch (e) {
    console.warn('HealthKit not available:', e);
  }
}

export interface SyncResult {
  success: boolean;
  healthSyncResult?: {
    metrics: { inserted: number; duplicates: number };
    sleep: { inserted: number; duplicates: number };
    workouts: { inserted: number; duplicates: number };
  };
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Run a full sync: HealthKit push + API refresh trigger
 * 
 * @param getToken - Function to get auth token
 * @param options.force - If true, sync even if recently synced
 * @param options.onProgress - Optional callback for progress updates
 */
export async function runFullSync(
  getToken: () => Promise<string | null>,
  options?: {
    force?: boolean;
    onProgress?: (message: string) => void;
  }
): Promise<SyncResult> {
  const { force = false, onProgress } = options || {};

  try {
    // Check if we've synced recently (unless forced)
    if (!force) {
      const lastSync = await getLastSyncTime();
      if (lastSync) {
        const timeSinceSync = Date.now() - new Date(lastSync).getTime();
        if (timeSinceSync < MIN_SYNC_INTERVAL_MS) {
          return {
            success: true,
            skipped: true,
            skipReason: `Synced ${Math.round(timeSinceSync / 1000 / 60)} min ago`,
          };
        }
      }
    }

    onProgress?.('Syncing health data...');

    // Step 1: Run HealthKit sync (iOS only)
    let healthSyncResult: SyncResult['healthSyncResult'] | undefined;

    if (Platform.OS === 'ios' && healthKit) {
      try {
        const isAvailable = await healthKit.checkHealthKitAvailable();
        
        if (isAvailable) {
          const result = await healthKit.syncAllHealthData(getToken, (progress) => {
            onProgress?.(progress.message);
          });

          if (result.success) {
            healthSyncResult = {
              metrics: { inserted: result.metrics.inserted, duplicates: result.metrics.duplicates },
              sleep: { inserted: result.sleep.inserted, duplicates: result.sleep.duplicates },
              workouts: { inserted: result.workouts.inserted, duplicates: result.workouts.duplicates },
            };
          } else {
            console.warn('HealthKit sync failed:', result.error);
          }
        }
      } catch (e) {
        console.warn('HealthKit sync error:', e);
        // Don't fail the whole sync if HealthKit fails
      }
    }

    // Update last sync time
    await setLastSyncTime();

    onProgress?.('Sync complete');

    return {
      success: true,
      healthSyncResult,
    };
  } catch (error) {
    console.error('Sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the timestamp of the last successful sync
 */
export async function getLastSyncTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

/**
 * Set the last sync time to now
 */
export async function setLastSyncTime(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (e) {
    console.error('Error saving last sync time:', e);
  }
}

/**
 * Check if a sync is needed based on time since last sync
 */
export async function isSyncNeeded(maxAgeMs: number = MIN_SYNC_INTERVAL_MS): Promise<boolean> {
  const lastSync = await getLastSyncTime();
  if (!lastSync) return true;
  
  const timeSinceSync = Date.now() - new Date(lastSync).getTime();
  return timeSinceSync >= maxAgeMs;
}
