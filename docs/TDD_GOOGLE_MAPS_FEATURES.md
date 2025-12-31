# Technical Design Document: Google Maps API Feature Expansion

**Version:** 1.0
**Date:** 2025-12-30
**Author:** Principal Software Architect
**Target:** Junior Engineer (Claude 3.5 Sonnet)

---

## Executive Summary

This TDD covers the implementation of 9 Google Maps features plus 3 quick wins for the TripPlanner application. These features will make Google Maps the **competitive advantage** of this trip planning app.

### Scope

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| QW1 | Add departure_time to Directions | Critical | Low |
| QW2 | Cache Directions in IndexedDB | Critical | Low |
| QW3 | Batch Distance Matrix on Day Load | Critical | Medium |
| 1 | Places Autocomplete API | High | Medium |
| 2 | Place Details API | High | Medium |
| 3 | Distance Matrix API | High | Medium |
| 4 | Time-Aware Directions | High | Low |
| 6 | Custom Map Styling | Medium | Low |
| 7 | Marker Clustering | Medium | Medium |
| 8 | Nearby Places Search | Medium | Medium |
| 9 | Routes API (Multi-stop Optimization) | Medium | High |
| 10 | Geolocation + Live Tracking | Medium | Medium |

**NOT in scope:** Features 5 (Street View), 11 (Offline Maps), 12 (Photo Integration)

**Estimated New Files:** 18
**Estimated Modified Files:** 6

---

## Table of Contents

1. [File Structure](#1-file-structure)
2. [New Dependency](#2-new-dependency)
3. [Data Models & Types](#3-data-models--types)
4. [IndexedDB Schema Update](#4-indexeddb-schema-update)
5. [Feature Specifications](#5-feature-specifications)
6. [API Contracts](#6-api-contracts)
7. [Edge Cases & Error Handling](#7-edge-cases--error-handling)
8. [Implementation Steps](#8-implementation-steps)
9. [Google Cloud API Requirements](#9-google-cloud-api-requirements)

---

## 1. File Structure

```
src/
├── services/
│   ├── maps/                              # NEW DIRECTORY
│   │   ├── index.ts                       # NEW: Barrel export
│   │   ├── placesService.ts               # NEW: Autocomplete + Details + Nearby
│   │   ├── directionsService.ts           # NEW: Directions with caching + departure_time
│   │   ├── distanceMatrixService.ts       # NEW: Batch distance calculations
│   │   ├── routeOptimizerService.ts       # NEW: Multi-stop route optimization
│   │   └── types.ts                       # NEW: Maps service internal types
│   └── db/
│       ├── index.ts                       # MODIFY: Add mapsCache + dayTravelMatrices stores
│       └── mapsCacheRepository.ts         # NEW: IndexedDB cache for map data
│
├── components/
│   ├── maps/                              # NEW DIRECTORY
│   │   ├── index.ts                       # NEW: Barrel export
│   │   ├── PlacesAutocomplete.tsx         # NEW: Search input component
│   │   ├── PlaceDetailsCard.tsx           # NEW: Rich place info display
│   │   ├── NearbyPlacesPanel.tsx          # NEW: Nearby search results
│   │   ├── MarkerCluster.tsx              # NEW: Clustered markers wrapper
│   │   ├── UserLocationMarker.tsx         # NEW: Current location indicator
│   │   ├── RouteOptimizerPanel.tsx        # NEW: Optimization UI
│   │   └── CustomMapStyles.ts             # NEW: Map style definitions
│   └── modals/
│       └── MapView.tsx                    # MODIFY: Integrate new features
│
├── stores/
│   ├── mapsStore.ts                       # NEW: Maps-specific state
│   └── uiStore.ts                         # MODIFY: Add geolocation tracking state
│
├── hooks/
│   ├── usePlacesAutocomplete.ts           # NEW: Autocomplete hook
│   ├── usePlaceDetails.ts                 # NEW: Place details hook
│   ├── useNearbyPlaces.ts                 # NEW: Nearby search hook
│   ├── useDistanceMatrix.ts               # NEW: Batch distance hook
│   ├── useRouteOptimizer.ts               # NEW: Route optimization hook
│   ├── useLiveTracking.ts                 # NEW: Continuous location tracking
│   └── useGeolocation.ts                  # MODIFY: Add watch mode
│
├── types/
│   ├── maps.ts                            # NEW: All maps-related types
│   └── itinerary.ts                       # MODIFY: Add placeId to LocationData
│
└── utils/
    └── geo.ts                             # MODIFY: Add cache key generation
```

---

## 2. New Dependency

Add to `package.json`:

```json
{
  "dependencies": {
    "@googlemaps/markerclusterer": "^2.5.3"
  }
}
```

**Justification:** Official Google library for marker clustering with SuperCluster algorithm. Lightweight (~15KB gzipped), well-maintained.

---

## 3. Data Models & Types

### 3.1 New File: `src/types/maps.ts`

```typescript
// ============================================
// GOOGLE MAPS TYPE DEFINITIONS
// ============================================

import type { GeoCoordinates } from './itinerary';

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
```

### 3.2 Modify: `src/types/itinerary.ts`

Add `placeId` field to `LocationData`:

```typescript
// Line ~8, MODIFY LocationData interface
export interface LocationData {
  name: string;
  coordinates?: GeoCoordinates;
  address?: string;
  placeId?: string;           // NEW: Google Places ID for fetching details
}
```

---

## 4. IndexedDB Schema Update

### 4.1 Modify: `src/services/db/index.ts`

**IMPORTANT:** Bump `DB_VERSION` from 1 to 2.

```typescript
// Add to TripPilotDB interface (after line 73):

mapsCache: {
  key: string;                // Cache key
  value: MapsCacheEntry;
  indexes: {
    'by-type': string;        // 'directions' | 'place_details' | etc.
    'by-expires': string;     // For cleanup
  };
};

dayTravelMatrices: {
  key: string;                // `${tripId}_${dayId}`
  value: DayTravelMatrix;
  indexes: {
    'by-trip': string;
  };
};
```

**Add upgrade migration in `initDB` function:**

```typescript
const DB_VERSION = 2;  // CHANGED from 1

// Inside upgrade(db, oldVersion, newVersion, transaction):

// Version 2: Add maps cache stores
if (oldVersion < 2) {
  // Maps cache store
  if (!db.objectStoreNames.contains('mapsCache')) {
    const mapsCacheStore = db.createObjectStore('mapsCache', { keyPath: 'key' });
    mapsCacheStore.createIndex('by-type', 'type');
    mapsCacheStore.createIndex('by-expires', 'expiresAt');
  }

  // Day travel matrices store
  if (!db.objectStoreNames.contains('dayTravelMatrices')) {
    const matricesStore = db.createObjectStore('dayTravelMatrices', { keyPath: 'key' });
    matricesStore.createIndex('by-trip', 'tripId');
  }
}
```

---

## 5. Feature Specifications

### 5.1 Quick Win #1: Add `departure_time` to Directions

**Purpose:** Enable traffic-aware travel time estimates.

**Current Code (`MapView.tsx:121-125`):**
```typescript
directionsService.route({
  origin: start,
  destination: end,
  travelMode: travelMode
}, callback);
```

**New Code:**
```typescript
directionsService.route({
  origin: start,
  destination: end,
  travelMode: travelMode,
  drivingOptions: travelMode === 'DRIVING' ? {
    departureTime: getDepartureTime(activityTime, tripDate),
    trafficModel: google.maps.TrafficModel.BEST_GUESS
  } : undefined,
  transitOptions: travelMode === 'TRANSIT' ? {
    departureTime: getDepartureTime(activityTime, tripDate),
    routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
  } : undefined
}, callback);
```

**Departure Time Logic (add to `src/utils/geo.ts`):**

```typescript
/**
 * Calculate departure time for directions request
 * @param activityTime - Activity start time (e.g., "10:00 AM")
 * @param tripDate - Trip date (ISO string "YYYY-MM-DD")
 * @returns Date object for departure
 */
export function getDepartureTime(
  activityTime: string | undefined,
  tripDate: string
): Date {
  const today = new Date();
  const tripDateObj = new Date(tripDate);

  // If trip date is in the past, use current time
  if (tripDateObj < today) {
    return today;
  }

  // If activity time is defined, use trip date + activity time
  if (activityTime) {
    return parseActivityDateTime(tripDate, activityTime);
  }

  // Default to 9 AM on trip date
  const defaultTime = new Date(tripDate);
  defaultTime.setHours(9, 0, 0, 0);
  return defaultTime;
}

/**
 * Parse activity time string to Date
 * Handles: "10:00 AM", "14:30", "9:00"
 */
export function parseActivityDateTime(
  dateStr: string,
  timeStr: string
): Date {
  const date = new Date(dateStr);

  // Handle "HH:MM AM/PM" format
  const amPmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = parseInt(amPmMatch[2], 10);
    const period = amPmMatch[3]?.toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    date.setHours(hours, minutes, 0, 0);
  }

  return date;
}
```

---

### 5.2 Quick Win #2: Cache Directions in IndexedDB

**New File:** `src/services/db/mapsCacheRepository.ts`

```typescript
import { getDB } from './index';
import type { MapsCacheEntry } from '@/types/maps';

const DEFAULT_TTL = {
  directions: 60 * 60 * 1000,           // 1 hour (traffic changes)
  directions_static: 24 * 60 * 60 * 1000, // 24 hours (no traffic)
  place_details: 24 * 60 * 60 * 1000,   // 24 hours
  nearby: 60 * 60 * 1000,               // 1 hour (business status changes)
  distance_matrix: 60 * 60 * 1000,      // 1 hour
};

export const mapsCacheRepository = {
  /**
   * Get cached entry by key
   * Returns null if expired or missing
   */
  async get<T>(key: string): Promise<T | null> {
    const db = await getDB();
    const entry = await db.get('mapsCache', key);

    if (!entry) return null;

    // Check expiration
    if (new Date(entry.expiresAt) < new Date()) {
      await db.delete('mapsCache', key);
      return null;
    }

    // Update hit count
    entry.hitCount++;
    await db.put('mapsCache', entry);

    return entry.data as T;
  },

  /**
   * Store data in cache
   */
  async set(
    key: string,
    data: unknown,
    type: MapsCacheEntry['type'],
    hasTrafficData: boolean = false
  ): Promise<void> {
    const db = await getDB();
    const now = new Date().toISOString();

    // Determine TTL
    let ttl = DEFAULT_TTL[type];
    if (type === 'directions' && !hasTrafficData) {
      ttl = DEFAULT_TTL.directions_static;
    }

    const entry: MapsCacheEntry = {
      key,
      type,
      data,
      fetchedAt: now,
      expiresAt: new Date(Date.now() + ttl).toISOString(),
      hitCount: 0,
    };

    await db.put('mapsCache', entry);
  },

  /**
   * Delete specific cache entry
   */
  async delete(key: string): Promise<void> {
    const db = await getDB();
    await db.delete('mapsCache', key);
  },

  /**
   * Clear all expired entries
   * Call this on app startup
   */
  async clearExpired(): Promise<number> {
    const db = await getDB();
    const now = new Date().toISOString();

    const expired = await db.getAllFromIndex(
      'mapsCache',
      'by-expires',
      IDBKeyRange.upperBound(now)
    );

    for (const entry of expired) {
      await db.delete('mapsCache', entry.key);
    }

    return expired.length;
  },

  /**
   * Clear all cache entries of a specific type
   */
  async clearByType(type: MapsCacheEntry['type']): Promise<void> {
    const db = await getDB();
    const entries = await db.getAllFromIndex('mapsCache', 'by-type', type);

    for (const entry of entries) {
      await db.delete('mapsCache', entry.key);
    }
  },

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    byType: Record<string, number>;
    oldestEntry: string | null;
  }> {
    const db = await getDB();
    const all = await db.getAll('mapsCache');

    const byType: Record<string, number> = {};
    let oldestEntry: string | null = null;

    for (const entry of all) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      if (!oldestEntry || entry.fetchedAt < oldestEntry) {
        oldestEntry = entry.fetchedAt;
      }
    }

    return {
      totalEntries: all.length,
      byType,
      oldestEntry,
    };
  },
};
```

**Cache Key Generation (add to `src/utils/geo.ts`):**

```typescript
/**
 * Generate cache key for directions request
 * Rounds coordinates to 5 decimal places (~11m precision)
 */
export function generateDirectionsCacheKey(
  origin: GeoCoordinates,
  destination: GeoCoordinates,
  mode: TravelMode,
  departureTime?: Date
): string {
  const originStr = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}`;
  const destStr = `${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;

  // Include day of week and hour for traffic-aware requests
  if (departureTime) {
    const dayOfWeek = departureTime.getDay();
    const hour = departureTime.getHours();
    return `dir_${originStr}_${destStr}_${mode}_${dayOfWeek}_${hour}`;
  }

  return `dir_${originStr}_${destStr}_${mode}`;
}

/**
 * Generate cache key for place details
 */
export function generatePlaceDetailsCacheKey(placeId: string): string {
  return `place_${placeId}`;
}

/**
 * Generate cache key for nearby search
 */
export function generateNearbyCacheKey(
  location: GeoCoordinates,
  type: string,
  radius: number,
  openNow?: boolean
): string {
  const locStr = `${location.lat.toFixed(4)},${location.lng.toFixed(4)}`;
  return `nearby_${locStr}_${type}_${radius}_${openNow ? 'open' : 'all'}`;
}
```

---

### 5.3 Quick Win #3: Batch Distance Matrix on Day Load

**New File:** `src/services/maps/distanceMatrixService.ts`

```typescript
import type {
  DistanceMatrixRequest,
  DistanceMatrixResult,
  DayTravelMatrix,
  TravelLegData,
  TravelMode,
  GeoCoordinates,
} from '@/types/maps';
import type { DayItinerary, Activity } from '@/types/itinerary';
import { mapsCacheRepository } from '@/services/db/mapsCacheRepository';
import { getRecommendedMode } from '@/utils/geo';

declare const google: any;

/**
 * Distance Matrix Service
 * Provides batch distance calculations with caching
 */
export const distanceMatrixService = {
  /**
   * Calculate travel data for all consecutive activity pairs in a day
   * This is the main function to call on day load
   */
  async calculateDayMatrix(
    day: DayItinerary,
    tripId: string,
    tripDate: string
  ): Promise<DayTravelMatrix | null> {
    // Filter activities with valid coordinates
    const activities = day.activities.filter(
      (a) =>
        a.location.coordinates &&
        a.location.coordinates.lat !== 0 &&
        a.location.coordinates.lng !== 0
    );

    if (activities.length < 2) {
      return null; // Need at least 2 activities
    }

    // Check cache first
    const cacheKey = `matrix_${tripId}_${day.id}_${tripDate}`;
    const cached = await mapsCacheRepository.get<DayTravelMatrix>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build consecutive pairs
    const legs: TravelLegData[] = [];
    const departureTime = new Date(`${tripDate}T09:00:00`);

    for (let i = 0; i < activities.length - 1; i++) {
      const start = activities[i];
      const end = activities[i + 1];

      const legData = await this.calculateLegData(
        start,
        end,
        departureTime
      );

      legs.push(legData);
    }

    const result: DayTravelMatrix = {
      dayId: day.id,
      tripId,
      calculatedAt: new Date().toISOString(),
      departureDate: tripDate,
      legs,
    };

    // Cache result
    await mapsCacheRepository.set(cacheKey, result, 'distance_matrix');

    return result;
  },

  /**
   * Calculate travel data for a single leg (all 3 modes)
   */
  async calculateLegData(
    start: Activity,
    end: Activity,
    departureTime: Date
  ): Promise<TravelLegData> {
    const origin = start.location.coordinates!;
    const destination = end.location.coordinates!;

    // Query all 3 modes in parallel
    const [walking, transit, driving] = await Promise.all([
      this.querySingleMode(origin, destination, 'walking'),
      this.querySingleMode(origin, destination, 'transit', departureTime),
      this.querySingleMode(origin, destination, 'driving', departureTime),
    ]);

    // Determine recommended mode based on distance
    const distance = walking.available ? walking.distance : driving.distance;
    const recommendedMode = getRecommendedMode(distance / 1000); // Convert to km

    return {
      startActivityId: start.id,
      endActivityId: end.id,
      walking,
      transit,
      driving,
      recommendedMode,
    };
  },

  /**
   * Query distance matrix for a single origin-destination pair
   */
  async querySingleMode(
    origin: GeoCoordinates,
    destination: GeoCoordinates,
    mode: TravelMode,
    departureTime?: Date
  ): Promise<{ distance: number; duration: number; durationInTraffic?: number; available: boolean }> {
    return new Promise((resolve) => {
      const service = new google.maps.DistanceMatrixService();

      const request: any = {
        origins: [{ lat: origin.lat, lng: origin.lng }],
        destinations: [{ lat: destination.lat, lng: destination.lng }],
        travelMode: this.mapTravelMode(mode),
      };

      // Add departure time for traffic data
      if (departureTime && (mode === 'driving' || mode === 'transit')) {
        request.drivingOptions = {
          departureTime,
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        };
      }

      service.getDistanceMatrix(request, (response: any, status: string) => {
        if (status !== 'OK' || !response.rows[0]?.elements[0]) {
          resolve({ distance: 0, duration: 0, available: false });
          return;
        }

        const element = response.rows[0].elements[0];

        if (element.status !== 'OK') {
          resolve({ distance: 0, duration: 0, available: false });
          return;
        }

        resolve({
          distance: element.distance.value,
          duration: element.duration.value,
          durationInTraffic: element.duration_in_traffic?.value,
          available: true,
        });
      });
    });
  },

  /**
   * Get cached day matrix if available
   */
  async getCachedDayMatrix(
    tripId: string,
    dayId: string,
    tripDate: string
  ): Promise<DayTravelMatrix | null> {
    const cacheKey = `matrix_${tripId}_${dayId}_${tripDate}`;
    return mapsCacheRepository.get<DayTravelMatrix>(cacheKey);
  },

  /**
   * Map our TravelMode to Google's
   */
  mapTravelMode(mode: TravelMode): any {
    const mapping: Record<TravelMode, any> = {
      walking: google.maps.TravelMode.WALKING,
      transit: google.maps.TravelMode.TRANSIT,
      driving: google.maps.TravelMode.DRIVING,
      bicycling: google.maps.TravelMode.BICYCLING,
    };
    return mapping[mode];
  },
};
```

**Hook:** `src/hooks/useDistanceMatrix.ts`

```typescript
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
```

---

### 5.4 Feature 1: Places Autocomplete API

**New File:** `src/services/maps/placesService.ts`

```typescript
import type {
  PlacePrediction,
  PlaceDetails,
  NearbySearchRequest,
  NearbyPlace,
  GeoCoordinates,
} from '@/types/maps';
import { mapsCacheRepository } from '@/services/db/mapsCacheRepository';
import {
  generatePlaceDetailsCacheKey,
  generateNearbyCacheKey,
  getDistanceKm,
} from '@/utils/geo';

declare const google: any;

// Fields to request from Place Details API
// Using Basic fields to minimize cost
const PLACE_FIELDS = [
  'place_id',
  'name',
  'formatted_address',
  'geometry',
  'rating',
  'user_ratings_total',
  'price_level',
  'formatted_phone_number',
  'website',
  'opening_hours',
  'types',
  'business_status',
  'icon',
];

/**
 * Session token manager for Places Autocomplete billing optimization
 */
class SessionTokenManager {
  private token: any = null;
  private timeoutId: number | null = null;

  getToken(): any {
    if (!this.token) {
      this.token = new google.maps.places.AutocompleteSessionToken();
      this.resetTimeout();
    }
    return this.token;
  }

  clearToken(): void {
    this.token = null;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private resetTimeout(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    // Auto-clear after 3 minutes of inactivity
    this.timeoutId = window.setTimeout(() => this.clearToken(), 180000);
  }
}

const sessionTokenManager = new SessionTokenManager();

export const placesService = {
  /**
   * Get autocomplete predictions for search query
   */
  async getAutocomplete(
    input: string,
    options?: {
      locationBias?: GeoCoordinates;
      radius?: number;
      types?: string[];
    }
  ): Promise<PlacePrediction[]> {
    if (input.length < 3) return [];

    return new Promise((resolve, reject) => {
      const service = new google.maps.places.AutocompleteService();
      const sessionToken = sessionTokenManager.getToken();

      const request: any = {
        input,
        sessionToken,
        types: options?.types || ['establishment', 'geocode'],
      };

      // Add location bias if provided (bias results to trip area)
      if (options?.locationBias) {
        request.locationBias = {
          center: options.locationBias,
          radius: options.radius || 50000, // 50km default
        };
      }

      service.getPlacePredictions(request, (predictions: any[], status: string) => {
        if (status !== 'OK' && status !== 'ZERO_RESULTS') {
          reject(new Error(`Autocomplete failed: ${status}`));
          return;
        }

        const results: PlacePrediction[] = (predictions || []).map((p) => ({
          placeId: p.place_id,
          mainText: p.structured_formatting.main_text,
          secondaryText: p.structured_formatting.secondary_text || '',
          description: p.description,
          types: p.types || [],
        }));

        resolve(results);
      });
    });
  },

  /**
   * Get detailed information about a place
   * Results are cached for 24 hours
   */
  async getDetails(
    placeId: string,
    useSessionToken: boolean = true
  ): Promise<PlaceDetails> {
    // Check cache first
    const cacheKey = generatePlaceDetailsCacheKey(placeId);
    const cached = await mapsCacheRepository.get<PlaceDetails>(cacheKey);
    if (cached) {
      return cached;
    }

    return new Promise((resolve, reject) => {
      // Create a temporary div for PlacesService (required by API)
      const container = document.createElement('div');
      const service = new google.maps.places.PlacesService(container);

      const request: any = {
        placeId,
        fields: PLACE_FIELDS,
      };

      // Use session token if this follows autocomplete
      if (useSessionToken) {
        request.sessionToken = sessionTokenManager.getToken();
        // Clear token after details request (ends billing session)
        sessionTokenManager.clearToken();
      }

      service.getDetails(request, async (place: any, status: string) => {
        if (status !== 'OK') {
          reject(new Error(`Place details failed: ${status}`));
          return;
        }

        const details: PlaceDetails = {
          placeId: place.place_id,
          name: place.name,
          formattedAddress: place.formatted_address,
          coordinates: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          },
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total,
          priceLevel: place.price_level,
          phoneNumber: place.formatted_phone_number,
          website: place.website,
          openingHours: place.opening_hours
            ? {
                isOpenNow: place.opening_hours.isOpen?.() ?? false,
                weekdayText: place.opening_hours.weekday_text || [],
                periods: place.opening_hours.periods || [],
              }
            : undefined,
          types: place.types || [],
          iconUrl: place.icon,
          businessStatus: place.business_status,
          fetchedAt: new Date().toISOString(),
        };

        // Cache result
        await mapsCacheRepository.set(cacheKey, details, 'place_details');

        resolve(details);
      });
    });
  },

  /**
   * Search for places near a location
   */
  async nearbySearch(request: NearbySearchRequest): Promise<NearbyPlace[]> {
    // Check cache
    const cacheKey = generateNearbyCacheKey(
      request.location,
      request.type || 'all',
      request.radius,
      request.openNow
    );
    const cached = await mapsCacheRepository.get<NearbyPlace[]>(cacheKey);
    if (cached) {
      return cached;
    }

    return new Promise((resolve, reject) => {
      const container = document.createElement('div');
      const service = new google.maps.places.PlacesService(container);

      const searchRequest: any = {
        location: request.location,
        radius: request.radius,
        type: request.type,
        keyword: request.keyword,
        openNow: request.openNow,
      };

      if (request.minPrice !== undefined) {
        searchRequest.minPriceLevel = request.minPrice;
      }
      if (request.maxPrice !== undefined) {
        searchRequest.maxPriceLevel = request.maxPrice;
      }

      service.nearbySearch(searchRequest, async (results: any[], status: string) => {
        if (status !== 'OK' && status !== 'ZERO_RESULTS') {
          reject(new Error(`Nearby search failed: ${status}`));
          return;
        }

        const places: NearbyPlace[] = (results || []).map((p) => {
          const coords = {
            lat: p.geometry.location.lat(),
            lng: p.geometry.location.lng(),
          };

          return {
            placeId: p.place_id,
            name: p.name,
            vicinity: p.vicinity || '',
            coordinates: coords,
            rating: p.rating,
            userRatingsTotal: p.user_ratings_total,
            priceLevel: p.price_level,
            types: p.types || [],
            isOpenNow: p.opening_hours?.isOpen?.() ?? undefined,
            distanceMeters: Math.round(
              getDistanceKm(
                request.location.lat,
                request.location.lng,
                coords.lat,
                coords.lng
              ) * 1000
            ),
          };
        });

        // Sort by distance
        places.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));

        // Cache result
        await mapsCacheRepository.set(cacheKey, places, 'nearby');

        resolve(places);
      });
    });
  },
};
```

---

### 5.5 Feature 6: Custom Map Styling

**New File:** `src/components/maps/CustomMapStyles.ts`

```typescript
import type { MapStylePreset, MapStyleConfig } from '@/types/maps';

export const MAP_STYLES: Record<MapStylePreset, MapStyleConfig> = {
  default: {
    id: 'trip_pilot_map',
    name: 'Default',
    styles: [],
  },

  minimal: {
    id: 'trip_pilot_minimal',
    name: 'Minimal',
    styles: [
      // Hide most POIs
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      // Show parks and attractions
      { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'on' }] },
      { featureType: 'poi.attraction', elementType: 'labels', stylers: [{ visibility: 'on' }] },
      // Simplify roads
      { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      // Mute colors
      { featureType: 'water', stylers: [{ color: '#e0e7ef' }] },
      { featureType: 'landscape', stylers: [{ color: '#f5f5f5' }] },
    ],
  },

  dark: {
    id: 'trip_pilot_dark',
    name: 'Dark Mode',
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
      { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1d2c4d' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
      { featureType: 'water', stylers: [{ color: '#0e1626' }] },
      { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
      { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
    ],
  },

  satellite: {
    id: 'trip_pilot_satellite',
    name: 'Satellite',
    mapTypeId: 'hybrid',
    styles: [],
  },

  terrain: {
    id: 'trip_pilot_terrain',
    name: 'Terrain',
    mapTypeId: 'terrain',
    styles: [],
  },
};

/**
 * Get map style config by preset name
 */
export function getMapStyle(preset: MapStylePreset): MapStyleConfig {
  return MAP_STYLES[preset] || MAP_STYLES.default;
}
```

---

### 5.6 Feature 7: Marker Clustering

**New File:** `src/components/maps/MarkerCluster.tsx`

```typescript
import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import type { ClusterConfig } from '@/types/maps';

interface MarkerClusterProps {
  markers: google.maps.marker.AdvancedMarkerElement[];
  config?: Partial<ClusterConfig>;
  enabled?: boolean;
}

/**
 * Creates cluster element for rendering
 */
function createClusterElement(count: number): HTMLElement {
  const div = document.createElement('div');

  // Size based on count
  let size: 'small' | 'medium' | 'large' = 'small';
  if (count >= 50) size = 'large';
  else if (count >= 10) size = 'medium';

  const sizeClasses = {
    small: 'w-8 h-8 text-xs bg-blue-500',
    medium: 'w-10 h-10 text-sm bg-blue-600',
    large: 'w-12 h-12 text-base bg-blue-700',
  };

  div.className = `
    flex items-center justify-center rounded-full
    font-bold text-white shadow-lg border-2 border-white
    ${sizeClasses[size]}
  `;
  div.textContent = count.toString();

  return div;
}

export function MarkerCluster({
  markers,
  config,
  enabled = true,
}: MarkerClusterProps) {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);

  useEffect(() => {
    if (!map || !enabled || markers.length === 0) {
      // Clean up existing clusterer
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      return;
    }

    // Create new clusterer
    clustererRef.current = new MarkerClusterer({
      map,
      markers,
      algorithm: new SuperClusterAlgorithm({
        maxZoom: config?.maxZoom ?? 15,
        radius: config?.gridSize ?? 60,
      }),
      renderer: {
        render: ({ count, position }) => {
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: createClusterElement(count),
            zIndex: 1000,
          });
        },
      },
    });

    return () => {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
    };
  }, [map, markers, config, enabled]);

  return null; // Renders via side effects
}
```

---

### 5.7 Feature 9: Route Optimizer

**New File:** `src/services/maps/routeOptimizerService.ts`

```typescript
import type {
  OptimizeRouteRequest,
  OptimizedRoute,
  OptimizedLeg,
  TravelMode,
  GeoCoordinates,
} from '@/types/maps';
import { getDistanceKm } from '@/utils/geo';

declare const google: any;

export const routeOptimizerService = {
  /**
   * Optimize waypoint order to minimize travel time/distance
   * Uses Google Directions API with optimizeWaypoints flag
   */
  async optimize(request: OptimizeRouteRequest): Promise<OptimizedRoute> {
    const { waypoints, travelMode, departureTime } = request;

    if (waypoints.length < 3) {
      throw new Error('Need at least 3 waypoints to optimize');
    }

    // Separate fixed and flexible waypoints
    const firstFixed = waypoints.find((w) => w.fixedPosition === 'first');
    const lastFixed = waypoints.find((w) => w.fixedPosition === 'last');
    const flexible = waypoints.filter((w) => !w.fixedPosition);

    // If everything is fixed, nothing to optimize
    if (flexible.length <= 1) {
      return this.buildUnoptimizedResult(waypoints);
    }

    // Set origin and destination
    const origin = firstFixed?.location || flexible[0].location;
    const destination = lastFixed?.location || flexible[flexible.length - 1].location;

    // Build intermediate waypoints
    const intermediates = flexible
      .filter((w) => w.location !== origin && w.location !== destination)
      .map((w) => ({
        location: w.location,
        stopover: true,
      }));

    return new Promise((resolve, reject) => {
      const directionsService = new google.maps.DirectionsService();

      const directionsRequest: any = {
        origin,
        destination,
        waypoints: intermediates,
        optimizeWaypoints: true, // KEY: Enable optimization
        travelMode: this.mapTravelMode(travelMode),
      };

      if (departureTime && travelMode === 'driving') {
        directionsRequest.drivingOptions = {
          departureTime,
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        };
      }

      directionsService.route(directionsRequest, (response: any, status: string) => {
        if (status !== 'OK') {
          reject(new Error(`Route optimization failed: ${status}`));
          return;
        }

        const route = response.routes[0];
        const waypointOrder = route.waypoint_order;

        // Build optimized order
        const optimizedOrder: string[] = [];
        if (firstFixed) optimizedOrder.push(firstFixed.activityId);

        waypointOrder.forEach((index: number) => {
          const waypoint = flexible[index];
          if (waypoint && !waypoint.fixedPosition) {
            optimizedOrder.push(waypoint.activityId);
          }
        });

        if (lastFixed) optimizedOrder.push(lastFixed.activityId);

        // Calculate totals
        let totalDistance = 0;
        let totalDuration = 0;
        const legs: OptimizedLeg[] = [];

        route.legs.forEach((leg: any, index: number) => {
          totalDistance += leg.distance.value;
          totalDuration += leg.duration.value;

          legs.push({
            fromActivityId: optimizedOrder[index],
            toActivityId: optimizedOrder[index + 1],
            distance: leg.distance.value,
            duration: leg.duration.value,
            polyline: leg.overview_polyline || '',
          });
        });

        // Calculate original route for comparison
        const originalOrder = waypoints.map((w) => w.activityId);
        const originalTotals = this.calculateOriginalTotals(waypoints);

        resolve({
          originalOrder,
          optimizedOrder,
          totalDistance,
          totalDuration,
          timeSaved: originalTotals.duration - totalDuration,
          distanceSaved: originalTotals.distance - totalDistance,
          legs,
        });
      });
    });
  },

  /**
   * Check if optimization would provide meaningful improvement (>10%)
   */
  async wouldBenefitFromOptimization(
    waypoints: { location: GeoCoordinates }[]
  ): Promise<boolean> {
    if (waypoints.length < 3) return false;

    // Calculate naive total distance
    let naiveDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      naiveDistance += getDistanceKm(
        waypoints[i].location.lat,
        waypoints[i].location.lng,
        waypoints[i + 1].location.lat,
        waypoints[i + 1].location.lng
      );
    }

    // If route is very short, don't bother optimizing
    if (naiveDistance < 5) return false;

    return true;
  },

  /**
   * Build result when no optimization possible
   */
  buildUnoptimizedResult(waypoints: any[]): OptimizedRoute {
    const order = waypoints.map((w) => w.activityId);
    const totals = this.calculateOriginalTotals(waypoints);

    return {
      originalOrder: order,
      optimizedOrder: order,
      totalDistance: totals.distance,
      totalDuration: totals.duration,
      timeSaved: 0,
      distanceSaved: 0,
      legs: [],
    };
  },

  /**
   * Calculate original route totals using haversine
   */
  calculateOriginalTotals(
    waypoints: { location: GeoCoordinates }[]
  ): { distance: number; duration: number } {
    let distance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      distance +=
        getDistanceKm(
          waypoints[i].location.lat,
          waypoints[i].location.lng,
          waypoints[i + 1].location.lat,
          waypoints[i + 1].location.lng
        ) * 1000; // Convert to meters
    }

    // Estimate duration (assume 30 km/h average)
    const duration = (distance / 1000 / 30) * 60 * 60;

    return { distance, duration };
  },

  mapTravelMode(mode: TravelMode): any {
    const mapping: Record<TravelMode, any> = {
      walking: google.maps.TravelMode.WALKING,
      transit: google.maps.TravelMode.TRANSIT,
      driving: google.maps.TravelMode.DRIVING,
      bicycling: google.maps.TravelMode.BICYCLING,
    };
    return mapping[mode];
  },
};
```

---

### 5.8 Feature 10: Live Tracking

**New File:** `src/hooks/useLiveTracking.ts`

```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import type { Activity } from '@/types/itinerary';
import type { LiveTrackingState, GeoCoordinates } from '@/types/maps';
import { getDistanceKm, estimateTime } from '@/utils/geo';

const initialState: LiveTrackingState = {
  isTracking: false,
  currentLocation: null,
  accuracy: null,
  heading: null,
  speed: null,
  lastUpdated: null,
  error: null,
  nearestActivity: null,
  nextActivity: null,
};

interface UseLiveTrackingResult extends LiveTrackingState {
  startTracking: () => void;
  stopTracking: () => void;
}

export function useLiveTracking(
  dayActivities: Activity[]
): UseLiveTrackingResult {
  const [state, setState] = useState<LiveTrackingState>(initialState);
  const watchIdRef = useRef<number | null>(null);

  /**
   * Find nearest activity to current location
   */
  const findNearestActivity = useCallback(
    (location: GeoCoordinates) => {
      if (!dayActivities.length) return null;

      let nearest: { activityId: string; distanceMeters: number } | null = null;

      for (const activity of dayActivities) {
        if (!activity.location.coordinates) continue;

        const distance =
          getDistanceKm(
            location.lat,
            location.lng,
            activity.location.coordinates.lat,
            activity.location.coordinates.lng
          ) * 1000;

        if (!nearest || distance < nearest.distanceMeters) {
          nearest = {
            activityId: activity.id,
            distanceMeters: Math.round(distance),
          };
        }
      }

      return nearest;
    },
    [dayActivities]
  );

  /**
   * Find next upcoming activity by time
   */
  const findNextActivity = useCallback(
    (location: GeoCoordinates) => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Find first activity that hasn't started yet
      const upcoming = dayActivities.find((a) => {
        if (!a.time || !a.location.coordinates) return false;
        // Simple time comparison (assumes same day)
        return a.time > currentTime;
      });

      if (!upcoming || !upcoming.location.coordinates) return null;

      const distance =
        getDistanceKm(
          location.lat,
          location.lng,
          upcoming.location.coordinates.lat,
          upcoming.location.coordinates.lng
        ) * 1000;

      // Estimate arrival time (walking speed)
      const walkingMinutes = Math.round((distance / 1000) / 4.5 * 60);
      const estimatedArrival = new Date(now.getTime() + walkingMinutes * 60000);

      return {
        activityId: upcoming.id,
        distanceMeters: Math.round(distance),
        estimatedArrival: estimatedArrival.toISOString(),
      };
    },
    [dayActivities]
  );

  /**
   * Start tracking user location
   */
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
      }));
      return;
    }

    setState((prev) => ({ ...prev, isTracking: true, error: null }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const currentLocation: GeoCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        const nearestActivity = findNearestActivity(currentLocation);
        const nextActivity = findNextActivity(currentLocation);

        setState({
          isTracking: true,
          currentLocation,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          lastUpdated: new Date().toISOString(),
          error: null,
          nearestActivity,
          nextActivity,
        });
      },
      (error) => {
        let errorMessage = 'Unable to retrieve location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Enable in browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }

        setState((prev) => ({
          ...prev,
          isTracking: false,
          error: errorMessage,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000, // Accept 5-second-old positions for smoother UX
      }
    );
  }, [findNearestActivity, findNextActivity]);

  /**
   * Stop tracking user location
   */
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isTracking: false,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
  };
}
```

**New File:** `src/components/maps/UserLocationMarker.tsx`

```typescript
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { GeoCoordinates } from '@/types/maps';

interface UserLocationMarkerProps {
  location: GeoCoordinates;
  accuracy?: number | null;
  heading?: number | null;
}

export function UserLocationMarker({
  location,
  accuracy,
  heading,
}: UserLocationMarkerProps) {
  return (
    <>
      {/* Accuracy circle (rendered as a styled div overlay) */}
      {accuracy && accuracy > 20 && (
        <AdvancedMarker position={location} zIndex={998}>
          <div
            className="rounded-full bg-blue-500/10 border border-blue-500/30"
            style={{
              width: Math.min(accuracy * 2, 200),
              height: Math.min(accuracy * 2, 200),
              transform: 'translate(-50%, -50%)',
            }}
          />
        </AdvancedMarker>
      )}

      {/* User location dot */}
      <AdvancedMarker position={location} zIndex={1000}>
        <div className="relative">
          {/* Pulse animation */}
          <div className="absolute inset-0 w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-75" />

          {/* Solid dot */}
          <div className="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg" />

          {/* Heading indicator */}
          {heading !== null && heading !== undefined && (
            <div
              className="absolute -top-2 left-1/2 w-0 h-0
                border-l-4 border-r-4 border-b-8
                border-l-transparent border-r-transparent border-b-blue-600"
              style={{
                transform: `translateX(-50%) rotate(${heading}deg)`,
                transformOrigin: 'bottom center',
              }}
            />
          )}
        </div>
      </AdvancedMarker>
    </>
  );
}
```

---

## 6. API Contracts

### 6.1 Service Function Signatures

```typescript
// src/services/maps/placesService.ts
export const placesService = {
  getAutocomplete(
    input: string,
    options?: { locationBias?: GeoCoordinates; radius?: number; types?: string[] }
  ): Promise<PlacePrediction[]>;

  getDetails(
    placeId: string,
    useSessionToken?: boolean
  ): Promise<PlaceDetails>;

  nearbySearch(request: NearbySearchRequest): Promise<NearbyPlace[]>;
};

// src/services/maps/directionsService.ts
export const directionsService = {
  getDirections(
    request: DirectionsRequest,
    useCache?: boolean
  ): Promise<DirectionsResult>;

  invalidateCache(
    origin: GeoCoordinates,
    destination: GeoCoordinates
  ): Promise<void>;
};

// src/services/maps/distanceMatrixService.ts
export const distanceMatrixService = {
  calculateDayMatrix(
    day: DayItinerary,
    tripId: string,
    tripDate: string
  ): Promise<DayTravelMatrix | null>;

  getCachedDayMatrix(
    tripId: string,
    dayId: string,
    tripDate: string
  ): Promise<DayTravelMatrix | null>;
};

// src/services/maps/routeOptimizerService.ts
export const routeOptimizerService = {
  optimize(request: OptimizeRouteRequest): Promise<OptimizedRoute>;

  wouldBenefitFromOptimization(
    waypoints: { location: GeoCoordinates }[]
  ): Promise<boolean>;
};

// src/services/db/mapsCacheRepository.ts
export const mapsCacheRepository = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, data: unknown, type: MapsCacheEntry['type'], hasTrafficData?: boolean): Promise<void>;
  delete(key: string): Promise<void>;
  clearExpired(): Promise<number>;
  clearByType(type: MapsCacheEntry['type']): Promise<void>;
  getStats(): Promise<{ totalEntries: number; byType: Record<string, number>; oldestEntry: string | null }>;
};
```

### 6.2 Hook Signatures

```typescript
// src/hooks/usePlacesAutocomplete.ts
export function usePlacesAutocomplete(options?: {
  locationBias?: GeoCoordinates;
  debounceMs?: number;
}): {
  query: string;
  setQuery: (q: string) => void;
  predictions: PlacePrediction[];
  isLoading: boolean;
  error: string | null;
  selectPlace: (placeId: string) => Promise<PlaceDetails>;
  clearPredictions: () => void;
};

// src/hooks/usePlaceDetails.ts
export function usePlaceDetails(placeId: string | null): {
  details: PlaceDetails | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

// src/hooks/useNearbyPlaces.ts
export function useNearbyPlaces(
  anchor: GeoCoordinates | null,
  category: string | null,
  options?: { radius?: number; openNow?: boolean }
): {
  places: NearbyPlace[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

// src/hooks/useDistanceMatrix.ts
export function useDistanceMatrix(
  day: DayItinerary | null,
  tripId: string | null,
  tripDate: string | null
): {
  matrix: DayTravelMatrix | null;
  isLoading: boolean;
  error: string | null;
  getLegData: (startId: string, endId: string) => TravelLegData | null;
  refresh: () => Promise<void>;
};

// src/hooks/useRouteOptimizer.ts
export function useRouteOptimizer(
  activities: Activity[],
  options?: { firstFixed?: string; lastFixed?: string }
): {
  optimizedRoute: OptimizedRoute | null;
  isOptimizing: boolean;
  error: string | null;
  optimize: () => Promise<void>;
  applyOptimization: () => void;
  canOptimize: boolean;
};

// src/hooks/useLiveTracking.ts
export function useLiveTracking(dayActivities: Activity[]): LiveTrackingState & {
  startTracking: () => void;
  stopTracking: () => void;
};
```

---

## 7. Edge Cases & Error Handling

### 7.1 Critical Edge Cases

| # | Scenario | Solution |
|---|----------|----------|
| 1 | **API quota exceeded** | Implement exponential backoff retry (max 3 attempts). Show user-friendly error. |
| 2 | **Missing coordinates** | Filter activities before processing. Skip legs with invalid coords. |
| 3 | **Offline mode** | Return cached data with `isStale: true` flag. Show "offline" indicator. |
| 4 | **Session token leak** | Auto-clear token after 3 minutes or after place details fetch. |
| 5 | **Route not found** | Handle `ZERO_RESULTS` gracefully. Fall back to haversine distance. |
| 6 | **Geolocation denied** | Store denial in localStorage. Don't re-prompt. Show settings link. |
| 7 | **Large day (20+ activities)** | Batch distance matrix queries with 100ms delay between batches. |
| 8 | **Timezone mismatch** | Always use trip timezone for departure times. |

### 7.2 Error Handling Pattern

```typescript
// Standard error handler for all maps services
export async function withMapsErrorHandling<T>(
  operation: string,
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Log for debugging
    console.error(`[Maps ${operation}] Error:`, message);

    // Handle specific API errors
    if (message.includes('OVER_QUERY_LIMIT')) {
      // Wait and retry once
      await new Promise((r) => setTimeout(r, 2000));
      try {
        return await fn();
      } catch {
        // Give up
      }
    }

    // Return fallback if provided
    if (fallback !== undefined) {
      return fallback;
    }

    return null;
  }
}
```

---

## 8. Implementation Steps

### Phase 1: Quick Wins (Days 1-2)

**Step 1:** Install dependency
```bash
npm install @googlemaps/markerclusterer@2.5.3
```

**Step 2:** Create `src/types/maps.ts`
- Copy all type definitions from Section 3.1
- Export all types from `src/types/index.ts`

**Step 3:** Modify `src/types/itinerary.ts`
- Add `placeId?: string` to `LocationData` interface

**Step 4:** Update `src/services/db/index.ts`
- Bump `DB_VERSION` to 2
- Add `mapsCache` and `dayTravelMatrices` object stores
- Add upgrade migration

**Step 5:** Create `src/services/db/mapsCacheRepository.ts`
- Implement all CRUD operations
- Include TTL checking

**Step 6:** Add cache key generators to `src/utils/geo.ts`
- `generateDirectionsCacheKey()`
- `generatePlaceDetailsCacheKey()`
- `generateNearbyCacheKey()`
- `getDepartureTime()`
- `parseActivityDateTime()`

**Step 7:** Create `src/services/maps/directionsService.ts`
- Implement cached directions with departure_time support

**Step 8:** Modify `MapView.tsx` ActiveLegRoute component
- Use new directionsService
- Pass departure time from activity

---

### Phase 2: Distance Matrix (Days 3-4)

**Step 9:** Create `src/services/maps/distanceMatrixService.ts`
- Implement `calculateDayMatrix()`
- Implement `getCachedDayMatrix()`

**Step 10:** Create `src/hooks/useDistanceMatrix.ts`
- Hook that auto-calculates on day load

**Step 11:** Modify `TravelView.tsx`
- Use `useDistanceMatrix` instead of inline haversine calculations
- Display real API travel times

---

### Phase 3: Places API (Days 5-7)

**Step 12:** Create `src/services/maps/placesService.ts`
- Implement `getAutocomplete()`
- Implement `getDetails()`
- Implement `nearbySearch()`

**Step 13:** Create `src/hooks/usePlacesAutocomplete.ts`
- Debounced search
- Session token management

**Step 14:** Create `src/hooks/usePlaceDetails.ts`
- Fetch and cache details

**Step 15:** Create `src/hooks/useNearbyPlaces.ts`
- Category-based search

**Step 16:** Create `src/components/maps/PlacesAutocomplete.tsx`
- Search input with dropdown
- Keyboard navigation

**Step 17:** Create `src/components/maps/PlaceDetailsCard.tsx`
- Ratings, hours, contact display

**Step 18:** Create `src/components/maps/NearbyPlacesPanel.tsx`
- Category tabs
- Results list

---

### Phase 4: Map Enhancement (Days 8-9)

**Step 19:** Create `src/components/maps/CustomMapStyles.ts`
- Define all style presets

**Step 20:** Create `src/stores/mapsStore.ts`
- Map style preference
- Clustering toggle
- Persist to localStorage

**Step 21:** Create `src/components/maps/MarkerCluster.tsx`
- Wrapper using @googlemaps/markerclusterer

**Step 22:** Modify `MapView.tsx`
- Add style selector
- Integrate MarkerCluster conditionally

---

### Phase 5: Route Optimization (Days 10-11)

**Step 23:** Create `src/services/maps/routeOptimizerService.ts`
- Implement `optimize()` with `optimizeWaypoints: true`

**Step 24:** Create `src/hooks/useRouteOptimizer.ts`
- Wrap service
- Provide `applyOptimization()`

**Step 25:** Create `src/components/maps/RouteOptimizerPanel.tsx`
- Before/after comparison
- Savings display
- Apply button

---

### Phase 6: Live Tracking (Days 12-13)

**Step 26:** Create `src/hooks/useLiveTracking.ts`
- Wrap `watchPosition`
- Calculate nearest/next activity

**Step 27:** Create `src/components/maps/UserLocationMarker.tsx`
- Pulsing blue dot
- Heading indicator

**Step 28:** Modify `src/stores/uiStore.ts`
- Add `isLiveTrackingEnabled`

**Step 29:** Integrate into MapView and TodayView
- Toggle button
- Distance to next activity

---

### Phase 7: Final Integration (Day 14)

**Step 30:** Create barrel exports
- `src/services/maps/index.ts`
- `src/components/maps/index.ts`

**Step 31:** Add cache cleanup on app load
```typescript
// In App.tsx or main.tsx
useEffect(() => {
  mapsCacheRepository.clearExpired();
}, []);
```

**Step 32:** Test all features
- Offline fallback
- Various trip sizes
- Permission flows
- API billing verification

---

## 9. Google Cloud API Requirements

### APIs to Enable in Google Cloud Console

| API | Status | Purpose |
|-----|--------|---------|
| Maps JavaScript API | Already enabled | Core map rendering |
| Directions API | Already enabled | Route visualization |
| **Places API** | **NEW - Enable** | Autocomplete, Details, Nearby |
| **Distance Matrix API** | **NEW - Enable** | Batch travel calculations |

### Billing Estimates (per 1000 requests)

| API | Cost | Notes |
|-----|------|-------|
| Places Autocomplete | $2.83 | With session tokens |
| Place Details (Basic) | $17.00 | Basic fields only |
| Distance Matrix | $5.00 | Per element |
| Directions | $5.00 | Per request |

### Recommended Quotas

Set these in Google Cloud Console to prevent unexpected charges:

- Places Autocomplete: 10,000/day
- Place Details: 5,000/day
- Distance Matrix: 5,000/day
- Directions: 10,000/day

---

**END OF TECHNICAL DESIGN DOCUMENT**

*This document is the authoritative reference for implementing Google Maps features. Follow the implementation steps in order.*
