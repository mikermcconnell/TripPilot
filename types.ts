import { Type } from "@google/genai";

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface LocationData {
  name: string;
  coordinates?: GeoCoordinates;
  address?: string;
}

export type ActivityType = 'food' | 'lodging' | 'activity' | 'travel';

export interface Activity {
  id: string;
  time?: string;
  description: string;
  location: LocationData;
  type: ActivityType;
}

export interface DayItinerary {
  id: string;
  dayNumber: number;
  date: string; // YYYY-MM-DD
  activities: Activity[];
}

export interface Itinerary {
  title: string;
  days: DayItinerary[];
}

export interface GroundingChunk {
  web?: { uri?: string; title?: string };
  maps?: { uri?: string; title?: string };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  pendingAction?: PendingAction;
  groundingChunks?: GroundingChunk[];
}

export interface PendingAction {
  type: 'add_activity' | 'replace_itinerary';
  data: {
    dayNumber?: number;
    activity?: Omit<Activity, 'id'>;
    itinerary?: Itinerary;
  };
  status: 'pending' | 'confirmed' | 'cancelled';
}

// Tool definitions for Gemini
export const ITINERARY_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'propose_activity',
        description: 'Propose adding a new activity, restaurant, or lodging to the itinerary. Use this for single additions to an existing plan.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            dayNumber: {
              type: Type.NUMBER,
              description: 'The day number to add the activity to (e.g., 1, 2, 3).',
            },
            description: {
              type: Type.STRING,
              description: 'A short description of the activity (e.g., "Visit the Louvre").',
            },
            locationName: {
              type: Type.STRING,
              description: 'The name of the location.',
            },
            latitude: {
              type: Type.NUMBER,
              description: 'Estimated latitude of the location.',
            },
            longitude: {
              type: Type.NUMBER,
              description: 'Estimated longitude of the location.',
            },
            activityType: {
              type: Type.STRING,
              enum: ['activity', 'food', 'lodging', 'travel'],
              description: 'The type of activity.',
            },
            time: {
              type: Type.STRING,
              description: 'Suggested time (e.g., "10:00 AM"). Optional.',
            },
          },
          required: ['dayNumber', 'description', 'locationName', 'activityType', 'latitude', 'longitude'],
        },
      },
      {
        name: 'create_itinerary',
        description: 'Generate a FULL comprehensive multi-day itinerary. Use this IMMEDIATELY when the user asks to plan a trip (e.g. "Plan a 10 day trip"). Do not ask follow up questions. Just generate the best guess plan.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Title of the trip (e.g., "30 Days in Japan").',
            },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.NUMBER },
                  activities: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        description: { type: Type.STRING },
                        locationName: { type: Type.STRING },
                        latitude: { type: Type.NUMBER },
                        longitude: { type: Type.NUMBER },
                        activityType: {
                          type: Type.STRING,
                          enum: ['activity', 'food', 'lodging', 'travel'],
                        },
                        time: { type: Type.STRING },
                      },
                      required: ['description', 'locationName', 'activityType', 'latitude', 'longitude'],
                    },
                  },
                },
                required: ['dayNumber', 'activities'],
              },
            },
          },
          required: ['title', 'days'],
        },
      },
    ],
  },
];