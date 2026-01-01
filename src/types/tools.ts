import { Type } from "@google/genai";
import type { ActivityType } from './itinerary';
import type { ModifyDayAction } from './chat';

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
      {
        name: 'add_day',
        description: 'Add one or more new days to an EXISTING trip itinerary. Use this in EDIT MODE when user wants to extend their trip with new days. Only available when editing an existing trip.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            position: {
              type: Type.STRING,
              description: 'Where to insert the new day(s): "end" (default), "start", or a number like "3" to insert at that position.',
            },
            days: {
              type: Type.ARRAY,
              description: 'Array of day objects to add to the trip.',
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.NUMBER, description: 'The day number (will be adjusted based on position).' },
                  title: { type: Type.STRING, description: 'Optional title for the day (e.g., "Galway Day Trip").' },
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
          required: ['days'],
        },
      },
      {
        name: 'modify_day',
        description: 'Modify activities within an existing day of the trip. Use this in EDIT MODE to add, remove, or replace activities on a specific day.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            dayNumber: {
              type: Type.NUMBER,
              description: 'The day number to modify (e.g., 1, 2, 3).',
            },
            action: {
              type: Type.STRING,
              enum: ['add_activities', 'remove_activities', 'replace_activities'],
              description: 'The modification action: add_activities (append), remove_activities (by index), replace_activities (replace all).',
            },
            activities: {
              type: Type.ARRAY,
              description: 'Activities to add or replace with. Required for add_activities and replace_activities.',
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
            removeIndices: {
              type: Type.ARRAY,
              description: 'Indices of activities to remove (0-based). Required for remove_activities action.',
              items: { type: Type.NUMBER },
            },
          },
          required: ['dayNumber', 'action'],
        },
      },
      {
        name: 'ask_clarification',
        description: 'Ask the user for clarification when their intent is ambiguous. Use this when you cannot determine if the user wants to create a new trip or edit their existing trip.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            question: {
              type: Type.STRING,
              description: 'The clarification question to ask the user.',
            },
            options: {
              type: Type.ARRAY,
              description: 'Array of 2-4 options for the user to choose from.',
              items: { type: Type.STRING },
            },
          },
          required: ['question', 'options'],
        },
      },
    ],
  },
];

// ============================================
// GEMINI FUNCTION CALL ARGUMENT TYPES
// ============================================

/**
 * Activity argument structure used across multiple function calls
 */
export interface GeminiFunctionActivityArg {
  description: string;
  activityType: ActivityType;
  time: string;
  locationName: string;
  latitude?: number;
  longitude?: number;
}

// --- PROPOSE_ACTIVITY ---

/**
 * Arguments for the propose_activity function call
 */
export interface ProposeActivityArgs {
  dayNumber: number;
  description: string;
  locationName: string;
  latitude?: number;
  longitude?: number;
  activityType: ActivityType;
  time: string;
}

// --- CREATE_ITINERARY ---

/**
 * Day structure within create_itinerary arguments
 */
export interface CreateItineraryDayArg {
  dayNumber: number;
  activities: GeminiFunctionActivityArg[];
}

/**
 * Arguments for the create_itinerary function call
 */
export interface CreateItineraryArgs {
  title: string;
  startDate?: string;
  days: CreateItineraryDayArg[];
}

// --- ADD_DAY ---

/**
 * Day structure within add_day arguments
 */
export interface AddDayDayArg {
  dayNumber?: number;
  title?: string;
  activities: GeminiFunctionActivityArg[];
}

/**
 * Arguments for the add_day function call
 */
export interface AddDayArgs {
  days: AddDayDayArg[];
  position?: 'start' | 'end' | string;
}

// --- MODIFY_DAY ---

// ModifyDayAction is imported from chat.ts to avoid duplicate exports

/**
 * Arguments for the modify_day function call
 */
export interface ModifyDayArgs {
  dayNumber: number;
  action: ModifyDayAction;
  activities?: GeminiFunctionActivityArg[];
  removeIndices?: number[];
}

// --- ASK_CLARIFICATION ---

/**
 * Arguments for the ask_clarification function call
 */
export interface AskClarificationArgs {
  question: string;
  options?: string[];
}

// --- UNION TYPE FOR ALL FUNCTION CALLS ---

/**
 * Discriminated union of all Gemini function call types
 */
export type GeminiFunctionCall =
  | { name: 'propose_activity'; args: ProposeActivityArgs }
  | { name: 'create_itinerary'; args: CreateItineraryArgs }
  | { name: 'add_day'; args: AddDayArgs }
  | { name: 'modify_day'; args: ModifyDayArgs }
  | { name: 'ask_clarification'; args: AskClarificationArgs };

/**
 * Type guard to check if a function call is of a specific type
 */
export function isFunctionCall<T extends GeminiFunctionCall['name']>(
  call: GeminiFunctionCall,
  name: T
): call is Extract<GeminiFunctionCall, { name: T }> {
  return call.name === name;
}
