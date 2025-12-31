import { useState, useEffect, useCallback, useRef } from 'react';
import {
  liveTrackingService,
  type LiveLocation,
  type TrackingOptions,
} from '@/services/liveTrackingService';
import type { GeoCoordinates } from '@/types/maps';

interface UseLiveTrackingOptions extends TrackingOptions {
  autoStart?: boolean; // Auto-start tracking on mount
  target?: GeoCoordinates; // Target destination for distance calculation
}

interface UseLiveTrackingResult {
  location: LiveLocation | null;
  error: GeolocationPositionError | null;
  isTracking: boolean;
  isSupported: boolean;
  distanceToTarget: number | null; // meters
  startTracking: () => void;
  stopTracking: () => void;
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook for live location tracking
 * Manages geolocation watch and provides real-time location updates
 */
export function useLiveTracking(
  options: UseLiveTrackingOptions = {}
): UseLiveTrackingResult {
  const { autoStart = false, target, ...trackingOptions } = options;

  const [location, setLocation] = useState<LiveLocation | null>(
    liveTrackingService.getLastLocation()
  );
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [distanceToTarget, setDistanceToTarget] = useState<number | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const unsubscribeErrorRef = useRef<(() => void) | null>(null);

  const isSupported = liveTrackingService.isSupported();

  /**
   * Start location tracking
   */
  const startTracking = useCallback(() => {
    if (!isSupported) {
      console.error('Geolocation not supported');
      return;
    }

    if (isTracking) {
      return;
    }

    // Subscribe to location updates
    unsubscribeRef.current = liveTrackingService.subscribe((newLocation) => {
      setLocation(newLocation);
      setError(null);

      // Calculate distance to target if provided
      if (target) {
        const distance = liveTrackingService.getDistanceToTarget(target);
        setDistanceToTarget(distance);
      }
    });

    // Subscribe to errors
    unsubscribeErrorRef.current = liveTrackingService.subscribeToErrors((err) => {
      setError(err);
    });

    // Start tracking
    liveTrackingService.startTracking(trackingOptions);
    setIsTracking(true);
  }, [isSupported, isTracking, trackingOptions, target]);

  /**
   * Stop location tracking
   */
  const stopTracking = useCallback(() => {
    if (!isTracking) {
      return;
    }

    // Unsubscribe from updates
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (unsubscribeErrorRef.current) {
      unsubscribeErrorRef.current();
      unsubscribeErrorRef.current = null;
    }

    // Stop tracking
    liveTrackingService.stopTracking();
    setIsTracking(false);
  }, [isTracking]);

  /**
   * Request location permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    return liveTrackingService.requestPermission();
  }, []);

  // Auto-start tracking if enabled
  useEffect(() => {
    if (autoStart && isSupported) {
      startTracking();
    }

    // Cleanup on unmount
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  // Update distance when target changes
  useEffect(() => {
    if (location && target) {
      const distance = liveTrackingService.getDistanceToTarget(target);
      setDistanceToTarget(distance);
    }
  }, [location, target]);

  return {
    location,
    error,
    isTracking,
    isSupported,
    distanceToTarget,
    startTracking,
    stopTracking,
    requestPermission,
  };
}
