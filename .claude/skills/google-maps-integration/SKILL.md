---
name: google-maps-integration
description: Google Maps integration patterns including Places API, Directions API, marker clustering, and caching. Use when working with maps, location search, route calculation, or geocoding.
---

# Google Maps Integration

This project uses @vis.gl/react-google-maps with singleton service patterns.

## Service Pattern

```typescript
// src/services/maps/placesService.ts
import type { PlacePrediction, PlaceDetails, GeoCoordinates } from '@/types/maps';
import { MAPS_CONFIG } from '@/config/mapsConfig';

// Singleton service object
export const placesService = {
  // Session token for billing optimization
  private sessionToken: google.maps.places.AutocompleteSessionToken | null = null,

  getSessionToken(): google.maps.places.AutocompleteSessionToken {
    if (!this.sessionToken) {
      this.sessionToken = new google.maps.places.AutocompleteSessionToken();
    }
    return this.sessionToken;
  },

  resetSessionToken(): void {
    this.sessionToken = null;
  },

  async getAutocomplete(
    input: string,
    options?: { locationBias?: GeoCoordinates; types?: string[] }
  ): Promise<PlacePrediction[]> {
    const service = new google.maps.places.AutocompleteService();

    const request: google.maps.places.AutocompletionRequest = {
      input,
      sessionToken: this.getSessionToken(),
      ...(options?.locationBias && {
        locationBias: {
          center: options.locationBias,
          radius: MAPS_CONFIG.DEFAULT_RADIUS,
        },
      }),
      ...(options?.types && { types: options.types }),
    };

    return new Promise((resolve, reject) => {
      service.getPlacePredictions(request, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          resolve(predictions.map(this.formatPrediction));
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error(`Places API error: ${status}`));
        }
      });
    });
  },

  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    const service = new google.maps.places.PlacesService(
      document.createElement('div')
    );

    const request: google.maps.places.PlaceDetailsRequest = {
      placeId,
      sessionToken: this.getSessionToken(),
      fields: ['name', 'formatted_address', 'geometry', 'place_id', 'types', 'photos'],
    };

    return new Promise((resolve, reject) => {
      service.getDetails(request, (place, status) => {
        // Reset session token after getDetails (end of session)
        this.resetSessionToken();

        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(this.formatPlaceDetails(place));
        } else {
          reject(new Error(`Place details error: ${status}`));
        }
      });
    });
  },

  async geocode(address: string): Promise<GeoCoordinates | null> {
    const geocoder = new google.maps.Geocoder();

    const result = await geocoder.geocode({ address });
    if (result.results.length === 0) return null;

    const location = result.results[0].geometry.location;
    return { lat: location.lat(), lng: location.lng() };
  },

  private formatPrediction(prediction: google.maps.places.AutocompletePrediction): PlacePrediction {
    return {
      placeId: prediction.place_id,
      mainText: prediction.structured_formatting.main_text,
      secondaryText: prediction.structured_formatting.secondary_text || '',
      description: prediction.description,
    };
  },

  private formatPlaceDetails(place: google.maps.places.PlaceResult): PlaceDetails {
    return {
      placeId: place.place_id!,
      name: place.name!,
      address: place.formatted_address!,
      coordinates: {
        lat: place.geometry!.location!.lat(),
        lng: place.geometry!.location!.lng(),
      },
      types: place.types || [],
    };
  },
};
```

## Directions Service

```typescript
// src/services/maps/directionsService.ts
import type { GeoCoordinates } from '@/types/maps';

export interface RouteResult {
  distance: number;  // meters
  duration: number;  // seconds
  polyline: string;  // encoded polyline
}

export const directionsService = {
  async getRoute(
    origin: GeoCoordinates,
    destination: GeoCoordinates,
    travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
  ): Promise<RouteResult> {
    const service = new google.maps.DirectionsService();

    const request: google.maps.DirectionsRequest = {
      origin,
      destination,
      travelMode,
    };

    return new Promise((resolve, reject) => {
      service.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const route = result.routes[0];
          const leg = route.legs[0];

          resolve({
            distance: leg.distance?.value || 0,
            duration: leg.duration?.value || 0,
            polyline: route.overview_polyline,
          });
        } else {
          reject(new Error(`Directions error: ${status}`));
        }
      });
    });
  },
};
```

## React Google Maps Component

```typescript
// src/components/maps/TripMap.tsx
import { Map, Marker, useMap } from '@vis.gl/react-google-maps';
import type { GeoCoordinates, Activity } from '@/types';

interface TripMapProps {
  center: GeoCoordinates;
  activities: Activity[];
  onMarkerClick?: (activityId: string) => void;
}

export function TripMap({ center, activities, onMarkerClick }: TripMapProps) {
  const map = useMap();

  return (
    <Map
      defaultCenter={center}
      defaultZoom={13}
      mapId={import.meta.env.VITE_GOOGLE_MAPS_ID}
      gestureHandling="greedy"
      disableDefaultUI={false}
    >
      {activities.map((activity) => (
        activity.location?.coordinates && (
          <Marker
            key={activity.id}
            position={activity.location.coordinates}
            title={activity.title}
            onClick={() => onMarkerClick?.(activity.id)}
          />
        )
      ))}
    </Map>
  );
}
```

## Marker Clustering

```typescript
// src/utils/markerClusterer.ts
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { GeoCoordinates } from '@/types';

interface ClusterableMarker {
  id: string;
  position: GeoCoordinates;
  title: string;
}

export function createMarkerClusterer(
  map: google.maps.Map,
  markers: ClusterableMarker[],
  onMarkerClick?: (id: string) => void
): MarkerClusterer {
  const googleMarkers = markers.map((m) => {
    const marker = new google.maps.Marker({
      position: m.position,
      title: m.title,
    });

    if (onMarkerClick) {
      marker.addListener('click', () => onMarkerClick(m.id));
    }

    return marker;
  });

  return new MarkerClusterer({
    map,
    markers: googleMarkers,
    algorithmOptions: { maxZoom: 15 },
  });
}
```

## Caching with IndexedDB

```typescript
// src/services/db/mapsCache.ts
import { db } from './index';

interface CacheEntry<T> {
  key: string;
  data: T;
  expiresAt: number;
}

const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

export const mapsCache = {
  async get<T>(key: string): Promise<T | null> {
    const entry = await db.get('mapsCache', key) as CacheEntry<T> | undefined;

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      await db.delete('mapsCache', key);
      return null;
    }

    return entry.data;
  },

  async set<T>(key: string, data: T): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      data,
      expiresAt: Date.now() + CACHE_TTL,
    };
    await db.put('mapsCache', entry);
  },

  async clear(): Promise<void> {
    await db.clear('mapsCache');
  },
};

// Usage in service
async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  // Check cache first
  const cached = await mapsCache.get<PlaceDetails>(`place:${placeId}`);
  if (cached) return cached;

  // Fetch from API
  const details = await this.fetchPlaceDetails(placeId);

  // Cache result
  await mapsCache.set(`place:${placeId}`, details);

  return details;
}
```

## Config

```typescript
// src/config/mapsConfig.ts
export const MAPS_CONFIG = {
  DEFAULT_CENTER: { lat: 40.7128, lng: -74.0060 }, // NYC
  DEFAULT_ZOOM: 12,
  DEFAULT_RADIUS: 50000, // 50km
  AUTOCOMPLETE: {
    DEBOUNCE_MS: 300,
    MIN_INPUT_LENGTH: 2,
  },
  CACHE: {
    TTL_DAYS: 30,
  },
};
```

## Types

```typescript
// src/types/maps.ts
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface PlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  coordinates: GeoCoordinates;
  types: string[];
  photos?: string[];
}

export type TravelMode = 'driving' | 'walking' | 'transit' | 'bicycling';
```

## Common Patterns

1. **Session tokens**: Use for Places Autocomplete billing optimization
2. **Singleton services**: One service instance per API
3. **Cache responses**: Use IndexedDB for expensive API calls
4. **Error handling**: Map API status codes to user-friendly messages
5. **Lazy loading**: Load map components only when needed
