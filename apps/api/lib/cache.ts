/**
 * Simple in-memory cache for API responses
 * Cache entries expire after 5 minutes by default
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get a value from the cache
 * Returns undefined if not found or expired
 */
export function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;

  if (Date.now() - entry.timestamp > DEFAULT_TTL_MS) {
    cache.delete(key);
    return undefined;
  }

  return entry.data as T;
}

/**
 * Set a value in the cache
 */
export function setCached<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Create a cache key from request parameters
 */
export function createCacheKey(endpoint: string, params: Record<string, string | number | undefined>): string {
  const sortedParams = Object.entries(params)
    .filter(([_, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `${endpoint}?${sortedParams}`;
}
