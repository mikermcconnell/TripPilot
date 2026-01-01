---
name: custom-hooks-patterns
description: Create custom React hooks following TripPlanner conventions including state management, cleanup, debouncing, and service integration. Use when creating hooks for data fetching, UI state, or side effects.
---

# Custom Hooks Patterns

This project has 21+ custom hooks following consistent patterns.

## Hook File Structure

```typescript
// src/hooks/useExampleHook.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ExampleData } from '@/types';
import { exampleService } from '@/services/exampleService';

interface UseExampleOptions {
  enabled?: boolean;
  debounceMs?: number;
}

interface UseExampleResult {
  data: ExampleData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useExample(
  options: UseExampleOptions = {}
): UseExampleResult {
  const { enabled = true, debounceMs = 300 } = options;

  // Implementation...
}
```

## Data Fetching Hook

```typescript
// src/hooks/useTripDetails.ts
import { useState, useEffect, useCallback } from 'react';
import type { Trip, TripId } from '@/types';
import { tripFirestoreService } from '@/services/firebase/tripFirestoreService';

interface UseTripDetailsResult {
  trip: Trip | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTripDetails(tripId: TripId | null): UseTripDetailsResult {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrip = useCallback(async () => {
    if (!tripId) {
      setTrip(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await tripFirestoreService.getTrip(tripId);
      setTrip(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load trip';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  return { trip, isLoading, error, refetch: fetchTrip };
}
```

## Debounced Search Hook

```typescript
// src/hooks/usePlacesAutocomplete.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import type { PlacePrediction } from '@/types/maps';
import { placesService } from '@/services/maps/placesService';

interface UsePlacesAutocompleteOptions {
  debounceMs?: number;
  minLength?: number;
}

interface UsePlacesAutocompleteResult {
  predictions: PlacePrediction[];
  isLoading: boolean;
  error: string | null;
  search: (input: string) => void;
  clear: () => void;
}

export function usePlacesAutocomplete(
  options: UsePlacesAutocompleteOptions = {}
): UsePlacesAutocompleteResult {
  const { debounceMs = 300, minLength = 2 } = options;

  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback((input: string) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Skip if too short
    if (input.length < minLength) {
      setPredictions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Debounce the API call
    debounceTimerRef.current = window.setTimeout(async () => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const results = await placesService.getAutocomplete(input);
        setPredictions(results);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
  }, [debounceMs, minLength]);

  const clear = useCallback(() => {
    setPredictions([]);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { predictions, isLoading, error, search, clear };
}
```

## Subscription Hook (Real-time)

```typescript
// src/hooks/useLiveTracking.ts
import { useState, useEffect, useCallback } from 'react';
import type { GeoCoordinates } from '@/types';
import { liveTrackingService } from '@/services/liveTrackingService';

interface UseLiveTrackingResult {
  position: GeoCoordinates | null;
  isTracking: boolean;
  error: string | null;
  startTracking: () => void;
  stopTracking: () => void;
}

export function useLiveTracking(): UseLiveTrackingResult {
  const [position, setPosition] = useState<GeoCoordinates | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTracking = useCallback(() => {
    setIsTracking(true);
    setError(null);

    liveTrackingService.start({
      onPosition: setPosition,
      onError: (err) => setError(err.message),
    });
  }, []);

  const stopTracking = useCallback(() => {
    liveTrackingService.stop();
    setIsTracking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      liveTrackingService.stop();
    };
  }, []);

  return { position, isTracking, error, startTracking, stopTracking };
}
```

## UI State Hook

```typescript
// src/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Usage
const isMobile = useMediaQuery('(max-width: 768px)');
```

## Local Storage Hook

```typescript
// src/hooks/useLocalStorage.ts
import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue];
}
```

## Hook Naming Conventions

| Pattern | Example | Use Case |
|---------|---------|----------|
| `use[Data]` | `useTrips` | Data fetching |
| `use[Feature]` | `usePlacesAutocomplete` | Feature-specific logic |
| `use[Action]` | `useLiveTracking` | Action with state |
| `use[UI]` | `useMediaQuery` | UI state |

## Common Patterns

1. **Options object**: Always use an options object for flexibility
2. **Cleanup in useEffect**: Always return cleanup function for subscriptions/timers
3. **AbortController**: Cancel pending requests on new search or unmount
4. **Refs for timers**: Use `useRef` for timer IDs to avoid stale closures
5. **Memoize callbacks**: Use `useCallback` for functions returned from hooks
6. **Stable references**: Ensure returned functions have stable references
