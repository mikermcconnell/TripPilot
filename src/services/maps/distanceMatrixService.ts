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
import { MAPS_CONFIG } from '@/config/mapsConfig';

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
    const activities = day.activities.filter((a) => {
      const coords = a.location.coordinates;
      return (
        coords &&
        !isNaN(coords.lat) &&
        !isNaN(coords.lng) &&
        Math.abs(coords.lat) <= 90 &&
        Math.abs(coords.lng) <= 180
      );
    });

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
    const departureTime = new Date(
      `${tripDate}T${String(MAPS_CONFIG.DISTANCE_MATRIX.DEFAULT_DEPARTURE_HOUR).padStart(2, '0')}:00:00`
    );

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
