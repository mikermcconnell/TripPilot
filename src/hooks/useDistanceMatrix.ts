import { useState, useEffect, useCallback } from 'react';
import type { DayItinerary } from '@/types/itinerary';
import type { DayTravelMatrix, TravelLegData } from '@/types/maps';
import { distanceMatrixService } from '@/services/maps/distanceMatrixService';

interface UseDistanceMatrixResult {
  matrix: DayTravelMatrix | null;
  isLoading: boolean;
  error: string | null;
  getLegData: (startId: string, endId: string) => TravelLegData | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to calculate and cache distance matrix for a day's activities
 * Automatically calculates on day/tripId/tripDate changes
 */
export function useDistanceMatrix(
  day: DayItinerary | null,
  tripId: string | null,
  tripDate: string | null
): UseDistanceMatrixResult {
  const [matrix, setMatrix] = useState<DayTravelMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateMatrix = useCallback(async () => {
    if (!day || !tripId || !tripDate) {
      setMatrix(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await distanceMatrixService.calculateDayMatrix(
        day,
        tripId,
        tripDate
      );
      setMatrix(result);
    } catch (err) {
      console.error('Distance matrix calculation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate distances');
    } finally {
      setIsLoading(false);
    }
  }, [day, tripId, tripDate]);

  // Auto-calculate on day change
  useEffect(() => {
    calculateMatrix();
  }, [calculateMatrix]);

  // Helper to get specific leg data
  const getLegData = useCallback(
    (startId: string, endId: string): TravelLegData | null => {
      if (!matrix) return null;
      return matrix.legs.find(
        (leg) => leg.startActivityId === startId && leg.endActivityId === endId
      ) || null;
    },
    [matrix]
  );

  return {
    matrix,
    isLoading,
    error,
    getLegData,
    refresh: calculateMatrix,
  };
}
