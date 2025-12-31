import { getDB } from './index';
import type { MapsCacheEntry } from '@/types/maps';
import { MAPS_CONFIG } from '@/config/mapsConfig';

const DEFAULT_TTL = {
  directions: MAPS_CONFIG.CACHE.DIRECTIONS_TRAFFIC_TTL_MS,
  directions_static: MAPS_CONFIG.CACHE.DIRECTIONS_STATIC_TTL_MS,
  place_details: MAPS_CONFIG.CACHE.PLACE_DETAILS_TTL_MS,
  nearby: MAPS_CONFIG.CACHE.NEARBY_SEARCH_TTL_MS,
  distance_matrix: MAPS_CONFIG.CACHE.DISTANCE_MATRIX_TTL_MS,
};

export const mapsCacheRepository = {
  /**
   * Get cached entry by key
   * Returns null if expired or missing
   */
  async get<T>(key: string): Promise<T | null> {
    const db = await getDB();
    const entry = await db.get('mapsCache', key);

    if (!entry) return null;

    // Check expiration
    if (new Date(entry.expiresAt) < new Date()) {
      await db.delete('mapsCache', key);
      return null;
    }

    // Update hit count
    entry.hitCount++;
    await db.put('mapsCache', entry);

    return entry.data as T;
  },

  /**
   * Store data in cache
   */
  async set(
    key: string,
    data: unknown,
    type: MapsCacheEntry['type'],
    hasTrafficData: boolean = false
  ): Promise<void> {
    const db = await getDB();
    const now = new Date().toISOString();

    // Determine TTL
    let ttl = DEFAULT_TTL[type];
    if (type === 'directions' && !hasTrafficData) {
      ttl = DEFAULT_TTL.directions_static;
    }

    const entry: MapsCacheEntry = {
      key,
      type,
      data,
      fetchedAt: now,
      expiresAt: new Date(Date.now() + ttl).toISOString(),
      hitCount: 0,
    };

    await db.put('mapsCache', entry);
  },

  /**
   * Delete specific cache entry
   */
  async delete(key: string): Promise<void> {
    const db = await getDB();
    await db.delete('mapsCache', key);
  },

  /**
   * Clear all expired entries
   * Call this on app startup
   */
  async clearExpired(): Promise<number> {
    const db = await getDB();
    const now = new Date().toISOString();

    const expired = await db.getAllFromIndex(
      'mapsCache',
      'by-expires',
      IDBKeyRange.upperBound(now)
    );

    for (const entry of expired) {
      await db.delete('mapsCache', entry.key);
    }

    return expired.length;
  },

  /**
   * Clear all cache entries of a specific type
   */
  async clearByType(type: MapsCacheEntry['type']): Promise<void> {
    const db = await getDB();
    const entries = await db.getAllFromIndex('mapsCache', 'by-type', type);

    for (const entry of entries) {
      await db.delete('mapsCache', entry.key);
    }
  },

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    byType: Record<string, number>;
    oldestEntry: string | null;
  }> {
    const db = await getDB();
    const all = await db.getAll('mapsCache');

    const byType: Record<string, number> = {};
    let oldestEntry: string | null = null;

    for (const entry of all) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      if (!oldestEntry || entry.fetchedAt < oldestEntry) {
        oldestEntry = entry.fetchedAt;
      }
    }

    return {
      totalEntries: all.length,
      byType,
      oldestEntry,
    };
  },
};
