/**
 * Storage for HealthKit sync anchors.
 * 
 * Anchors are stored per sample type and allow us to fetch only
 * new/changed samples since the last sync.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncAnchor } from './types';

const ANCHOR_PREFIX = '@healthkit_anchor_';
const LAST_SYNC_KEY = '@healthkit_last_sync';

/**
 * Get the stored anchor for a HealthKit type
 */
export async function getAnchor(healthkitType: string): Promise<string | null> {
  try {
    const key = `${ANCHOR_PREFIX}${healthkitType}`;
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;
    
    const parsed: SyncAnchor = JSON.parse(data);
    return parsed.anchor;
  } catch (error) {
    console.error(`Error getting anchor for ${healthkitType}:`, error);
    return null;
  }
}

/**
 * Store an anchor for a HealthKit type
 */
export async function setAnchor(
  healthkitType: string,
  anchor: string
): Promise<void> {
  try {
    const key = `${ANCHOR_PREFIX}${healthkitType}`;
    const data: SyncAnchor = {
      anchor,
      lastSyncedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error setting anchor for ${healthkitType}:`, error);
    throw error;
  }
}

/**
 * Clear all stored anchors (for full re-sync)
 */
export async function clearAllAnchors(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const anchorKeys = keys.filter((k) => k.startsWith(ANCHOR_PREFIX));
    await AsyncStorage.multiRemove(anchorKeys);
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
  } catch (error) {
    console.error('Error clearing anchors:', error);
    throw error;
  }
}

/**
 * Get the timestamp of the last successful sync
 */
export async function getLastSyncTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_SYNC_KEY);
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
}

/**
 * Update the last successful sync timestamp
 */
export async function setLastSyncTime(timestamp?: string): Promise<void> {
  try {
    const time = timestamp || new Date().toISOString();
    await AsyncStorage.setItem(LAST_SYNC_KEY, time);
  } catch (error) {
    console.error('Error setting last sync time:', error);
    throw error;
  }
}

/**
 * Get sync status info for display
 */
export async function getSyncStatus(): Promise<{
  lastSyncTime: string | null;
  anchorCount: number;
}> {
  try {
    const lastSyncTime = await getLastSyncTime();
    const keys = await AsyncStorage.getAllKeys();
    const anchorCount = keys.filter((k) => k.startsWith(ANCHOR_PREFIX)).length;
    return { lastSyncTime, anchorCount };
  } catch (error) {
    console.error('Error getting sync status:', error);
    return { lastSyncTime: null, anchorCount: 0 };
  }
}
