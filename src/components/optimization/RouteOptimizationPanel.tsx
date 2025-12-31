import React, { useEffect } from 'react';
import { useRouteOptimization } from '@/hooks/useRouteOptimization';
import type { Activity } from '@/types/itinerary';
import type { TravelMode, OptimizationOptions } from '@/types/maps';

interface RouteOptimizationPanelProps {
  activities: Activity[];
  travelMode?: TravelMode;
  onApplyOptimization: (optimizedActivities: Activity[]) => void;
  className?: string;
}

/**
 * Route Optimization Panel
 * Suggests and applies route optimization to minimize travel time/distance
 */
export function RouteOptimizationPanel({
  activities,
  travelMode = 'driving',
  onApplyOptimization,
  className = '',
}: RouteOptimizationPanelProps) {
  const {
    optimizationResult,
    isOptimizing,
    error,
    shouldOptimize,
    optimize,
    applyOptimization,
    reset,
  } = useRouteOptimization(activities, travelMode);

  // Reset when activities change
  useEffect(() => {
    reset();
  }, [activities.length, reset]);

  // Handle optimization button click
  const handleOptimize = async () => {
    const options: OptimizationOptions = {
      fixFirst: false,
      fixLast: false,
      preferredMode: travelMode,
    };

    await optimize(activities, options);
  };

  // Handle apply button click
  const handleApply = () => {
    const optimized = applyOptimization();
    if (optimized) {
      onApplyOptimization(optimized);
      reset();
    }
  };

  // Don't show if too few activities
  if (activities.length < 3) {
    return null;
  }

  // Format distance/time for display
  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Suggestion Banner */}
      {!optimizationResult && shouldOptimize && (
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Your route could be optimized
              </p>
              <p className="text-sm text-blue-700 mt-1">
                We've detected potential backtracking. Optimize your route to save time and distance.
              </p>
            </div>
            <button
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
            </button>
          </div>
        </div>
      )}

      {/* No optimization needed */}
      {!optimizationResult && !shouldOptimize && (
        <div className="p-4">
          <div className="flex items-center gap-3 text-green-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium">Your route is already optimized</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isOptimizing && (
        <div className="p-6 flex items-center justify-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span className="text-gray-600 text-sm">Calculating optimal route...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-100">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Optimization failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Optimization Results */}
      {optimizationResult && optimizationResult.savings.distanceReduced > 0 && (
        <div className="p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="font-semibold text-gray-900">Optimized Route Found</h3>
              </div>
              <button
                onClick={reset}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Savings Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700 font-medium">Distance Saved</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {formatDistance(optimizationResult.savings.distanceReduced)}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700 font-medium">Time Saved</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {formatDuration(optimizationResult.savings.timeReduced)}
                </p>
              </div>
            </div>

            {/* New Totals */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 font-medium mb-2">New Route Totals</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Total Distance:</span>
                <span className="font-semibold text-gray-900">
                  {formatDistance(optimizationResult.totalDistance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-700">Total Duration:</span>
                <span className="font-semibold text-gray-900">
                  {formatDuration(optimizationResult.totalDuration)}
                </span>
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApply}
              className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Optimized Route
            </button>

            {/* Activity Order Preview */}
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600 font-medium mb-2">New Activity Order:</p>
              <ol className="space-y-1">
                {optimizationResult.optimizedActivities
                  .filter((act) => act.location.coordinates)
                  .slice(0, 5)
                  .map((activity, index) => (
                    <li key={activity.id} className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="truncate">{activity.location.name}</span>
                    </li>
                  ))}
                {optimizationResult.optimizedActivities.filter((act) => act.location.coordinates)
                  .length > 5 && (
                  <li className="text-sm text-gray-500 italic">
                    ... and{' '}
                    {optimizationResult.optimizedActivities.filter((act) => act.location.coordinates)
                      .length - 5}{' '}
                    more
                  </li>
                )}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* No improvement found */}
      {optimizationResult && optimizationResult.savings.distanceReduced <= 0 && (
        <div className="p-4">
          <div className="flex items-center gap-3 text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium">No better route found</p>
              <p className="text-sm text-gray-500 mt-1">
                Your current route order is already optimal.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
