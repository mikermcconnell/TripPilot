import { Activity, Itinerary, DayItinerary } from './itinerary';
import { CreateTripInput } from './trip';

// Grounding sources from Gemini
export interface GroundingChunk {
  web?: { uri?: string; title?: string };
  maps?: { uri?: string; title?: string };
}

// Pending action types
export type PendingActionType =
  | 'add_activity'
  | 'replace_itinerary'
  | 'create_trip_with_itinerary'
  | 'add_day'
  | 'modify_day'
  | 'ask_clarification';

export type PendingActionStatus = 'pending' | 'confirmed' | 'cancelled';

// Modify day action types
export type ModifyDayAction = 'add_activities' | 'remove_activities' | 'replace_activities';

// Pending action data structure
export interface PendingActionData {
  dayNumber?: number;
  activity?: Omit<Activity, 'id'>;
  itinerary?: Itinerary;
  tripInput?: CreateTripInput;
  // For add_day action
  days?: Omit<DayItinerary, 'id'>[];
  position?: string;
  // For modify_day action
  modifyAction?: ModifyDayAction;
  activities?: Omit<Activity, 'id'>[];
  removeIndices?: number[];
  // For ask_clarification action
  question?: string;
  options?: string[];
  selectedOption?: string;
}

// Pending action attached to chat messages
export interface PendingAction {
  type: PendingActionType;
  data: PendingActionData;
  status: PendingActionStatus;
}

// Chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  pendingAction?: PendingAction;
  groundingChunks?: GroundingChunk[];
  timestamp?: number;      // For message ordering
}

// Chat history format for Gemini API
export interface GeminiHistoryEntry {
  role: string;
  parts: { text?: string }[];
}
