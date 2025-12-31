import { TripId } from './trip';

export type PackingCategory =
  | 'clothing'
  | 'toiletries'
  | 'electronics'
  | 'documents'
  | 'medicine'
  | 'accessories'
  | 'other';

export interface PackingItem {
  id: string;
  tripId: TripId;

  name: string;
  category: PackingCategory;
  quantity: number;

  isPacked: boolean;
  isEssential: boolean;

  // For AI-generated items
  aiSuggested?: boolean;
  suggestionReason?: string;
}

export interface PackingList {
  tripId: TripId;
  items: PackingItem[];

  // Progress tracking
  totalItems: number;
  packedItems: number;

  // Generation metadata
  generatedAt?: string;
  generationPrompt?: string;
}

export interface WeatherForecast {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
}

/**
 * Input for AI packing list generation
 */
export interface PackingGenerationInput {
  tripId: TripId;
  destination: string;
  startDate: string;
  endDate: string;
  activities: string[];       // Activity types from itinerary
  weather?: WeatherForecast[];
  travelerPreferences?: {
    gender?: 'male' | 'female' | 'other';
    includeToiletries: boolean;
    includeMedicine: boolean;
    businessTrip: boolean;
  };
}
