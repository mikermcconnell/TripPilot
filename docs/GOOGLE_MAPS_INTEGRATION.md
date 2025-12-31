# Google Maps API Integration Guide

Complete guide for using the Google Maps features in TripPlanner.

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Services](#services)
4. [React Hooks](#react-hooks)
5. [Components](#components)
6. [Configuration](#configuration)
7. [Examples](#examples)
8. [Caching Strategy](#caching-strategy)
9. [Cost Optimization](#cost-optimization)

---

## Overview

The TripPlanner app integrates comprehensive Google Maps functionality including:

- **Places API**: Autocomplete, place details, and nearby search
- **Directions API**: Traffic-aware routing with multiple travel modes
- **Distance Matrix API**: Batch distance/duration calculations
- **Route Optimization**: Intelligent activity ordering to minimize travel
- **Live Tracking**: Real-time user location with geolocation
- **Map Customization**: Custom styles and marker clustering

All features include:
- ✅ Automatic caching (IndexedDB)
- ✅ TypeScript type safety
- ✅ Error handling
- ✅ Loading states
- ✅ Cost optimization

---

## Setup

### 1. Environment Variable

Ensure `VITE_GOOGLE_MAPS_API_KEY` is set in your `.env` file:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 2. Required Google Maps APIs

Enable these APIs in Google Cloud Console:
- Places API (New)
- Maps JavaScript API
- Directions API
- Distance Matrix API
- Geocoding API (optional)

### 3. Database Migration

The app automatically migrates IndexedDB from v1 to v2, adding:
- `mapsCache` store: Caches directions, place details, and nearby searches
- `dayTravelMatrices` store: Stores distance matrices for day itineraries

---

## Services

### 1. Places Service

```typescript
import { placesService } from '@/services/maps';

// Autocomplete
const predictions = await placesService.getAutocomplete('coffee shop', {
  locationBias: { lat: 40.7128, lng: -74.0060 },
  radius: 5000,
  types: ['establishment']
});

// Place Details
const details = await placesService.getDetails('ChIJN1t_tDeuEmsRUsoyG83frY4');

// Nearby Search
const nearby = await placesService.nearbySearch({
  location: { lat: 40.7128, lng: -74.0060 },
  radius: 2000,
  type: 'restaurant',
  openNow: true
});
```

**Caching**:
- Autocomplete: Not cached (real-time)
- Place Details: 24 hours
- Nearby Search: 1 hour

### 2. Directions Service

```typescript
import { directionsService } from '@/services/maps';

const result = await directionsService.getDirections({
  origin: { lat: 40.7128, lng: -74.0060 },
  destination: { lat: 40.7580, lng: -73.9855 },
  travelMode: 'driving',
  departureTime: new Date(), // For traffic data
  avoidHighways: false,
  avoidTolls: false
});
```

**Caching**:
- With traffic data: 1 hour
- Without traffic: 24 hours

### 3. Distance Matrix Service

```typescript
import { distanceMatrixService } from '@/services/maps';
import type { DayItinerary } from '@/types/itinerary';

// Calculate matrix for a day
const matrix = await distanceMatrixService.calculateDayMatrix(
  day,
  tripId,
  tripDate
);

// Get specific leg
const leg = matrix.legs.find(
  l => l.startActivityId === 'act1' && l.endActivityId === 'act2'
);

console.log(`Walking: ${leg.walking.duration}s`);
console.log(`Transit: ${leg.transit.duration}s`);
console.log(`Driving: ${leg.driving.duration}s`);
```

**Features**:
- Queries 3 travel modes in parallel (walk, transit, drive)
- Caches per day/trip combination
- Traffic-aware with departure times

### 4. Route Optimization Service

```typescript
import { routeOptimizationService } from '@/services/maps';

// Check if optimization needed
const shouldOptimize = await routeOptimizationService.shouldOptimize(
  activities,
  'driving'
);

// Optimize route
const result = await routeOptimizationService.optimizeRoute(activities, {
  fixFirst: true, // Keep first activity (hotel)
  fixLast: false,
  preferredMode: 'driving'
});

console.log(`Saved ${result.savings.distanceReduced}m`);
console.log(`Saved ${result.savings.timeReduced}s`);
```

**Algorithm**: Greedy nearest-neighbor with optional fixed endpoints

### 5. Live Tracking Service

```typescript
import { liveTrackingService } from '@/services/liveTrackingService';

// Check support
if (liveTrackingService.isSupported()) {
  // Request permission
  const granted = await liveTrackingService.requestPermission();

  // Subscribe to updates
  const unsubscribe = liveTrackingService.subscribe((location) => {
    console.log('User at:', location.coordinates);
    console.log('Accuracy:', location.accuracy, 'm');
  });

  // Start tracking
  liveTrackingService.startTracking({
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 5000
  });

  // Later: stop and cleanup
  liveTrackingService.stopTracking();
  unsubscribe();
}
```

---

## React Hooks

### 1. usePlacesAutocomplete

```typescript
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';

function SearchComponent() {
  const { predictions, isLoading, search, clear } = usePlacesAutocomplete({
    debounceMs: 300,
    locationBias: userLocation,
    radius: 10000
  });

  return (
    <input
      onChange={(e) => search(e.target.value)}
      placeholder="Search places..."
    />
  );
}
```

**Features**:
- Automatic debouncing
- Session token management
- Abort previous requests

### 2. usePlaceDetails

```typescript
import { usePlaceDetails } from '@/hooks/usePlaceDetails';

function PlaceInfo({ placeId }: { placeId: string }) {
  const { details, isLoading, error } = usePlaceDetails(placeId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{details?.name}</div>;
}
```

### 3. useNearbyPlaces

```typescript
import { useNearbyPlaces } from '@/hooks/useNearbyPlaces';

function NearbyRestaurants() {
  const { places, isLoading, search } = useNearbyPlaces({
    location: currentLocation,
    radius: 2000,
    type: 'restaurant',
    openNow: true,
    autoFetch: true
  });

  return (
    <ul>
      {places.map(place => (
        <li key={place.placeId}>{place.name} - {place.distanceMeters}m</li>
      ))}
    </ul>
  );
}
```

### 4. useDistanceMatrix

```typescript
import { useDistanceMatrix } from '@/hooks/useDistanceMatrix';

function DayView({ day, tripId, tripDate }) {
  const { matrix, isLoading, getLegData } = useDistanceMatrix(
    day,
    tripId,
    tripDate
  );

  const leg = getLegData('act1', 'act2');

  return (
    <div>
      Walking: {leg?.walking.duration}s
      Transit: {leg?.transit.duration}s
      Driving: {leg?.driving.duration}s
    </div>
  );
}
```

### 5. useRouteOptimization

```typescript
import { useRouteOptimization } from '@/hooks/useRouteOptimization';

function OptimizationButton({ activities }) {
  const {
    shouldOptimize,
    optimizationResult,
    isOptimizing,
    optimize,
    applyOptimization
  } = useRouteOptimization(activities, 'driving');

  if (!shouldOptimize) return null;

  return (
    <button onClick={() => optimize(activities)}>
      {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
    </button>
  );
}
```

### 6. useLiveTracking

```typescript
import { useLiveTracking } from '@/hooks/useLiveTracking';

function LiveLocation({ destination }) {
  const {
    location,
    isTracking,
    distanceToTarget,
    startTracking,
    stopTracking
  } = useLiveTracking({
    autoStart: true,
    target: destination
  });

  return (
    <div>
      {isTracking && location && (
        <>
          <p>Your location: {location.coordinates.lat}, {location.coordinates.lng}</p>
          <p>Distance to destination: {distanceToTarget}m</p>
        </>
      )}
    </div>
  );
}
```

### 7. useMapMarkers

```typescript
import { useMapMarkers } from '@/hooks/useMapMarkers';

function MapWithMarkers({ map, activities }) {
  const { markers, setMarkerData, focusMarker } = useMapMarkers({
    map,
    enableClustering: true
  });

  useEffect(() => {
    const markerData = activities.map(act => ({
      id: act.id,
      position: act.location.coordinates,
      title: act.location.name,
      color: '#3b82f6',
      onClick: () => console.log('Clicked:', act.id)
    }));

    setMarkerData(markerData);
  }, [activities]);

  return null;
}
```

---

## Components

### 1. PlacesAutocomplete

```tsx
import { PlacesAutocomplete } from '@/components/maps/PlacesAutocomplete';

<PlacesAutocomplete
  onPlaceSelect={(prediction) => {
    console.log('Selected:', prediction.mainText);
    // Fetch details with prediction.placeId
  }}
  locationBias={currentLocation}
  placeholder="Search for a place..."
/>
```

### 2. PlaceDetailsCard

```tsx
import { PlaceDetailsCard } from '@/components/maps/PlaceDetailsCard';

<PlaceDetailsCard
  details={placeDetails}
  onAddToItinerary={(details) => {
    // Add to trip
  }}
  onClose={() => setShowCard(false)}
/>
```

### 3. NearbyPlacesPanel

```tsx
import { NearbyPlacesPanel } from '@/components/maps/NearbyPlacesPanel';

<NearbyPlacesPanel
  location={currentLocation}
  radius={2000}
  onPlaceClick={(place) => {
    // Show details or add to itinerary
  }}
/>
```

### 4. RouteOptimizationPanel

```tsx
import { RouteOptimizationPanel } from '@/components/optimization/RouteOptimizationPanel';

<RouteOptimizationPanel
  activities={dayActivities}
  travelMode="driving"
  onApplyOptimization={(optimized) => {
    // Update day with new activity order
  }}
/>
```

### 5. LiveLocationMarker

```tsx
import { LiveLocationMarker } from '@/components/maps/LiveLocationMarker';

<Map>
  <LiveLocationMarker
    target={nextActivityLocation}
    showAccuracyCircle={true}
    onLocationUpdate={(loc) => {
      console.log('User moved to:', loc.coordinates);
    }}
  />
</Map>
```

### 6. MapView with Custom Styles

```tsx
import MapView from '@/components/modals/MapView';

<MapView
  itinerary={itinerary}
  mapStyle="night" // 'default' | 'silver' | 'night' | 'aubergine' | 'minimal'
  showLiveLocation={true}
  enableClustering={false}
  // ... other props
/>
```

---

## Configuration

### Map Styles

Located in `src/config/mapStyles.ts`:

```typescript
import { getMapStyle, getMapStyleOptions } from '@/config/mapStyles';

// Get specific style
const nightStyle = getMapStyle('night');

// Get all options for UI selector
const styleOptions = getMapStyleOptions();
```

Available styles:
- `default`: Standard Google Maps
- `silver`: Clean, minimalist gray
- `night`: Dark theme
- `aubergine`: Elegant purple
- `minimal`: Reduced visual noise

### Marker Clustering

```typescript
import { createMarkerClusterer } from '@/utils/markerClusterer';

const clusterer = createMarkerClusterer(map, markers, {
  gridSize: 60,
  maxZoom: 15,
  minimumClusterSize: 2
});
```

---

## Examples

### Complete Place Search and Add to Trip

```typescript
function AddPlaceToTrip() {
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const { details, isLoading } = usePlaceDetails(selectedPlace);

  const handlePlaceSelect = (prediction: PlacePrediction) => {
    setSelectedPlace(prediction.placeId);
  };

  const handleAddToTrip = (details: PlaceDetails) => {
    // Add to itinerary
    addActivity({
      id: generateId(),
      location: {
        name: details.name,
        coordinates: details.coordinates,
        placeId: details.placeId,
        address: details.formattedAddress
      },
      time: '10:00',
      notes: ''
    });
  };

  return (
    <>
      <PlacesAutocomplete
        onPlaceSelect={handlePlaceSelect}
        locationBias={tripLocation}
      />

      {details && (
        <PlaceDetailsCard
          details={details}
          onAddToItinerary={handleAddToTrip}
        />
      )}
    </>
  );
}
```

### Day View with Optimization

```typescript
function DayView({ day, tripId, tripDate }) {
  const { matrix, isLoading } = useDistanceMatrix(day, tripId, tripDate);
  const [activities, setActivities] = useState(day.activities);

  const handleApplyOptimization = (optimized: Activity[]) => {
    setActivities(optimized);
    // Save to database
  };

  return (
    <div>
      <RouteOptimizationPanel
        activities={activities}
        travelMode="driving"
        onApplyOptimization={handleApplyOptimization}
      />

      {/* Activity list with travel times */}
      {activities.map((activity, i) => {
        const next = activities[i + 1];
        const leg = next ? matrix?.legs.find(
          l => l.startActivityId === activity.id && l.endActivityId === next.id
        ) : null;

        return (
          <div key={activity.id}>
            <ActivityCard activity={activity} />
            {leg && (
              <TravelInfo
                distance={leg.driving.distance}
                duration={leg.driving.duration}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## Caching Strategy

### Cache Duration

| Data Type | TTL | Store |
|-----------|-----|-------|
| Place Details | 24h | `mapsCache` |
| Nearby Search | 1h | `mapsCache` |
| Directions (no traffic) | 24h | `mapsCache` |
| Directions (with traffic) | 1h | `mapsCache` |
| Distance Matrix | Session | `dayTravelMatrices` |

### Cache Keys

Generated in `src/utils/geo.ts`:

```typescript
// Directions: "DIR_{lat}_{lng}_{lat}_{lng}_{mode}_{time}"
generateDirectionsCacheKey(origin, destination, mode, departureTime);

// Place Details: "PD_{placeId}"
generatePlaceDetailsCacheKey(placeId);

// Nearby: "NEARBY_{lat}_{lng}_{type}_{radius}_{openNow}"
generateNearbyCacheKey(location, type, radius, openNow);
```

Coordinates are rounded to 5 decimal places (~11m precision) for consistent cache hits.

### Manual Cache Management

```typescript
import { mapsCacheRepository } from '@/services/db/mapsCacheRepository';

// Clear expired entries
const deletedCount = await mapsCacheRepository.clearExpired();

// Get cache stats
const stats = await mapsCacheRepository.getStats();
console.log(`${stats.count} entries, ${stats.totalSize} bytes`);

// Delete specific entry
await mapsCacheRepository.delete(cacheKey);
```

---

## Cost Optimization

### 1. Session Tokens (Places Autocomplete)

Session tokens group autocomplete + details requests into a single SKU charge:

```typescript
// Managed automatically by placesService
// Token created on first autocomplete
// Token cleared after getDetails call
// Auto-expires after 3 minutes
```

**Savings**: Up to 67% reduction in Places API costs

### 2. Caching

All API responses are cached to minimize redundant requests:
- Place details cached for 24h
- Routes cached based on traffic data needs
- Distance matrices cached per day

### 3. Batch Requests

Distance Matrix API queries multiple modes in parallel:

```typescript
// Single Distance Matrix call gets walk/transit/drive
const results = await Promise.all([
  querySingleMode(origin, dest, 'walking'),
  querySingleMode(origin, dest, 'transit'),
  querySingleMode(origin, dest, 'driving')
]);
```

### 4. Field Filtering

Only request necessary fields:

```typescript
const PLACE_FIELDS = [
  'place_id', 'name', 'formatted_address', 'geometry',
  'rating', 'user_ratings_total', 'price_level',
  'formatted_phone_number', 'website', 'opening_hours',
  'types', 'business_status', 'icon'
];
```

**Savings**: Avoid expensive Advanced or Preferred fields

---

## TypeScript Types

All types are defined in `src/types/maps.ts`:

```typescript
import type {
  GeoCoordinates,
  TravelMode,
  PlacePrediction,
  PlaceDetails,
  NearbyPlace,
  DirectionsRequest,
  DirectionsResult,
  DayTravelMatrix,
  TravelLegData
} from '@/types/maps';
```

---

## Troubleshooting

### Maps not loading

1. Check API key in `.env`
2. Verify APIs are enabled in Google Cloud Console
3. Check browser console for auth errors

### Geolocation not working

1. Ensure HTTPS (required for geolocation)
2. Check browser permissions
3. Use `liveTrackingService.requestPermission()`

### Cache issues

```typescript
// Clear all cache
await mapsCacheRepository.clearExpired();

// Reset database
// Delete IndexedDB database "trip_pilot_db" in DevTools
```

### Performance issues

1. Enable marker clustering for 50+ markers
2. Reduce map style complexity (use 'minimal')
3. Limit nearby search radius to <5km
4. Use cache effectively (check TTL)

---

## Support

For issues or questions:
1. Check this documentation
2. Review TDD: `docs/TDD_GOOGLE_MAPS_FEATURES.md`
3. Check implementation files for inline comments
4. Consult Google Maps Platform documentation

---

**Version**: 1.0.0
**Last Updated**: 2025-12-30
**Implementation**: Completed all 32 steps across 7 phases
