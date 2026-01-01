import { useEffect, useRef } from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import type { GeoCoordinates } from '@/types/maps';

interface LiveLocationMarkerProps {
  target?: GeoCoordinates; // Optional target for distance calculation
  showAccuracyCircle?: boolean;
  onLocationUpdate?: (location: { coordinates: GeoCoordinates; accuracy: number }) => void;
  className?: string;
}

/**
 * Live Location Marker
 * Displays user's real-time location on the map with pulsing animation
 */
export function LiveLocationMarker({
  target,
  showAccuracyCircle = true,
  onLocationUpdate,
  className = '',
}: LiveLocationMarkerProps) {
  const { location, isTracking, startTracking } = useLiveTracking({
    autoStart: true,
    enableHighAccuracy: true,
    target,
  });

  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const onLocationUpdateRef = useRef(onLocationUpdate);

  // Keep callback ref up to date
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
  }, [onLocationUpdate]);

  // Notify parent of location updates without causing re-renders
  useEffect(() => {
    if (location && onLocationUpdateRef.current) {
      onLocationUpdateRef.current({
        coordinates: location.coordinates,
        accuracy: location.accuracy,
      });
    }
  }, [location]);

  // Start tracking if not already
  useEffect(() => {
    if (!isTracking) {
      startTracking();
    }
  }, [isTracking, startTracking]);

  // Update accuracy circle
  useEffect(() => {
    if (!location || !showAccuracyCircle) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null);
        accuracyCircleRef.current = null;
      }
      return;
    }

    // Create or update accuracy circle
    if (!accuracyCircleRef.current && mapRef.current) {
      accuracyCircleRef.current = new google.maps.Circle({
        map: mapRef.current,
        center: location.coordinates,
        radius: location.accuracy,
        fillColor: '#4285F4',
        fillOpacity: 0.1,
        strokeColor: '#4285F4',
        strokeOpacity: 0.3,
        strokeWeight: 1,
      });
    } else if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setCenter(location.coordinates);
      accuracyCircleRef.current.setRadius(location.accuracy);
    }

    return () => {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null);
        accuracyCircleRef.current = null;
      }
    };
  }, [location, showAccuracyCircle]);

  // Don't render if no location
  if (!location) {
    return null;
  }

  return (
    <AdvancedMarker
      position={location.coordinates}
      zIndex={1000}
      className={className}
    >
      <div className="relative">
        {/* Pulsing Ring */}
        <div className="absolute inset-0 -m-4">
          <div className="w-full h-full rounded-full bg-blue-500 opacity-20 animate-ping" />
        </div>

        {/* Outer Ring */}
        <div className="relative w-8 h-8 rounded-full bg-blue-500 opacity-30 flex items-center justify-center">
          {/* Inner Dot */}
          <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg" />
        </div>

        {/* Direction Arrow (if heading available) */}
        {location.heading !== undefined && (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full"
            style={{
              transform: `translate(-50%, -100%) rotate(${location.heading}deg)`,
            }}
          >
            <svg
              className="w-4 h-4 text-blue-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L4 12h5v8h6v-8h5L12 2z" />
            </svg>
          </div>
        )}

        {/* Accuracy Indicator */}
        {location.accuracy < 50 && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <div className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
              {Math.round(location.accuracy)}m
            </div>
          </div>
        )}
      </div>
    </AdvancedMarker>
  );
}
