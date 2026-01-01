// ============================================
// GOOGLE MAPS TYPE DEFINITIONS
// ============================================

import type { GeoCoordinates } from './itinerary';

// ============================================
// GOOGLE MAPS API INTERNAL TYPES
// These types represent the raw Google Maps API objects
// ============================================

/** Google Maps API namespace (for declare const google) */
export interface GoogleMapsAPI {
  maps: {
    DirectionsService: new () => GoogleDirectionsService;
    Geocoder: new () => GoogleGeocoder;
    TravelMode: {
      WALKING: string;
      TRANSIT: string;
      DRIVING: string;
      BICYCLING: string;
    };
    TrafficModel: {
      BEST_GUESS: string;
      OPTIMISTIC: string;
      PESSIMISTIC: string;
    };
    TransitRoutePreference: {
      FEWER_TRANSFERS: string;
      LESS_WALKING: string;
    };
    places: {
      AutocompleteService: new () => GoogleAutocompleteService;
      AutocompleteSessionToken: new () => GoogleAutocompleteSessionToken;
      PlacesService: new (container: HTMLElement) => GooglePlacesService;
    };
    LatLng: new (lat: number, lng: number) => GoogleLatLng;
    LatLngBounds: new () => GoogleLatLngBounds;
    Polyline: new (options: GooglePolylineOptions) => GooglePolyline;
    event: {
      addListenerOnce: (instance: unknown, eventName: string, handler: () => void) => GoogleEventListener;
      removeListener: (listener: GoogleEventListener) => void;
    };
  };
}

/** Google Maps LatLngBounds */
export interface GoogleLatLngBounds {
  extend: (latLng: { lat: number; lng: number }) => void;
  getCenter: () => GoogleLatLngResult;
}

/** Google Maps Event Listener */
export interface GoogleEventListener {
  remove: () => void;
}

/** Google Maps Polyline options */
export interface GooglePolylineOptions {
  path: { lat: number; lng: number }[];
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  geodesic?: boolean;
  icons?: GooglePolylineIcon[];
  map?: unknown;
  zIndex?: number;
}

/** Google Maps Polyline icon */
export interface GooglePolylineIcon {
  icon: {
    path: string;
    scale?: number;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
  };
  offset?: string;
  repeat?: string;
}

/** Google Maps Polyline */
export interface GooglePolyline {
  setMap: (map: unknown | null) => void;
  setPath: (path: { lat: number; lng: number }[]) => void;
  getPath: () => { getArray: () => { lat: () => number; lng: () => number }[] };
}

export interface GoogleDirectionsService {
  route(
    request: GoogleDirectionsAPIRequest,
    callback: (response: GoogleDirectionsResponse | null, status: string) => void
  ): void;
}

export interface GoogleDirectionsAPIRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  travelMode: string;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
  drivingOptions?: {
    departureTime: Date;
    trafficModel: string;
  };
  transitOptions?: {
    departureTime: Date;
    routingPreference: string;
  };
}

export interface GoogleDirectionsResponse {
  routes: GoogleRoute[];
}

export interface GoogleRoute {
  summary: string;
  legs: GoogleRouteLeg[];
  overview_polyline: { points: string };
  bounds: GoogleBounds;
}

export interface GoogleRouteLeg {
  start_address: string;
  end_address: string;
  start_location: GoogleLatLngResult;
  end_location: GoogleLatLngResult;
  distance: { value: number; text: string };
  duration: { value: number; text: string };
  duration_in_traffic?: { value: number; text: string };
  steps: GoogleRouteStep[];
}

export interface GoogleRouteStep {
  instructions: string;
  distance: { value: number; text: string };
  duration: { value: number; text: string };
  travel_mode: string;
  polyline: { points: string };
  transit?: GoogleTransitDetailsRaw;
}

export interface GoogleTransitDetailsRaw {
  line: {
    name: string;
    short_name: string;
    vehicle: { type: string; icon: string };
    color?: string;
  };
  departure_stop: { name: string; location: GoogleLatLngResult };
  arrival_stop: { name: string; location: GoogleLatLngResult };
  departure_time: { value: Date };
  arrival_time: { value: Date };
  num_stops: number;
}

export interface GoogleBounds {
  getNorthEast(): GoogleLatLngResult;
  getSouthWest(): GoogleLatLngResult;
}

export interface GoogleLatLngResult {
  lat(): number;
  lng(): number;
}

export interface GoogleLatLng {
  lat(): number;
  lng(): number;
}

export interface GoogleGeocoder {
  geocode(
    request: { address: string },
    callback: (results: GoogleGeocodeResult[] | null, status: string) => void
  ): void;
}

export interface GoogleGeocodeResult {
  geometry: { location: GoogleLatLngResult };
  formatted_address: string;
}

export interface GoogleAutocompleteService {
  getPlacePredictions(
    request: GoogleAutocompletePredictionRequest,
    callback: (predictions: GoogleAutocompletePrediction[] | null, status: string) => void
  ): void;
}

export interface GoogleAutocompletePredictionRequest {
  input: string;
  sessionToken?: GoogleAutocompleteSessionToken;
  types?: string[];
  location?: GoogleLatLng;
  radius?: number;
}

export interface GoogleAutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
  types: string[];
}

/** Opaque session token type */
export interface GoogleAutocompleteSessionToken {
  // Opaque token - no public properties
  __brand: 'AutocompleteSessionToken';
}

export interface GooglePlacesService {
  getDetails(
    request: GooglePlaceDetailsRequest,
    callback: (place: GooglePlace | null, status: string) => void
  ): void;
  nearbySearch(
    request: GoogleNearbySearchRequest,
    callback: (results: GooglePlaceResult[] | null, status: string) => void
  ): void;
}

export interface GooglePlaceDetailsRequest {
  placeId: string;
  fields: string[];
  sessionToken?: GoogleAutocompleteSessionToken;
}

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: GoogleLatLngResult };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    isOpen?(): boolean;
    weekday_text?: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  types: string[];
  icon: string;
  business_status?: string;
}

export interface GoogleNearbySearchRequest {
  location: GoogleLatLng;
  radius: number;
  type?: string;
  keyword?: string;
  minPriceLevel?: number;
  maxPriceLevel?: number;
  openNow?: boolean;
}

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  geometry: { location: GoogleLatLngResult };
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types: string[];
  opening_hours?: {
    isOpen?(): boolean;
  };
}

// Re-export GeoCoordinates for convenience
export type { GeoCoordinates };

// --- TRAVEL MODES ---

export type TravelMode = 'walking' | 'transit' | 'driving' | 'bicycling';

// --- PLACES API TYPES ---

/** Place autocomplete prediction */
export interface PlacePrediction {
  placeId: string;
  mainText: string;           // "Eiffel Tower"
  secondaryText: string;      // "Paris, France"
  description: string;        // Full formatted address
  types: string[];            // ['tourist_attraction', 'point_of_interest']
}

/** Full place details from Places API */
export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  coordinates: GeoCoordinates;

  // Business info
  rating?: number;            // 1-5 scale
  userRatingsTotal?: number;
  priceLevel?: 0 | 1 | 2 | 3 | 4;  // $ to $$$$

  // Contact
  phoneNumber?: string;
  website?: string;

  // Hours
  openingHours?: {
    isOpenNow: boolean;
    weekdayText: string[];    // ["Monday: 9:00 AM - 5:00 PM", ...]
    periods: OpeningPeriod[];
  };

  // Types for categorization
  types: string[];

  // For UI display
  iconUrl?: string;
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';

  // Cache metadata
  fetchedAt: string;          // ISO timestamp
}

export interface OpeningPeriod {
  open: { day: number; time: string };   // day: 0-6 (Sun-Sat), time: "0900"
  close?: { day: number; time: string }; // undefined = 24hrs
}

/** Nearby places search request */
export interface NearbySearchRequest {
  location: GeoCoordinates;
  radius: number;             // meters (max 50000)
  type?: string;              // 'restaurant', 'museum', 'cafe', etc.
  keyword?: string;           // Additional search term
  minPrice?: number;          // 0-4
  maxPrice?: number;          // 0-4
  openNow?: boolean;
}

/** Nearby search result (subset of PlaceDetails) */
export interface NearbyPlace {
  placeId: string;
  name: string;
  vicinity: string;           // Short address
  coordinates: GeoCoordinates;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  types: string[];
  isOpenNow?: boolean;
  distanceMeters?: number;    // Calculated from search center
}

// --- DIRECTIONS API TYPES ---

/** Direction request with departure time support */
export interface DirectionsRequest {
  origin: GeoCoordinates;
  destination: GeoCoordinates;
  travelMode: TravelMode;
  departureTime?: Date;       // For traffic-aware routing
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
}

/** Cached directions result */
export interface CachedDirections {
  cacheKey: string;           // Hash of request params
  request: DirectionsRequest;
  result: DirectionsResult;
  fetchedAt: string;
  expiresAt: string;          // 1 hour for traffic, 24h for non-traffic
}

/** Processed directions result */
export interface DirectionsResult {
  routes: ProcessedRoute[];
  status: 'OK' | 'ZERO_RESULTS' | 'NOT_FOUND' | 'MAX_ROUTE_LENGTH_EXCEEDED';
}

export interface ProcessedRoute {
  summary: string;            // "via I-95 N"
  legs: RouteLeg[];
  totalDistance: number;      // meters
  totalDuration: number;      // seconds
  totalDurationInTraffic?: number; // seconds (only with departure_time)
  polyline: string;           // Encoded polyline
  bounds: {
    northeast: GeoCoordinates;
    southwest: GeoCoordinates;
  };
}

export interface RouteLeg {
  startAddress: string;
  endAddress: string;
  startLocation: GeoCoordinates;
  endLocation: GeoCoordinates;
  distance: number;           // meters
  duration: number;           // seconds
  durationInTraffic?: number; // seconds
  steps: RouteStep[];
}

export interface RouteStep {
  instruction: string;        // HTML instruction
  distance: number;           // meters
  duration: number;           // seconds
  travelMode: TravelMode;
  polyline: string;
  transitDetails?: TransitDetails;
}

export interface TransitDetails {
  line: {
    name: string;
    shortName: string;
    vehicle: { type: string; icon: string };
    color?: string;
  };
  departureStop: { name: string; location: GeoCoordinates };
  arrivalStop: { name: string; location: GeoCoordinates };
  departureTime: string;      // ISO
  arrivalTime: string;        // ISO
  numStops: number;
}

// --- DISTANCE MATRIX API TYPES ---

/** Batch distance matrix request */
export interface DistanceMatrixRequest {
  origins: GeoCoordinates[];
  destinations: GeoCoordinates[];
  travelMode: TravelMode;
  departureTime?: Date;
}

/** Single element in distance matrix */
export interface DistanceMatrixElement {
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS';
  distance?: {
    value: number;            // meters
    text: string;             // "5.2 km"
  };
  duration?: {
    value: number;            // seconds
    text: string;             // "12 mins"
  };
  durationInTraffic?: {
    value: number;
    text: string;
  };
}

/** Full distance matrix response */
export interface DistanceMatrixResult {
  originAddresses: string[];
  destinationAddresses: string[];
  rows: {
    elements: DistanceMatrixElement[];
  }[];
}

/** Pre-calculated day travel data */
export interface DayTravelMatrix {
  dayId: string;
  tripId: string;
  calculatedAt: string;
  departureDate: string;      // For traffic estimation
  legs: TravelLegData[];
}

export interface TravelLegData {
  startActivityId: string;
  endActivityId: string;
  walking: LegModeData;
  transit: LegModeData;
  driving: LegModeData;
  recommendedMode: TravelMode;
}

export interface LegModeData {
  distance: number;           // meters
  duration: number;           // seconds
  durationInTraffic?: number; // seconds (driving only)
  available: boolean;         // false if no route found
}

// --- ROUTE OPTIMIZER TYPES (Feature 9) ---

/** Route optimization request */
export interface OptimizeRouteRequest {
  waypoints: OptimizationWaypoint[];
  travelMode: TravelMode;
  optimizeFor: 'distance' | 'duration';
  departureTime?: Date;
}

/** Route optimization options */
export interface OptimizationOptions {
  fixFirst?: boolean;      // Keep first activity fixed (e.g., hotel)
  fixLast?: boolean;       // Keep last activity fixed
  preferredMode?: TravelMode;
  departureTime?: Date;
}

export interface OptimizationWaypoint {
  activityId: string;
  location: GeoCoordinates;
  name: string;
  fixedPosition?: 'first' | 'last'; // Hotel = first, dinner = last
  timeWindow?: {
    start: string;            // "09:00"
    end: string;              // "17:00"
  };
}

export interface OptimizedRoute {
  originalOrder: string[];    // Activity IDs in original order
  optimizedOrder: string[];   // Activity IDs in optimized order
  totalDistance: number;
  totalDuration: number;
  timeSaved: number;          // seconds saved vs original
  distanceSaved: number;      // meters saved vs original
  legs: OptimizedLeg[];
}

export interface OptimizedLeg {
  fromActivityId: string;
  toActivityId: string;
  distance: number;
  duration: number;
  polyline: string;
}

// --- LIVE TRACKING TYPES (Feature 10) ---

export interface LiveTrackingState {
  isTracking: boolean;
  currentLocation: GeoCoordinates | null;
  accuracy: number | null;    // meters
  heading: number | null;     // degrees from north
  speed: number | null;       // m/s
  lastUpdated: string | null;
  error: string | null;

  // Relation to itinerary
  nearestActivity: {
    activityId: string;
    distanceMeters: number;
  } | null;
  nextActivity: {
    activityId: string;
    distanceMeters: number;
    estimatedArrival: string; // ISO timestamp
  } | null;
}

// --- MARKER CLUSTERING TYPES (Feature 7) ---

export interface ClusterConfig {
  gridSize: number;           // Pixels (default 60)
  maxZoom: number;            // Stop clustering above this zoom
  minimumClusterSize: number; // Min markers to form cluster (default 2)
}

// --- MAP STYLING TYPES (Feature 6) ---

export type MapStylePreset =
  | 'default'
  | 'minimal'
  | 'dark'
  | 'satellite'
  | 'terrain';

export interface MapStyleConfig {
  id: string;
  name: string;
  mapTypeId?: string;         // google.maps.MapTypeId
  styles?: MapTypeStyle[];    // Custom style array
}

// Simplified MapTypeStyle for our needs
export interface MapTypeStyle {
  featureType?: string;
  elementType?: string;
  stylers: { [key: string]: string | number }[];
}

// --- CACHE TYPES ---

export interface MapsCacheEntry {
  key: string;
  type: 'directions' | 'place_details' | 'distance_matrix' | 'nearby';
  data: unknown;
  fetchedAt: string;
  expiresAt: string;
  hitCount: number;
}

// --- NEARBY CATEGORIES ---

export interface NearbyCategory {
  id: string;
  label: string;
  icon: string;  // Lucide icon name
}

export const NEARBY_CATEGORIES: NearbyCategory[] = [
  { id: 'restaurant', label: 'Restaurants', icon: 'Utensils' },
  { id: 'cafe', label: 'Cafes', icon: 'Coffee' },
  { id: 'museum', label: 'Museums', icon: 'Landmark' },
  { id: 'tourist_attraction', label: 'Attractions', icon: 'Camera' },
  { id: 'lodging', label: 'Hotels', icon: 'Hotel' },
  { id: 'shopping_mall', label: 'Shopping', icon: 'ShoppingBag' },
  { id: 'park', label: 'Parks', icon: 'TreePine' },
  { id: 'atm', label: 'ATMs', icon: 'Banknote' },
];
