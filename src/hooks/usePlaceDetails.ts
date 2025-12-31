import { useState, useEffect, useCallback } from 'react';
import type { PlaceDetails } from '@/types/maps';
import { placesService } from '@/services/maps/placesService';

interface UsePlaceDetailsResult {
  details: PlaceDetails | null;
  isLoading: boolean;
  error: string | null;
  fetchDetails: (placeId: string, useSessionToken?: boolean) => Promise<void>;
  clear: () => void;
}

/**
 * Hook to fetch and manage Place Details
 * Automatically fetches when placeId changes (if provided)
 * Results are cached for 24 hours by the service layer
 */
export function usePlaceDetails(
  initialPlaceId?: string,
  useSessionToken: boolean = true
): UsePlaceDetailsResult {
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlaceId, setCurrentPlaceId] = useState<string | undefined>(
    initialPlaceId
  );

  const fetchDetails = useCallback(
    async (placeId: string, useToken: boolean = useSessionToken) => {
      if (!placeId) {
        setDetails(null);
        return;
      }

      setCurrentPlaceId(placeId);
      setIsLoading(true);
      setError(null);

      try {
        const result = await placesService.getDetails(placeId, useToken);
        setDetails(result);
        setError(null);
      } catch (err) {
        console.error('Place details fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch place details');
        setDetails(null);
      } finally {
        setIsLoading(false);
      }
    },
    [useSessionToken]
  );

  const clear = useCallback(() => {
    setDetails(null);
    setError(null);
    setIsLoading(false);
    setCurrentPlaceId(undefined);
  }, []);

  // Auto-fetch on placeId change
  useEffect(() => {
    if (currentPlaceId) {
      fetchDetails(currentPlaceId, useSessionToken);
    } else {
      setDetails(null);
    }
  }, [currentPlaceId, fetchDetails, useSessionToken]);

  return {
    details,
    isLoading,
    error,
    fetchDetails,
    clear,
  };
}
