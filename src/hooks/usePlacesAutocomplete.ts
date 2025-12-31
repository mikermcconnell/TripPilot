import { useState, useEffect, useCallback, useRef } from 'react';
import type { PlacePrediction, GeoCoordinates } from '@/types/maps';
import { placesService } from '@/services/maps/placesService';
import { MAPS_CONFIG } from '@/config/mapsConfig';

interface UsePlacesAutocompleteOptions {
  debounceMs?: number;
  locationBias?: GeoCoordinates;
  radius?: number;
  types?: string[];
  minLength?: number;
}

interface UsePlacesAutocompleteResult {
  predictions: PlacePrediction[];
  isLoading: boolean;
  error: string | null;
  search: (input: string) => void;
  clear: () => void;
  selectPrediction: (placeId: string) => PlacePrediction | null;
}

/**
 * Hook for Places Autocomplete with debouncing and session token management
 * Automatically debounces search requests and manages API session tokens
 */
export function usePlacesAutocomplete(
  options: UsePlacesAutocompleteOptions = {}
): UsePlacesAutocompleteResult {
  const {
    debounceMs = MAPS_CONFIG.AUTOCOMPLETE.DEBOUNCE_MS,
    locationBias,
    radius,
    types,
    minLength = MAPS_CONFIG.AUTOCOMPLETE.MIN_INPUT_LENGTH,
  } = options;

  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Debounced search function
  const search = useCallback(
    (input: string) => {
      setInputValue(input);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Reset if input too short
      if (input.length < minLength) {
        setPredictions([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      // Set loading state immediately
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
          const results = await placesService.getAutocomplete(input, {
            locationBias,
            radius,
            types,
          });
          setPredictions(results);
          setError(null);
        } catch (err) {
          // Only set error if not aborted
          if (err instanceof Error && err.name !== 'AbortError') {
            console.error('Autocomplete error:', err);
            setError(err.message);
            setPredictions([]);
          }
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [debounceMs, locationBias, radius, types, minLength]
  );

  // Clear predictions and state
  const clear = useCallback(() => {
    setInputValue('');
    setPredictions([]);
    setIsLoading(false);
    setError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Find and return selected prediction
  const selectPrediction = useCallback(
    (placeId: string): PlacePrediction | null => {
      return predictions.find((p) => p.placeId === placeId) || null;
    },
    [predictions]
  );

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

  return {
    predictions,
    isLoading,
    error,
    search,
    clear,
    selectPrediction,
  };
}
