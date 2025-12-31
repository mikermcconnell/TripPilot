/**
 * Google Maps API Configuration Constants
 * Centralized configuration to avoid magic numbers throughout the codebase
 */

export const MAPS_CONFIG = {
  // Places Autocomplete
  AUTOCOMPLETE: {
    /** Session token timeout in milliseconds (3 minutes) */
    SESSION_TIMEOUT_MS: 3 * 60 * 1000,
    /** Debounce delay for search input */
    DEBOUNCE_MS: 300,
    /** Minimum characters required to trigger search */
    MIN_INPUT_LENGTH: 3,
    /** Maximum input length to prevent abuse */
    MAX_INPUT_LENGTH: 200,
    /** Default search radius in meters (50km) */
    DEFAULT_RADIUS: 50000,
  },

  // Distance Matrix
  DISTANCE_MATRIX: {
    /** Default departure hour when time not specified */
    DEFAULT_DEPARTURE_HOUR: 9,
    /** Delay between batch requests in ms */
    BATCH_DELAY_MS: 100,
  },

  // Caching
  CACHE: {
    /** TTL for directions with traffic data (1 hour) */
    DIRECTIONS_TRAFFIC_TTL_MS: 60 * 60 * 1000,
    /** TTL for static directions (24 hours) */
    DIRECTIONS_STATIC_TTL_MS: 24 * 60 * 60 * 1000,
    /** TTL for place details (24 hours) */
    PLACE_DETAILS_TTL_MS: 24 * 60 * 60 * 1000,
    /** TTL for nearby search (1 hour) */
    NEARBY_SEARCH_TTL_MS: 60 * 60 * 1000,
    /** TTL for distance matrix (1 hour) */
    DISTANCE_MATRIX_TTL_MS: 60 * 60 * 1000,
    /** Coordinate precision for cache keys (decimal places) */
    COORDINATE_PRECISION: 5,
  },

  // Travel Modes
  TRAVEL: {
    /** Walking threshold distance in km */
    WALKING_THRESHOLD_KM: 2.0,
    /** Transit threshold distance in km */
    TRANSIT_THRESHOLD_KM: 20,
    /** Average walking speed in km/h */
    WALKING_SPEED_KMH: 4.5,
    /** Average city driving speed in km/h */
    CITY_DRIVING_SPEED_KMH: 30,
    /** Average highway driving speed in km/h */
    HIGHWAY_DRIVING_SPEED_KMH: 100,
    /** Average local transit speed in km/h */
    LOCAL_TRANSIT_SPEED_KMH: 25,
    /** Average intercity transit speed in km/h */
    INTERCITY_TRANSIT_SPEED_KMH: 80,
  },

  // Marker Clustering
  CLUSTERING: {
    /** Default grid size in pixels */
    DEFAULT_GRID_SIZE: 60,
    /** Maximum zoom level for clustering */
    DEFAULT_MAX_ZOOM: 15,
    /** Minimum markers to form a cluster */
    MIN_CLUSTER_SIZE: 2,
  },

  // Live Tracking
  LIVE_TRACKING: {
    /** High accuracy mode enabled */
    ENABLE_HIGH_ACCURACY: true,
    /** Geolocation timeout in ms */
    TIMEOUT_MS: 10000,
    /** Maximum age of cached position in ms */
    MAXIMUM_AGE_MS: 5000,
    /** Accuracy threshold for display in meters */
    ACCURACY_THRESHOLD: 50,
  },

  // API Retry
  RETRY: {
    /** Maximum retry attempts */
    MAX_RETRIES: 3,
    /** Initial retry delay in ms */
    INITIAL_DELAY_MS: 1000,
    /** Maximum retry delay in ms */
    MAX_DELAY_MS: 10000,
  },

  // Coordinate Validation
  VALIDATION: {
    /** Maximum latitude value */
    MAX_LATITUDE: 90,
    /** Maximum longitude value */
    MAX_LONGITUDE: 180,
  },
} as const;

/**
 * Get recommended travel mode based on distance
 */
export function getRecommendedMode(
  distanceKm: number
): 'walking' | 'transit' | 'driving' {
  if (distanceKm < MAPS_CONFIG.TRAVEL.WALKING_THRESHOLD_KM) return 'walking';
  if (distanceKm < MAPS_CONFIG.TRAVEL.TRANSIT_THRESHOLD_KM) return 'transit';
  return 'driving';
}

/**
 * Get average speed for travel mode and distance
 */
export function getSpeedForMode(
  mode: 'walking' | 'transit' | 'driving',
  distanceKm: number
): number {
  switch (mode) {
    case 'walking':
      return MAPS_CONFIG.TRAVEL.WALKING_SPEED_KMH;
    case 'driving':
      return distanceKm > 20
        ? MAPS_CONFIG.TRAVEL.HIGHWAY_DRIVING_SPEED_KMH
        : MAPS_CONFIG.TRAVEL.CITY_DRIVING_SPEED_KMH;
    case 'transit':
      return distanceKm > 30
        ? MAPS_CONFIG.TRAVEL.INTERCITY_TRANSIT_SPEED_KMH
        : MAPS_CONFIG.TRAVEL.LOCAL_TRANSIT_SPEED_KMH;
  }
}
