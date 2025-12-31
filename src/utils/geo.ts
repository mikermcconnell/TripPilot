// Haversine formula to calculate distance (in km) between two coordinates
const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

export function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

// Get recommended travel mode based on distance
export function getRecommendedMode(
  distanceKm: number
): 'walking' | 'transit' | 'driving' {
  if (distanceKm < 2.0) return 'walking';
  if (distanceKm < 20) return 'transit';
  return 'driving';
}

// Estimate travel time based on mode and distance
export function estimateTime(
  distanceKm: number,
  mode: 'walking' | 'transit' | 'driving'
): string {
  // Speed assumptions in km/h
  let speed = 4.5; // Walking default

  if (mode === 'walking') {
    speed = 4.5;
  } else if (mode === 'driving') {
    // Highway speeds for longer distances, city speeds for short hops
    speed = distanceKm > 20 ? 100 : 30;
  } else if (mode === 'transit') {
    // Inter-city trains are fast, local bus/metro is slower
    speed = distanceKm > 30 ? 80 : 25;
  }

  const hours = distanceKm / speed;
  const totalMinutes = Math.round(hours * 60);

  if (totalMinutes < 60) return `${totalMinutes} min`;

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m > 0 ? `${m}m` : ''}`;
}

// ============================================
// CACHE KEY GENERATION
// ============================================

import type { GeoCoordinates, TravelMode } from '@/types/maps';

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

// ============================================
// DEPARTURE TIME CALCULATION
// ============================================

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
