import { useState, useEffect, useCallback } from 'react';
import type { NearbyPlace, NearbySearchRequest, GeoCoordinates } from '@/types/maps';
import { placesService } from '@/services/maps/placesService';

interface UseNearbyPlacesOptions {
  location?: GeoCoordinates;
  radius?: number;
  type?: string;
  keyword?: string;
  openNow?: boolean;
  minPrice?: number;
  maxPrice?: number;
  autoFetch?: boolean; // Auto-fetch when location changes
}

interface UseNearbyPlacesResult {
  places: NearbyPlace[];
  isLoading: boolean;
  error: string | null;
  search: (options?: Partial<NearbySearchRequest>) => Promise<void>;
  clear: () => void;
}

/**
 * Hook for searching nearby places
 * Supports category-based search with filters
 * Results are cached and sorted by distance
 */
export function useNearbyPlaces(
  options: UseNearbyPlacesOptions = {}
): UseNearbyPlacesResult {
  const {
    location,
    radius = 2000,
    type,
    keyword,
    openNow,
    minPrice,
    maxPrice,
    autoFetch = false,
  } = options;

  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (overrides?: Partial<NearbySearchRequest>) => {
      const searchLocation = overrides?.location || location;

      if (!searchLocation) {
        setError('Location is required for nearby search');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const request: NearbySearchRequest = {
          location: searchLocation,
          radius: overrides?.radius ?? radius,
          type: overrides?.type ?? type,
          keyword: overrides?.keyword ?? keyword,
          openNow: overrides?.openNow ?? openNow,
          minPrice: overrides?.minPrice ?? minPrice,
          maxPrice: overrides?.maxPrice ?? maxPrice,
        };

        const results = await placesService.nearbySearch(request);
        setPlaces(results);
        setError(null);
      } catch (err) {
        console.error('Nearby search error:', err);
        setError(err instanceof Error ? err.message : 'Failed to search nearby places');
        setPlaces([]);
      } finally {
        setIsLoading(false);
      }
    },
    [location, radius, type, keyword, openNow, minPrice, maxPrice]
  );

  const clear = useCallback(() => {
    setPlaces([]);
    setError(null);
    setIsLoading(false);
  }, []);

  // Auto-fetch when location changes (if enabled)
  useEffect(() => {
    if (autoFetch && location) {
      search();
    }
  }, [autoFetch, location, search]);

  return {
    places,
    isLoading,
    error,
    search,
    clear,
  };
}
