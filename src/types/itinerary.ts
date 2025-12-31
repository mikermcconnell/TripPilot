// Coordinates
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

// Location with optional coordinates
export interface LocationData {
  name: string;
  coordinates?: GeoCoordinates;
  address?: string;
  placeId?: string;           // Google Places ID for fetching details
}

// Activity types - union type for strict typing
export type ActivityType = 'food' | 'lodging' | 'activity' | 'travel';

/** Money with currency */
export interface MoneyAmount {
  amount: number;
  currency: string;           // ISO 4217
}

/** File attachment reference */
export interface AttachmentRef {
  id: string;
  filename: string;
  mimeType: string;
  size: number;               // bytes
  thumbnailUrl?: string;      // Base64 data URL for images
  createdAt: string;
}

/** Booking confirmation details */
export interface BookingInfo {
  confirmationNumber?: string;
  provider?: string;          // 'Booking.com', 'Airbnb', etc.
  bookingUrl?: string;
  checkIn?: string;           // Time: 'HH:MM'
  checkOut?: string;
  guestCount?: number;
  roomType?: string;

  // For flights
  flightNumber?: string;
  airline?: string;
  terminal?: string;
  gate?: string;
  seatNumber?: string;
}

/** Extended activity information */
export interface ActivityDetails {
  // Booking Information
  booking?: BookingInfo;

  // Contact
  phone?: string;
  website?: string;
  email?: string;

  // Notes
  notes?: string;

  // Attachments (stored as references, blobs in IndexedDB)
  attachments?: AttachmentRef[];

  // Cost tracking
  estimatedCost?: MoneyAmount;
  actualCost?: MoneyAmount;
  isPaid?: boolean;

  // Tags for filtering
  tags?: string[];

  // Travel preferences - preferred mode to reach this activity
  preferredTravelMode?: 'walking' | 'driving' | 'transit' | 'flight';
}

// Single activity within a day
export interface Activity {
  id: string;
  time?: string;           // Format: "HH:MM AM/PM"
  endTime?: string;        // NEW: Duration support
  description: string;
  location: LocationData;
  type: ActivityType;

  // NEW: Feature 4 - Activity Details
  details?: ActivityDetails;
}

// Travel mode between days
export type InterDayTravelMode = 'car' | 'train' | 'flight' | 'bus' | 'ferry' | 'walking' | 'other';

// Travel information from previous day to this day
export interface InterDayTravel {
  mode: InterDayTravelMode;
  details?: string;        // e.g., "Flight EI123" or "Eurostar"
  departureTime?: string;  // HH:MM
  arrivalTime?: string;    // HH:MM
  duration?: number;       // minutes
}

// Single day's itinerary
export interface DayItinerary {
  id: string;
  dayNumber: number;       // 1-indexed
  date: string;            // ISO format: YYYY-MM-DD
  activities: Activity[];

  // Primary location for this day (city/region level)
  // Used for high-level trip planning before adding specific activities
  primaryLocation?: LocationData;

  // How user travels FROM the previous day TO this day
  // Only applicable for days after day 1
  travelFromPrevious?: InterDayTravel;
}

// Complete trip itinerary
export interface Itinerary {
  title: string;
  days: DayItinerary[];
}

// View modes for the application
export type ViewMode = 'overview' | 'day' | 'travel';

// Travel leg for route rendering
export interface TravelLeg {
  startId: string;
  endId: string;
}

// ============================================
// PLANNER SYNC PAYLOADS
// ============================================

/**
 * Payload for activity reorder sync.
 */
export interface ReorderActivitiesPayload {
  tripId: string;
  dayId: string;
  activityIds: string[];  // New order
}

/**
 * Payload for cross-day activity move.
 */
export interface MoveActivityPayload {
  tripId: string;
  activityId: string;
  sourceDayId: string;
  destinationDayId: string;
  destinationIndex: number;
}

/**
 * Payload for day reorder sync.
 */
export interface ReorderDaysPayload {
  tripId: string;
  dayIds: string[];  // New order (IDs only, dayNumbers will be recalculated)
}

/**
 * Payload for day addition.
 */
export interface AddDayPayload {
  tripId: string;
  day: DayItinerary;
  position: number;  // Insert index
}

/**
 * Payload for day removal.
 */
export interface RemoveDayPayload {
  tripId: string;
  dayId: string;
  deleteActivities: boolean;  // true = delete, false = move to adjacent day
}
