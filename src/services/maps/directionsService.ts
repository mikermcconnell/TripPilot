import type {
  DirectionsRequest,
  DirectionsResult,
  CachedDirections,
  TravelMode,
  GeoCoordinates,
} from '@/types/maps';
import { mapsCacheRepository } from '@/services/db/mapsCacheRepository';
import { generateDirectionsCacheKey } from '@/utils/geo';

declare const google: any;

/**
 * Directions Service with caching and departure time support
 */
export const directionsService = {
  /**
   * Get directions between two points with optional caching
   * @param request - Direction request parameters
   * @param useCache - Whether to use/store in IndexedDB cache (default: true)
   * @returns Processed directions result
   */
  async getDirections(
    request: DirectionsRequest,
    useCache: boolean = true
  ): Promise<DirectionsResult> {
    // Generate cache key
    const cacheKey = generateDirectionsCacheKey(
      request.origin,
      request.destination,
      request.travelMode,
      request.departureTime
    );

    // Check cache first
    if (useCache) {
      const cached = await mapsCacheRepository.get<CachedDirections>(cacheKey);
      if (cached) {
        return cached.result;
      }
    }

    // Fetch from API
    const result = await this.fetchDirections(request);

    // Cache result
    if (useCache) {
      const hasTrafficData = !!request.departureTime;
      const cachedDirections: CachedDirections = {
        cacheKey,
        request,
        result,
        fetchedAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + (hasTrafficData ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
        ).toISOString(),
      };

      await mapsCacheRepository.set(
        cacheKey,
        cachedDirections,
        'directions',
        hasTrafficData
      );
    }

    return result;
  },

  /**
   * Fetch directions from Google Directions API
   */
  async fetchDirections(request: DirectionsRequest): Promise<DirectionsResult> {
    return new Promise((resolve, reject) => {
      const service = new google.maps.DirectionsService();

      const apiRequest: any = {
        origin: { lat: request.origin.lat, lng: request.origin.lng },
        destination: { lat: request.destination.lat, lng: request.destination.lng },
        travelMode: this.mapTravelMode(request.travelMode),
        avoidHighways: request.avoidHighways || false,
        avoidTolls: request.avoidTolls || false,
        avoidFerries: request.avoidFerries || false,
      };

      // Add departure time options
      if (request.departureTime) {
        if (request.travelMode === 'driving') {
          apiRequest.drivingOptions = {
            departureTime: request.departureTime,
            trafficModel: google.maps.TrafficModel.BEST_GUESS,
          };
        } else if (request.travelMode === 'transit') {
          apiRequest.transitOptions = {
            departureTime: request.departureTime,
            routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS,
          };
        }
      }

      service.route(apiRequest, (response: any, status: string) => {
        if (status !== 'OK') {
          resolve({
            routes: [],
            status: status as any,
          });
          return;
        }

        const routes = response.routes.map((route: any) => ({
          summary: route.summary || '',
          legs: route.legs.map((leg: any) => ({
            startAddress: leg.start_address,
            endAddress: leg.end_address,
            startLocation: {
              lat: leg.start_location.lat(),
              lng: leg.start_location.lng(),
            },
            endLocation: {
              lat: leg.end_location.lat(),
              lng: leg.end_location.lng(),
            },
            distance: leg.distance.value,
            duration: leg.duration.value,
            durationInTraffic: leg.duration_in_traffic?.value,
            steps: leg.steps.map((step: any) => ({
              instruction: step.instructions,
              distance: step.distance.value,
              duration: step.duration.value,
              travelMode: this.reverseTravelMode(step.travel_mode),
              polyline: step.polyline.points || '',
              transitDetails: step.transit ? this.mapTransitDetails(step.transit) : undefined,
            })),
          })),
          totalDistance: route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0),
          totalDuration: route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0),
          totalDurationInTraffic: route.legs.reduce(
            (sum: number, leg: any) => sum + (leg.duration_in_traffic?.value || leg.duration.value),
            0
          ),
          polyline: route.overview_polyline.points || '',
          bounds: {
            northeast: {
              lat: route.bounds.getNorthEast().lat(),
              lng: route.bounds.getNorthEast().lng(),
            },
            southwest: {
              lat: route.bounds.getSouthWest().lat(),
              lng: route.bounds.getSouthWest().lng(),
            },
          },
        }));

        resolve({
          routes,
          status: 'OK',
        });
      });
    });
  },

  /**
   * Invalidate cached directions for a specific route
   */
  async invalidateCache(
    origin: GeoCoordinates,
    destination: GeoCoordinates,
    travelMode: TravelMode
  ): Promise<void> {
    const cacheKey = generateDirectionsCacheKey(origin, destination, travelMode);
    await mapsCacheRepository.delete(cacheKey);
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

  /**
   * Reverse map Google's TravelMode to ours
   */
  reverseTravelMode(googleMode: string): TravelMode {
    const mapping: Record<string, TravelMode> = {
      WALKING: 'walking',
      TRANSIT: 'transit',
      DRIVING: 'driving',
      BICYCLING: 'bicycling',
    };
    return mapping[googleMode] || 'driving';
  },

  /**
   * Map transit details from Google response
   */
  mapTransitDetails(transit: any): any {
    return {
      line: {
        name: transit.line.name,
        shortName: transit.line.short_name,
        vehicle: {
          type: transit.line.vehicle.type,
          icon: transit.line.vehicle.icon,
        },
        color: transit.line.color,
      },
      departureStop: {
        name: transit.departure_stop.name,
        location: {
          lat: transit.departure_stop.location.lat(),
          lng: transit.departure_stop.location.lng(),
        },
      },
      arrivalStop: {
        name: transit.arrival_stop.name,
        location: {
          lat: transit.arrival_stop.location.lat(),
          lng: transit.arrival_stop.location.lng(),
        },
      },
      departureTime: transit.departure_time.value.toISOString(),
      arrivalTime: transit.arrival_time.value.toISOString(),
      numStops: transit.num_stops,
    };
  },
};
