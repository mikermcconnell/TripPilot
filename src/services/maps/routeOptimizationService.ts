import type { Activity } from '@/types/itinerary';
import type { TravelMode } from '@/types/maps';
import { getDistanceKm } from '@/utils/geo';
import { distanceMatrixService } from './distanceMatrixService';

export interface OptimizationResult {
  optimizedActivities: Activity[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  savings: {
    distanceReduced: number; // meters
    timeReduced: number; // seconds
  };
}

export interface OptimizationOptions {
  fixFirst?: boolean; // Keep first activity fixed (e.g., hotel)
  fixLast?: boolean; // Keep last activity fixed
  preferredMode?: TravelMode;
  departureTime?: Date;
}

/**
 * Route Optimization Service
 * Uses distance matrix and greedy nearest-neighbor algorithm
 * to optimize activity order for minimal travel
 */
export const routeOptimizationService = {
  /**
   * Optimize activity order using nearest-neighbor algorithm
   * @param activities - Activities to optimize
   * @param options - Optimization constraints
   * @returns Optimized order with metrics
   */
  async optimizeRoute(
    activities: Activity[],
    options: OptimizationOptions = {}
  ): Promise<OptimizationResult> {
    const { fixFirst = false, fixLast = false, preferredMode = 'driving' } = options;

    // Need at least 3 activities to optimize (2 if both ends fixed)
    if (activities.length < 3) {
      return {
        optimizedActivities: activities,
        totalDistance: 0,
        totalDuration: 0,
        savings: { distanceReduced: 0, timeReduced: 0 },
      };
    }

    // Filter out activities without coordinates
    const validActivities = activities.filter(
      (act) => act.location.coordinates?.lat && act.location.coordinates?.lng
    );

    if (validActivities.length < 3) {
      return {
        optimizedActivities: activities,
        totalDistance: 0,
        totalDuration: 0,
        savings: { distanceReduced: 0, timeReduced: 0 },
      };
    }

    // Calculate original route metrics
    const originalMetrics = await this.calculateRouteMetrics(
      validActivities,
      preferredMode
    );

    // Determine which activities can be reordered
    let fixedStart: Activity[] = [];
    let toOptimize: Activity[] = [...validActivities];
    let fixedEnd: Activity[] = [];

    if (fixFirst) {
      fixedStart = [toOptimize[0]];
      toOptimize = toOptimize.slice(1);
    }

    if (fixLast && toOptimize.length > 0) {
      fixedEnd = [toOptimize[toOptimize.length - 1]];
      toOptimize = toOptimize.slice(0, -1);
    }

    // Apply nearest-neighbor optimization
    const optimized = await this.nearestNeighborOptimization(
      toOptimize,
      fixedStart[0],
      fixedEnd[0],
      preferredMode
    );

    // Combine fixed and optimized
    const finalOrder = [...fixedStart, ...optimized, ...fixedEnd];

    // Calculate optimized route metrics
    const optimizedMetrics = await this.calculateRouteMetrics(
      finalOrder,
      preferredMode
    );

    // Calculate activities that weren't included (no coords)
    const optimizedIds = new Set(finalOrder.map((a) => a.id));
    const nonOptimized = activities.filter((a) => !optimizedIds.has(a.id));

    return {
      optimizedActivities: [...finalOrder, ...nonOptimized],
      totalDistance: optimizedMetrics.totalDistance,
      totalDuration: optimizedMetrics.totalDuration,
      savings: {
        distanceReduced: originalMetrics.totalDistance - optimizedMetrics.totalDistance,
        timeReduced: originalMetrics.totalDuration - optimizedMetrics.totalDuration,
      },
    };
  },

  /**
   * Nearest-neighbor greedy algorithm
   * Picks closest unvisited activity at each step
   */
  async nearestNeighborOptimization(
    activities: Activity[],
    startActivity?: Activity,
    endActivity?: Activity,
    _mode: TravelMode = 'driving'
  ): Promise<Activity[]> {
    if (activities.length === 0) return [];
    if (activities.length === 1) return activities;

    const result: Activity[] = [];
    const unvisited = new Set(activities);
    let current = startActivity || activities[0];

    // If start is provided and in list, remove it from unvisited
    if (startActivity && unvisited.has(startActivity)) {
      unvisited.delete(startActivity);
    } else if (!startActivity) {
      unvisited.delete(current);
      result.push(current);
    }

    // Build route using nearest neighbor
    while (unvisited.size > 0) {
      // If only one left and it's the end, we're done
      if (unvisited.size === 1 && endActivity && unvisited.has(endActivity)) {
        break;
      }

      let nearest: Activity | null = null;
      let minDistance = Infinity;

      const currentCoords = current.location.coordinates!;

      for (const candidate of unvisited) {
        // Skip end activity if specified (save for last)
        if (endActivity && candidate.id === endActivity.id) {
          continue;
        }

        const candidateCoords = candidate.location.coordinates!;
        const distance = getDistanceKm(
          currentCoords.lat,
          currentCoords.lng,
          candidateCoords.lat,
          candidateCoords.lng
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearest = candidate;
        }
      }

      if (nearest) {
        result.push(nearest);
        unvisited.delete(nearest);
        current = nearest;
      } else {
        // Shouldn't happen, but break if no nearest found
        break;
      }
    }

    return result;
  },

  /**
   * Calculate total distance and duration for a route
   * Uses parallel API calls for better performance
   */
  async calculateRouteMetrics(
    activities: Activity[],
    mode: TravelMode
  ): Promise<{ totalDistance: number; totalDuration: number }> {
    // Collect all legs
    const legs: Array<{ start: Activity; end: Activity }> = [];
    for (let i = 0; i < activities.length - 1; i++) {
      const start = activities[i];
      const end = activities[i + 1];

      if (start.location.coordinates && end.location.coordinates) {
        legs.push({ start, end });
      }
    }

    if (legs.length === 0) {
      return { totalDistance: 0, totalDuration: 0 };
    }

    // Call ALL legs in parallel
    const results = await Promise.allSettled(
      legs.map((leg) =>
        distanceMatrixService.querySingleMode(
          leg.start.location.coordinates!,
          leg.end.location.coordinates!,
          mode
        )
      )
    );

    // Aggregate results with fallback for failures
    let totalDistance = 0;
    let totalDuration = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value && result.value.available) {
        totalDistance += result.value.distance;
        totalDuration += result.value.duration;
      } else {
        // Fallback to straight-line distance if API fails
        const leg = legs[index];
        const distance =
          getDistanceKm(
            leg.start.location.coordinates!.lat,
            leg.start.location.coordinates!.lng,
            leg.end.location.coordinates!.lat,
            leg.end.location.coordinates!.lng
          ) * 1000;
        totalDistance += distance;
        // Estimate duration based on mode
        const speedKmH = mode === 'walking' ? 5 : mode === 'transit' ? 30 : 50;
        totalDuration += (distance / 1000 / speedKmH) * 3600;
      }
    });

    return { totalDistance, totalDuration };
  },

  /**
   * Check if optimization would be beneficial
   * Returns true if route seems inefficient
   */
  async shouldOptimize(activities: Activity[], _mode: TravelMode = 'driving'): Promise<boolean> {
    if (activities.length < 3) return false;

    const validActivities = activities.filter(
      (act) => act.location.coordinates?.lat && act.location.coordinates?.lng
    );

    if (validActivities.length < 3) return false;

    // Check for obvious inefficiencies (backtracking)
    let backtrackCount = 0;

    for (let i = 0; i < validActivities.length - 2; i++) {
      const a = validActivities[i].location.coordinates!;
      const b = validActivities[i + 1].location.coordinates!;
      const c = validActivities[i + 2].location.coordinates!;

      const distAB = getDistanceKm(a.lat, a.lng, b.lat, b.lng);
      const distBC = getDistanceKm(b.lat, b.lng, c.lat, c.lng);
      const distAC = getDistanceKm(a.lat, a.lng, c.lat, c.lng);

      // If going A->B->C is significantly longer than A->C, there's backtracking
      if (distAB + distBC > distAC * 1.5) {
        backtrackCount++;
      }
    }

    // Suggest optimization if there are 2+ instances of backtracking
    return backtrackCount >= 2;
  },
};
