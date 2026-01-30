/**
 * Background sync using expo-background-fetch.
 * 
 * Registers a background task that runs HealthKit sync approximately
 * every 30 minutes (iOS may delay or skip based on battery/usage patterns).
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_SYNC_TASK = 'TIMTRACKER_BACKGROUND_SYNC';
const BACKGROUND_SYNC_INTERVAL = 30 * 60; // 30 minutes in seconds
const LAST_BACKGROUND_SYNC_KEY = '@background_sync_last_run';

// Store for the token getter - will be set when app initializes
let cachedGetToken: (() => Promise<string | null>) | null = null;

/**
 * Set the token getter function (call this from app initialization)
 */
export function setTokenGetter(getToken: () => Promise<string | null>): void {
  cachedGetToken = getToken;
}

/**
 * Define the background task
 * Note: This must be called at module load time (outside of any component)
 */
if (Platform.OS === 'ios') {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
      console.log('[BackgroundSync] Task started');
      
      if (!cachedGetToken) {
        console.log('[BackgroundSync] No token getter available');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // Import sync service lazily to avoid circular deps
      const { runFullSync } = require('./syncService');
      
      const result = await runFullSync(cachedGetToken, { force: true });
      
      // Record when we ran
      await AsyncStorage.setItem(LAST_BACKGROUND_SYNC_KEY, new Date().toISOString());
      
      if (result.success) {
        const total = result.healthSyncResult
          ? result.healthSyncResult.metrics.inserted +
            result.healthSyncResult.sleep.inserted +
            result.healthSyncResult.workouts.inserted
          : 0;
        
        console.log(`[BackgroundSync] Success: synced ${total} new records`);
        return total > 0
          ? BackgroundFetch.BackgroundFetchResult.NewData
          : BackgroundFetch.BackgroundFetchResult.NoData;
      } else {
        console.log('[BackgroundSync] Failed:', result.error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    } catch (error) {
      console.error('[BackgroundSync] Error:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

/**
 * Register the background fetch task
 */
export async function registerBackgroundSync(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    console.log('[BackgroundSync] Not available on this platform');
    return false;
  }

  try {
    // Check if already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    
    if (isRegistered) {
      console.log('[BackgroundSync] Already registered');
      return true;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: BACKGROUND_SYNC_INTERVAL, // 30 minutes
      stopOnTerminate: false, // Keep running after app is closed
      startOnBoot: true, // Start after device reboot
    });

    console.log('[BackgroundSync] Registered successfully');
    return true;
  } catch (error) {
    console.error('[BackgroundSync] Registration failed:', error);
    return false;
  }
}

/**
 * Unregister the background fetch task
 */
export async function unregisterBackgroundSync(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('[BackgroundSync] Unregistered');
    }
  } catch (error) {
    console.error('[BackgroundSync] Unregister failed:', error);
  }
}

/**
 * Get the status of background fetch
 */
export async function getBackgroundSyncStatus(): Promise<{
  isRegistered: boolean;
  status: BackgroundFetch.BackgroundFetchStatus | null;
  lastRun: string | null;
}> {
  if (Platform.OS !== 'ios') {
    return { isRegistered: false, status: null, lastRun: null };
  }

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    const status = await BackgroundFetch.getStatusAsync();
    const lastRun = await AsyncStorage.getItem(LAST_BACKGROUND_SYNC_KEY);

    return { isRegistered, status, lastRun };
  } catch {
    return { isRegistered: false, status: null, lastRun: null };
  }
}

/**
 * Check if background fetch is available and enabled
 */
export async function isBackgroundSyncAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  try {
    const status = await BackgroundFetch.getStatusAsync();
    return status === BackgroundFetch.BackgroundFetchStatus.Available;
  } catch {
    return false;
  }
}
