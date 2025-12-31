import type { GeoCoordinates } from '@/types/maps';

export interface LiveLocation {
  coordinates: GeoCoordinates;
  accuracy: number; // meters
  heading?: number; // degrees from north (0-360)
  speed?: number; // meters per second
  timestamp: number; // milliseconds since epoch
}

export interface TrackingOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number; // milliseconds
  timeout?: number; // milliseconds
}

export type LocationCallback = (location: LiveLocation) => void;
export type ErrorCallback = (error: GeolocationPositionError) => void;

/**
 * Live Tracking Service
 * Manages geolocation tracking with high accuracy for trip navigation
 */
export const liveTrackingService = {
  watchId: null as number | null,
  callbacks: new Set<LocationCallback>(),
  errorCallbacks: new Set<ErrorCallback>(),
  lastLocation: null as LiveLocation | null,

  /**
   * Check if geolocation is supported
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  },

  /**
   * Get current location (one-time)
   * @param options - Geolocation options
   * @returns Promise with current location
   */
  async getCurrentLocation(options: TrackingOptions = {}): Promise<LiveLocation> {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    return new Promise((resolve, reject) => {
      const geoOptions: PositionOptions = {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        maximumAge: options.maximumAge ?? 5000,
        timeout: options.timeout ?? 10000,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = this.mapPosition(position);
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        geoOptions
      );
    });
  },

  /**
   * Start watching user's location
   * @param options - Geolocation options
   */
  startTracking(options: TrackingOptions = {}): void {
    if (!this.isSupported()) {
      console.error('Geolocation not supported');
      return;
    }

    if (this.watchId !== null) {
      console.warn('Tracking already started');
      return;
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      maximumAge: options.maximumAge ?? 0,
      timeout: options.timeout ?? 5000,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = this.mapPosition(position);
        this.lastLocation = location;

        // Notify all callbacks
        this.callbacks.forEach((callback) => {
          try {
            callback(location);
          } catch (err) {
            console.error('Location callback error:', err);
          }
        });
      },
      (error) => {
        console.error('Geolocation error:', error);

        // Notify error callbacks
        this.errorCallbacks.forEach((callback) => {
          try {
            callback(error);
          } catch (err) {
            console.error('Error callback error:', err);
          }
        });
      },
      geoOptions
    );
  },

  /**
   * Stop watching user's location
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  },

  /**
   * Subscribe to location updates
   * @param callback - Function to call on location update
   * @returns Unsubscribe function
   */
  subscribe(callback: LocationCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  },

  /**
   * Subscribe to location errors
   * @param callback - Function to call on error
   * @returns Unsubscribe function
   */
  subscribeToErrors(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);

    return () => {
      this.errorCallbacks.delete(callback);
    };
  },

  /**
   * Get last known location
   * @returns Last location or null
   */
  getLastLocation(): LiveLocation | null {
    return this.lastLocation;
  },

  /**
   * Check if currently tracking
   */
  isTracking(): boolean {
    return this.watchId !== null;
  },

  /**
   * Request location permission
   * @returns Promise indicating permission status
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      // Try to get current position to trigger permission prompt
      await this.getCurrentLocation({ timeout: 5000 });
      return true;
    } catch (error) {
      if (error instanceof GeolocationPositionError) {
        if (error.code === error.PERMISSION_DENIED) {
          return false;
        }
      }
      // Other errors (timeout, unavailable) don't mean permission denied
      return false;
    }
  },

  /**
   * Calculate distance from last known location to target
   * @param target - Target coordinates
   * @returns Distance in meters or null if no last location
   */
  getDistanceToTarget(target: GeoCoordinates): number | null {
    if (!this.lastLocation) return null;

    const R = 6371e3; // Earth's radius in meters
    const φ1 = (this.lastLocation.coordinates.lat * Math.PI) / 180;
    const φ2 = (target.lat * Math.PI) / 180;
    const Δφ = ((target.lat - this.lastLocation.coordinates.lat) * Math.PI) / 180;
    const Δλ = ((target.lng - this.lastLocation.coordinates.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  },

  /**
   * Map GeolocationPosition to LiveLocation
   */
  mapPosition(position: GeolocationPosition): LiveLocation {
    return {
      coordinates: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      },
      accuracy: position.coords.accuracy,
      heading: position.coords.heading ?? undefined,
      speed: position.coords.speed ?? undefined,
      timestamp: position.timestamp,
    };
  },
};
