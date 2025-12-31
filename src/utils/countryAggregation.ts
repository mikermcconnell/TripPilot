import { DayItinerary, Trip, LocationData, GeoCoordinates, Activity } from '@/types';
import {
  DaySummary,
  CountryAggregate,
  TripCountryAggregation,
  ActivityHighlight
} from '@/types/country';
import { format } from 'date-fns';

/**
 * Country code to flag emoji mapping
 * Uses regional indicator symbols: 🇦 = U+1F1E6, etc.
 */
export function countryCodeToFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function haversineDistance(coord1: GeoCoordinates, coord2: GeoCoordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLon = toRadians(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) *
      Math.cos(toRadians(coord2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Extract city name from location name using common patterns
 * e.g., "Dublin Airport" → "Dublin", "Cork Castle" → "Cork"
 */
function extractCityFromName(locationName: string): string | null {
  // Common patterns: "[City] Airport", "[City] Castle", etc.
  // NOTE: Parks are excluded since they're typically named (Phoenix Park, Central Park)
  // not city-formatted, and should rely on clustering instead
  const patterns = [
    /^(\w+(?:\s+\w+)?)\s+Airport$/i,      // "Dublin Airport", "New York Airport"
    /^(\w+(?:\s+\w+)?)\s+Station$/i,      // "Dublin Station"
    /^(\w+(?:\s+\w+)?)\s+Castle$/i,       // "Dublin Castle"
    /^(\w+(?:\s+\w+)?)\s+Zoo$/i,          // "Dublin Zoo"
    /^(\w+(?:\s+\w+)?)\s+City$/i,         // "Cork City"
    /^(\w+(?:\s+\w+)?)\s+Centre$/i,       // "Dublin Centre"
    /^(\w+(?:\s+\w+)?)\s+Center$/i,       // "Dublin Center"
    /^(\w+(?:\s+\w+)?)\s+Cathedral$/i,    // "Dublin Cathedral"
    /^(\w+(?:\s+\w+)?)\s+Museum$/i,       // "Dublin Museum"
  ];

  for (const pattern of patterns) {
    const match = locationName.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract and normalize city name from activity location
 */
export function extractCityFromLocation(location: LocationData): string {
  // Priority 1: Try to extract from location name patterns
  const cityFromName = extractCityFromName(location.name);
  if (cityFromName) {
    return cityFromName;
  }

  let cityName = '';

  // Priority 2: Parse from address
  if (location.address) {
    const parts = location.address.split(',').map(p => p.trim());

    // Try to find the city component (usually second-to-last or middle part)
    if (parts.length >= 2) {
      const cityCandidate = parts.length >= 3 ? parts[parts.length - 2] : parts[1];
      cityName = cityCandidate || parts[1] || location.name;
    } else if (parts.length === 1) {
      cityName = parts[0];
    }
  }

  // Priority 3: Use location name if no address
  if (!cityName && location.name) {
    cityName = location.name;
  }

  // Priority 4: Default
  if (!cityName) {
    return 'Unknown Location';
  }

  // Normalize: Remove postal codes, district numbers, and zip codes
  return cityName
    .replace(/\s+\d+$/, '')              // Remove trailing numbers: "Dublin 2" → "Dublin"
    .replace(/\s+D\d+$/i, '')            // Remove Dublin postal codes: "Dublin D2" → "Dublin"
    .replace(/,?\s*\d{4,5}$/, '')        // Remove zip codes: "Dublin, 12345" → "Dublin"
    .replace(/\s+[A-Z]\d+\s*\d*[A-Z]*$/i, '') // Remove UK postcodes: "London SW1A 1AA" → "London"
    .trim();
}

/**
 * Helper to infer country code from name
 */
function inferCountryCode(countryName: string): string {
  const COUNTRY_MAP: Record<string, string> = {
    'ireland': 'IE',
    'united states': 'US',
    'usa': 'US',
    'united kingdom': 'GB',
    'uk': 'GB',
    'france': 'FR',
    'germany': 'DE',
    'spain': 'ES',
    'italy': 'IT',
    'japan': 'JP',
    'canada': 'CA',
    'australia': 'AU',
    'new zealand': 'NZ',
    'netherlands': 'NL',
    'belgium': 'BE',
    'switzerland': 'CH',
    'austria': 'AT',
    'portugal': 'PT',
    'greece': 'GR',
    'poland': 'PL',
    'czech republic': 'CZ',
    'denmark': 'DK',
    'sweden': 'SE',
    'norway': 'NO',
    'finland': 'FI',
  };
  return COUNTRY_MAP[countryName.toLowerCase()] || 'XX';
}

/**
 * Determine country from trip destination or activity locations
 */
export function extractCountryInfo(
  trip: Trip,
  location?: LocationData
): { name: string; code: string } {
  // 1. Use trip destination if available
  if (trip.destination?.country) {
    return {
      name: trip.destination.country,
      code: trip.destination.countryCode || inferCountryCode(trip.destination.country)
    };
  }

  // 2. Try to parse from location address (last component often country)
  if (location?.address) {
    const parts = location.address.split(',');
    const lastPart = parts[parts.length - 1]?.trim();
    if (lastPart && lastPart.length > 2) {
      return { name: lastPart, code: inferCountryCode(lastPart) };
    }
  }

  // 3. Default fallback
  return { name: 'Unknown', code: 'XX' };
}

/**
 * Activity with extracted city info for clustering
 */
interface ActivityWithCity {
  activity: Activity;
  extractedCity: string;
  coordinates: GeoCoordinates | null;
}

/**
 * Cluster of activities grouped by geographic proximity
 */
interface ActivityCluster {
  cityName: string;
  activities: ActivityWithCity[];
  centroid: GeoCoordinates | null;
}

/**
 * Cluster activities by geographic proximity (~30km threshold)
 * and assign a common city name to each cluster
 */
function clusterActivitiesByProximity(
  activitiesWithCities: ActivityWithCity[]
): ActivityCluster[] {
  const PROXIMITY_THRESHOLD_KM = 30;
  const clusters: ActivityCluster[] = [];

  for (const activityWithCity of activitiesWithCities) {
    let assignedToCluster = false;

    // Try to find an existing cluster within proximity
    for (const cluster of clusters) {
      if (!activityWithCity.coordinates || !cluster.centroid) {
        // If no coordinates, use text matching
        if (activityWithCity.extractedCity === cluster.cityName) {
          cluster.activities.push(activityWithCity);
          assignedToCluster = true;
          break;
        }
        continue;
      }

      const distance = haversineDistance(activityWithCity.coordinates, cluster.centroid);

      if (distance <= PROXIMITY_THRESHOLD_KM) {
        cluster.activities.push(activityWithCity);
        // Recalculate centroid
        cluster.centroid = calculateCentroid(cluster.activities);
        assignedToCluster = true;
        break;
      }
    }

    // Create new cluster if not assigned
    if (!assignedToCluster) {
      clusters.push({
        cityName: activityWithCity.extractedCity,
        activities: [activityWithCity],
        centroid: activityWithCity.coordinates
      });
    }
  }

  // Assign best city name to each cluster
  for (const cluster of clusters) {
    cluster.cityName = determineBestCityName(cluster.activities);
  }

  return clusters;
}

/**
 * Calculate centroid (center point) of a cluster
 */
function calculateCentroid(activities: ActivityWithCity[]): GeoCoordinates | null {
  const coords = activities
    .map(a => a.coordinates)
    .filter((c): c is GeoCoordinates => c !== null);

  if (coords.length === 0) return null;

  const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
  const avgLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;

  return { lat: avgLat, lng: avgLng };
}

/**
 * Determine the best city name for a cluster
 * Priority: most common extracted city name
 */
function determineBestCityName(activities: ActivityWithCity[]): string {
  const cityCounts = new Map<string, number>();

  for (const activity of activities) {
    const city = activity.extractedCity;
    cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
  }

  let bestCity = 'Unknown';
  let maxCount = 0;

  for (const [city, count] of cityCounts) {
    if (count > maxCount) {
      maxCount = count;
      bestCity = city;
    }
  }

  return bestCity;
}

/**
 * Main aggregation function - DAY-BASED WITH GEOGRAPHIC CLUSTERING
 *
 * ALGORITHM:
 * 1. For each day, extract all activities with their locations
 * 2. Cluster activities by geographic proximity (~30km)
 * 3. Assign a unified city name to each cluster
 * 4. Determine primary city for the day
 * 5. Group days by country
 */
export function aggregateTripByCountry(
  trip: Trip,
  days: DayItinerary[]
): TripCountryAggregation {
  const countryMap = new Map<string, {
    name: string;
    code: string;
    days: DaySummary[];
  }>();

  const allCities = new Set<string>();

  // Process each day
  for (const day of days) {
    // Extract city info for each activity
    const activitiesWithCities: ActivityWithCity[] = day.activities
      .filter(a => a.location)
      .map(activity => ({
        activity,
        extractedCity: extractCityFromLocation(activity.location),
        coordinates: activity.location.coordinates || null
      }));

    if (activitiesWithCities.length === 0) {
      // Skip days with no valid activities
      continue;
    }

    // Cluster activities by proximity
    const clusters = clusterActivitiesByProximity(activitiesWithCities);

    // Get all unique city names from clusters
    const cityNames = clusters.map(c => c.cityName);
    cityNames.forEach(city => allCities.add(city));

    // Determine primary city (largest cluster)
    let primaryCity = 'Unknown';
    let largestClusterSize = 0;

    for (const cluster of clusters) {
      if (cluster.activities.length > largestClusterSize) {
        largestClusterSize = cluster.activities.length;
        primaryCity = cluster.cityName;
      }
    }

    // Determine country
    const countryInfo = extractCountryInfo(
      trip,
      day.activities.find(a => a.location)?.location
    );

    // FALLBACK: If primary city matches country name, use trip destination instead
    if (primaryCity === countryInfo.name && trip.destination?.name) {
      primaryCity = trip.destination.name;
      allCities.delete(countryInfo.name);
      allCities.add(primaryCity);
    }

    // Create or get country entry
    if (!countryMap.has(countryInfo.code)) {
      countryMap.set(countryInfo.code, {
        name: countryInfo.name,
        code: countryInfo.code,
        days: []
      });
    }

    const country = countryMap.get(countryInfo.code)!;

    // Extract activity highlights (top 3 non-travel activities)
    const highlights: ActivityHighlight[] = day.activities
      .filter(a => a.type !== 'travel')
      .slice(0, 3)
      .map(a => ({
        title: a.description,
        type: a.type,
        time: a.time
      }));

    // Detect if this is a travel day
    const travelKeywords = ['airport', 'flight', 'train', 'bus', 'drive', 'transfer', 'check-in', 'check-out'];
    const isTravelDay = day.activities.some(a =>
      a.type === 'travel' ||
      travelKeywords.some(k => a.description.toLowerCase().includes(k))
    );

    // Add day summary
    country.days.push({
      dayNumber: day.dayNumber,
      date: day.date,
      dayId: day.id,
      primaryCity,
      activityCount: day.activities.length,
      locations: [...new Set(cityNames)],
      highlights,
      isTravelDay
    });
  }

  // Convert to CountryAggregate array
  const countries: CountryAggregate[] = Array.from(countryMap.values()).map(country => {
    // Sort days chronologically
    const sortedDays = country.days.sort((a, b) => a.dayNumber - b.dayNumber);

    return {
      name: country.name,
      countryCode: country.code,
      flagEmoji: countryCodeToFlag(country.code),
      totalDays: country.days.length,
      days: sortedDays,
      entryDate: sortedDays[0]?.date || '',
      exitDate: sortedDays[sortedDays.length - 1]?.date || ''
    };
  });

  // Sort countries by entry date
  const sortedCountries = countries.sort((a, b) =>
    a.entryDate.localeCompare(b.entryDate)
  );

  return {
    countries: sortedCountries,
    countryCount: countries.length,
    cityCount: allCities.size,
    totalDays: days.length
  };
}

/**
 * Format date for display
 * e.g., "2024-09-03" → "Sep 3, 2024"
 */
export function formatDisplayDate(isoDate: string): string {
  try {
    return format(new Date(isoDate), 'MMM d, yyyy');
  } catch {
    return isoDate;
  }
}

/**
 * Format date for short display
 * e.g., "2024-09-03" → "Sep 3"
 */
export function formatShortDate(isoDate: string): string {
  try {
    return format(new Date(isoDate), 'MMM d');
  } catch {
    return isoDate;
  }
}
