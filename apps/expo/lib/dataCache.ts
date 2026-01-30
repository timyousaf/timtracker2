/**
 * Data caching layer for API responses.
 * Stores data in AsyncStorage so charts can display cached data
 * immediately while fresh data loads in the background.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@data_cache_';
const CACHE_TIMESTAMP_SUFFIX = '_timestamp';

// Cache expiration time (24 hours) - after this, we'll force a refresh
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Get cached data for a key
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    
    // Check if cache is too old
    const age = Date.now() - entry.timestamp;
    if (age > CACHE_MAX_AGE_MS) {
      // Cache is stale, but still return it - caller can decide whether to use
      console.log(`Cache for ${key} is stale (${Math.round(age / 1000 / 60)} min old)`);
    }
    
    return entry.data;
  } catch (error) {
    console.error(`Error reading cache for ${key}:`, error);
    return null;
  }
}

/**
 * Store data in cache
 */
export async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.error(`Error writing cache for ${key}:`, error);
  }
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Get cache age in milliseconds (returns null if not cached)
 */
export async function getCacheAge(key: string): Promise<number | null> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const entry: CacheEntry<unknown> = JSON.parse(cached);
    return Date.now() - entry.timestamp;
  } catch {
    return null;
  }
}

/**
 * Generate a cache key from parameters
 */
export function makeCacheKey(base: string, params?: Record<string, any>): string {
  if (!params) return base;
  
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  
  return `${base}?${sortedParams}`;
}
