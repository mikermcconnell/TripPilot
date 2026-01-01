import { Itinerary, GeoCoordinates } from './itinerary';

/**
 * Branded type for TripId to prevent mixing with regular strings
 */
export type TripId = string & { readonly __brand: 'TripId' };

/**
 * Branded type for ActivityId
 */
export type ActivityId = string & { readonly __brand: 'ActivityId' };

/**
 * Branded type for ExpenseId
 */
export type ExpenseId = string & { readonly __brand: 'ExpenseId' };

/**
 * Branded type for PhotoId
 */
export type PhotoId = string & { readonly __brand: 'PhotoId' };

/**
 * Trip status for lifecycle management
 */
export type TripStatus = 'planning' | 'upcoming' | 'active' | 'completed' | 'archived';

/**
 * Extended Trip model (replaces single Itinerary)
 */
export interface Trip {
  id: TripId;
  title: string;
  description?: string;
  coverImageUrl?: string;

  // Dates
  startDate: string;        // ISO 8601: YYYY-MM-DD
  endDate: string;          // ISO 8601: YYYY-MM-DD
  timezone: string;         // IANA timezone: 'America/New_York'

  // Location
  destination: {
    name: string;
    country: string;
    countryCode: string;    // ISO 3166-1 alpha-2
    coordinates: GeoCoordinates;
  };

  // Content
  itinerary: Itinerary;

  // Metadata
  status: TripStatus;
  createdAt: string;        // ISO 8601 datetime
  updatedAt: string;        // ISO 8601 datetime
  lastAccessedAt: string;   // For sorting by recency

  // Feature flags
  budgetEnabled: boolean;
  packingEnabled: boolean;
  photosEnabled: boolean;

  // Settings
  defaultCurrency: string;  // ISO 4217: 'USD', 'EUR'

  // Local/Guest mode flag - true if trip is only stored locally (not synced to cloud)
  isLocalOnly?: boolean;
}

/**
 * Trip summary for list views (denormalized for performance)
 */
export interface TripSummary {
  id: TripId;
  title: string;
  destination: string;
  coverImageUrl?: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  daysCount: number;
  activitiesCount: number;
}

/**
 * Create trip input
 */
export interface CreateTripInput {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  timezone?: string;
  defaultCurrency?: string;
  destinationCoordinates?: GeoCoordinates;
}
