import { Trip, DayItinerary } from './index';

/**
 * Activity highlight for day summary
 */
export interface ActivityHighlight {
  /** Activity title/description */
  title: string;
  /** Activity type */
  type: string;
  /** Activity time if available */
  time?: string;
}

/**
 * Represents a summary of a single day within a trip
 */
export interface DaySummary {
  /** Day number (1-indexed) */
  dayNumber: number;

  /** Date in ISO format (YYYY-MM-DD) */
  date: string;

  /** Day ID for navigation */
  dayId: string;

  /** Primary city/location for this day */
  primaryCity: string;

  /** Total activities for this day */
  activityCount: number;

  /** All unique location names visited this day */
  locations: string[];

  /** Top activity highlights (up to 3) */
  highlights: ActivityHighlight[];

  /** Whether this is a travel day (has transport activities) */
  isTravelDay: boolean;
}

/**
 * Represents aggregated data for a country with day-by-day breakdown
 */
export interface CountryAggregate {
  /** Full country name */
  name: string;

  /** ISO 3166-1 alpha-2 country code */
  countryCode: string;

  /** Flag emoji for display (e.g., "🇮🇪") */
  flagEmoji: string;

  /** Total days spent in this country */
  totalDays: number;

  /** Day-by-day summaries for this country */
  days: DaySummary[];

  /** Entry date to this country */
  entryDate: string;

  /** Exit date from this country */
  exitDate: string;
}

/**
 * Complete aggregation result for the trip
 */
export interface TripCountryAggregation {
  /** Countries in order of first visit */
  countries: CountryAggregate[];

  /** Total unique countries visited */
  countryCount: number;

  /** Total unique cities visited */
  cityCount: number;

  /** Trip duration in days */
  totalDays: number;
}

/**
 * Props for the CountryOverview component
 */
export interface CountryOverviewProps {
  /** Full trip data */
  trip: Trip;

  /** All days in the itinerary */
  days: DayItinerary[];

  /** Callback when user clicks a day to drill down */
  onDaySelect: (dayId: string) => void;

  /** Callback when user hovers over a day (for map highlight) */
  onDayHover: (dayId: string | null) => void;

  /** Callback when user clicks a country card */
  onCountrySelect: (countryCode: string) => void;
}
