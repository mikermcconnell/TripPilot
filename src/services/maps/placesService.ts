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

import { MAPS_CONFIG } from '@/config/mapsConfig';

/**
 * Session token manager for Places Autocomplete billing optimization
 * Prevents token leaks by enforcing maximum session duration
 */
class SessionTokenManager {
  private token: any = null;
  private sessionStart: number | null = null;

  getToken(): any {
    const now = Date.now();

    // Force refresh after maximum session duration
    if (this.sessionStart && now - this.sessionStart > MAPS_CONFIG.AUTOCOMPLETE.SESSION_TIMEOUT_MS) {
      this.clearToken();
    }

    if (!this.token) {
      this.token = new google.maps.places.AutocompleteSessionToken();
      this.sessionStart = now;
    }

    return this.token;
  }

  clearToken(): void {
    this.token = null;
    this.sessionStart = null;
  }
}

const sessionTokenManager = new SessionTokenManager();

export const placesService = {
  /**
   * Geocode a location name to coordinates
   * Uses Google Maps Geocoding API
   */
  async geocode(
    locationName: string
  ): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
    if (!locationName || locationName.trim().length < 2) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        const geocoder = new google.maps.Geocoder();

        geocoder.geocode(
          { address: locationName.trim() },
          (results: any[], status: string) => {
            if (status === 'OK' && results && results.length > 0) {
              const result = results[0];
              resolve({
                lat: result.geometry.location.lat(),
                lng: result.geometry.location.lng(),
                formattedAddress: result.formatted_address,
              });
            } else {
              console.warn(`Geocoding failed for "${locationName}": ${status}`);
              resolve(null);
            }
          }
        );
      } catch (error) {
        console.error('Geocoding error:', error);
        resolve(null);
      }
    });
  },

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
    // Sanitize input
    const sanitizedInput = input.trim().substring(0, MAPS_CONFIG.AUTOCOMPLETE.MAX_INPUT_LENGTH);

    if (sanitizedInput.length < MAPS_CONFIG.AUTOCOMPLETE.MIN_INPUT_LENGTH) return [];

    return new Promise((resolve, reject) => {
      const service = new google.maps.places.AutocompleteService();
      const sessionToken = sessionTokenManager.getToken();

      const request: any = {
        input: sanitizedInput,
        sessionToken,
        types: options?.types || ['establishment', 'geocode'],
      };

      // Add location bias if provided (bias results to trip area)
      if (options?.locationBias) {
        request.location = new google.maps.LatLng(
          options.locationBias.lat,
          options.locationBias.lng
        );
        request.radius = options.radius || MAPS_CONFIG.AUTOCOMPLETE.DEFAULT_RADIUS;
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
        location: new google.maps.LatLng(
          request.location.lat,
          request.location.lng
        ),
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
