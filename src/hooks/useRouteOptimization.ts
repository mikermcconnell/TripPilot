import { useState, useCallback, useEffect } from 'react';
import type { Activity } from '@/types/itinerary';
import type { TravelMode } from '@/types/maps';
import {
  routeOptimizationService,
  type OptimizationResult,
  type OptimizationOptions,
} from '@/services/maps/routeOptimizationService';

interface UseRouteOptimizationResult {
  optimizationResult: OptimizationResult | null;
  isOptimizing: boolean;
  error: string | null;
  shouldOptimize: boolean;
  checkIfOptimizationNeeded: () => Promise<void>;
  optimize: (activities: Activity[], options?: OptimizationOptions) => Promise<void>;
  applyOptimization: () => Activity[] | null;
  reset: () => void;
}

/**
 * Hook for route optimization
 * Checks if optimization is beneficial and provides optimization controls
 */
export function useRouteOptimization(
  initialActivities?: Activity[],
  preferredMode: TravelMode = 'driving'
): UseRouteOptimizationResult {
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldOptimize, setShouldOptimize] = useState(false);
  const [currentActivities, setCurrentActivities] = useState<Activity[] | undefined>(
    initialActivities
  );

  /**
   * Check if current route would benefit from optimization
   */
  const checkIfOptimizationNeeded = useCallback(async () => {
    const activities = currentActivities;
    if (!activities || activities.length < 3) {
      setShouldOptimize(false);
      return;
    }

    try {
      const needed = await routeOptimizationService.shouldOptimize(activities, preferredMode);
      setShouldOptimize(needed);
    } catch (err) {
      console.error('Error checking optimization need:', err);
      setShouldOptimize(false);
    }
  }, [currentActivities, preferredMode]);

  /**
   * Run route optimization
   */
  const optimize = useCallback(
    async (activities: Activity[], options: OptimizationOptions = {}) => {
      if (activities.length < 3) {
        setError('Need at least 3 activities to optimize');
        return;
      }

      setIsOptimizing(true);
      setError(null);
      setCurrentActivities(activities);

      try {
        const result = await routeOptimizationService.optimizeRoute(activities, {
          ...options,
          preferredMode,
        });

        setOptimizationResult(result);
        setError(null);
      } catch (err) {
        console.error('Optimization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to optimize route');
        setOptimizationResult(null);
      } finally {
        setIsOptimizing(false);
      }
    },
    [preferredMode]
  );

  /**
   * Apply optimization result
   * Returns optimized activities or null if no optimization available
   */
  const applyOptimization = useCallback((): Activity[] | null => {
    if (!optimizationResult) return null;

    // Return optimized activities
    return optimizationResult.optimizedActivities;
  }, [optimizationResult]);

  /**
   * Reset optimization state
   */
  const reset = useCallback(() => {
    setOptimizationResult(null);
    setError(null);
    setShouldOptimize(false);
  }, []);

  // Auto-check when activities change
  useEffect(() => {
    if (currentActivities && currentActivities.length >= 3) {
      checkIfOptimizationNeeded();
    }
  }, [currentActivities, checkIfOptimizationNeeded]);

  return {
    optimizationResult,
    isOptimizing,
    error,
    shouldOptimize,
    checkIfOptimizationNeeded,
    optimize,
    applyOptimization,
    reset,
  };
}
