import { useState, useMemo, useEffect } from 'react';
import { ChatMessage, PendingAction, Itinerary, Activity, ActivityType, GeminiHistoryEntry, CreateTripInput, NewDayWithoutIds } from '@/types';
import { getChatResponse } from '@/services/geminiService';
import { format, addDays, parseISO, startOfDay, isBefore } from 'date-fns';
import type {
  ProposeActivityArgs,
  CreateItineraryArgs,
  CreateItineraryDayArg,
  GeminiFunctionActivityArg,
  AddDayArgs,
  AddDayDayArg,
  ModifyDayArgs,
  AskClarificationArgs,
} from '@/types/tools';

// Chat mode: 'create' for new trips, 'edit' for modifying existing trips
export type ChatMode = 'create' | 'edit';

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  confirmAction: (messageId: string, action: PendingAction, selectedOption?: string) => void;
  cancelAction: (messageId: string) => void;
  clearHistory: () => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
}

/**
 * Helper function to extract destination from itinerary
 * Implements fallback chain for robust destination extraction
 */
function extractDestination(itinerary: Itinerary): string {
  // Try to find lodging activity (usually has city name)
  const lodging = itinerary.days
    .flatMap(d => d.activities)
    .find(a => a.type === 'lodging');
  if (lodging?.location?.name) return lodging.location.name;

  // Try first activity
  const first = itinerary.days[0]?.activities[0];
  if (first?.location?.name) return first.location.name;

  // Fallback
  return 'My Trip';
}

/**
 * Helper function to infer CreateTripInput from AI-generated itinerary
 * Validates and fixes dates, extracts destination
 */
function inferTripInputFromItinerary(
  callArgs: CreateItineraryArgs,
  itinerary: Itinerary
): CreateTripInput {
  const title = callArgs.title || itinerary.title;
  const destination = extractDestination(itinerary);

  // Calculate and validate dates
  let startDate = callArgs.startDate || format(addDays(new Date(), 1), 'yyyy-MM-dd');

  // Validate start date - if in the past, shift to tomorrow
  let start = parseISO(startDate);
  const today = startOfDay(new Date());
  if (isBefore(start, today)) {
    start = addDays(today, 1);
    startDate = format(start, 'yyyy-MM-dd');
  }

  const endDate = format(
    addDays(start, itinerary.days.length - 1),
    'yyyy-MM-dd'
  );

  return {
    title,
    destination,
    startDate,
    endDate,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    defaultCurrency: 'USD'
  };
}

// Callback type for adding days
type OnDayAddCallback = (days: NewDayWithoutIds[], position?: string) => Promise<void>;
// Callback type for modifying days
type OnDayModifyCallback = (
  dayNumber: number,
  action: 'add_activities' | 'remove_activities' | 'replace_activities',
  activities?: Omit<Activity, 'id'>[],
  removeIndices?: number[]
) => Promise<void>;

export function useChat(
  itinerary: Itinerary,
  hasActiveTrip: boolean,
  onItineraryChange: (itinerary: Itinerary) => Promise<void>,
  onActivityAdd: (dayNumber: number, activity: Omit<Activity, 'id'>) => Promise<void>,
  onTripCreate: (input: CreateTripInput, itinerary: Itinerary) => Promise<void>,
  onDayAdd?: OnDayAddCallback,
  onDayModify?: OnDayModifyCallback
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "Hi! I'm TripPilot. Tell me where you want to go (e.g., 'Plan a 30 day trip to Japan') and I'll map it out!"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Mode state: auto-initialize based on whether there's an active trip
  const [mode, setMode] = useState<ChatMode>(hasActiveTrip ? 'edit' : 'create');

  // Auto-switch mode when active trip changes
  useEffect(() => {
    setMode(hasActiveTrip ? 'edit' : 'create');
  }, [hasActiveTrip]);

  const sendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const historyForGemini: GeminiHistoryEntry[] = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      // Call Gemini with current mode
      const response = await getChatResponse(historyForGemini, text, itinerary, hasActiveTrip, mode);

      const modelText = response.text;
      const functionCalls = response.functionCalls;
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

      let newMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: modelText || "Working on that...",
        groundingChunks: groundingChunks,
        timestamp: Date.now()
      };

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];

        if (call.name === 'propose_activity') {
          const args = call.args as unknown as ProposeActivityArgs;

          if (!hasActiveTrip) {
            // Cannot add activity without a trip
            newMessage = {
              ...newMessage,
              content: "I'd love to add that activity, but you'll need to create a trip first. Tell me where you want to go and I'll plan it out!"
            };
          } else {
            newMessage = {
              ...newMessage,
              content: modelText || "I found something cool!",
              pendingAction: {
                type: 'add_activity',
                status: 'pending',
                data: {
                  dayNumber: Number(args.dayNumber),
                  activity: {
                    description: args.description,
                    location: {
                      name: args.locationName,
                      coordinates: {
                        lat: args.latitude || 0,
                        lng: args.longitude || 0
                      },
                      address: args.locationName
                    },
                    type: args.activityType as ActivityType,
                    time: args.time
                  }
                }
              }
            };
          }
        } else if (call.name === 'create_itinerary') {
          const args = call.args as unknown as CreateItineraryArgs;

          const newItinerary: Itinerary = {
            title: args.title,
            days: args.days.map((d: CreateItineraryDayArg, index: number) => {
              const date = new Date();
              date.setDate(date.getDate() + 1 + index);

              return {
                id: `day-${d.dayNumber}-${Date.now()}`,
                dayNumber: d.dayNumber,
                date: date.toISOString().split('T')[0],
                activities: (d.activities || []).map((a: GeminiFunctionActivityArg, aIdx: number) => ({
                  id: `act-${d.dayNumber}-${aIdx}-${Date.now()}`,
                  description: a.description,
                  type: a.activityType,
                  time: a.time,
                  location: {
                    name: a.locationName,
                    coordinates: {
                      lat: a.latitude || 0,
                      lng: a.longitude || 0
                    },
                    address: a.locationName
                  }
                }))
              };
            })
          };

          // Edge case: validate itinerary is not empty
          if (!newItinerary.days.length || newItinerary.days.every(d => d.activities.length === 0)) {
            newMessage = {
              ...newMessage,
              content: "I couldn't generate a proper itinerary. Could you tell me more about what you're looking for?"
            };
          } else if (hasActiveTrip) {
            // Existing trip - replace itinerary
            newMessage = {
              ...newMessage,
              content: modelText || `I've mapped out a ${newItinerary.days.length}-day adventure for ${newItinerary.title}. Ready to go?`,
              pendingAction: {
                type: 'replace_itinerary',
                status: 'pending',
                data: {
                  itinerary: newItinerary
                }
              }
            };
          } else {
            // No active trip - create trip with itinerary
            const tripInput = inferTripInputFromItinerary(args, newItinerary);
            newMessage = {
              ...newMessage,
              content: modelText || `I've created a ${newItinerary.days.length}-day trip to ${tripInput.destination}! Ready to start planning?`,
              pendingAction: {
                type: 'create_trip_with_itinerary',
                status: 'pending',
                data: {
                  tripInput,
                  itinerary: newItinerary
                }
              }
            };
          }
        } else if (call.name === 'add_day') {
          // Handle add_day function call
          const args = call.args as unknown as AddDayArgs;

          if (!hasActiveTrip) {
            newMessage = {
              ...newMessage,
              content: "I'd love to add days to your trip, but you'll need to create a trip first!"
            };
          } else {
            // Parse the days from the AI response
            const newDays = args.days.map((d: AddDayDayArg, index: number) => ({
              dayNumber: d.dayNumber || (itinerary.days.length + index + 1),
              title: d.title,
              date: '', // Will be calculated when applied
              activities: (d.activities || []).map((a: GeminiFunctionActivityArg) => ({
                description: a.description,
                type: a.activityType as ActivityType,
                time: a.time,
                location: {
                  name: a.locationName,
                  coordinates: {
                    lat: a.latitude || 0,
                    lng: a.longitude || 0
                  },
                  address: a.locationName
                }
              }))
            }));

            const dayTitles = newDays.map((d) =>
              d.title || d.activities[0]?.location?.name || `Day ${d.dayNumber}`
            ).join(', ');

            newMessage = {
              ...newMessage,
              content: modelText || `I'll add ${newDays.length} new day${newDays.length > 1 ? 's' : ''}: ${dayTitles}`,
              pendingAction: {
                type: 'add_day',
                status: 'pending',
                data: {
                  days: newDays,
                  position: args.position || 'end'
                }
              }
            };
          }
        } else if (call.name === 'modify_day') {
          // Handle modify_day function call
          const args = call.args as unknown as ModifyDayArgs;

          if (!hasActiveTrip) {
            newMessage = {
              ...newMessage,
              content: "I'd love to modify your itinerary, but you'll need to create a trip first!"
            };
          } else {
            const dayNumber = args.dayNumber;
            const modifyAction = args.action;

            // Parse activities if provided
            const activities = (args.activities || []).map((a: GeminiFunctionActivityArg) => ({
              description: a.description,
              type: a.activityType as ActivityType,
              time: a.time,
              location: {
                name: a.locationName,
                coordinates: {
                  lat: a.latitude || 0,
                  lng: a.longitude || 0
                },
                address: a.locationName
              }
            }));

            let actionDescription = '';
            if (modifyAction === 'add_activities') {
              actionDescription = `Add ${activities.length} activit${activities.length > 1 ? 'ies' : 'y'} to Day ${dayNumber}`;
            } else if (modifyAction === 'remove_activities') {
              actionDescription = `Remove activities from Day ${dayNumber}`;
            } else {
              actionDescription = `Replace activities on Day ${dayNumber}`;
            }

            newMessage = {
              ...newMessage,
              content: modelText || actionDescription,
              pendingAction: {
                type: 'modify_day',
                status: 'pending',
                data: {
                  dayNumber,
                  modifyAction,
                  activities,
                  removeIndices: args.removeIndices
                }
              }
            };
          }
        } else if (call.name === 'ask_clarification') {
          // Handle ask_clarification function call
          const args = call.args as unknown as AskClarificationArgs;

          newMessage = {
            ...newMessage,
            content: args.question,
            pendingAction: {
              type: 'ask_clarification',
              status: 'pending',
              data: {
                question: args.question,
                options: args.options || []
              }
            }
          };
        }
      }

      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'model',
          content: "Oops! I had a little trouble connecting. Check your key and try again!",
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAction = async (messageId: string, action: PendingAction, selectedOption?: string) => {
    if (action.type === 'create_trip_with_itinerary' && action.data.tripInput && action.data.itinerary) {
      // Create trip first, then set itinerary
      await onTripCreate(action.data.tripInput, action.data.itinerary);
    } else if (action.type === 'replace_itinerary' && action.data.itinerary) {
      await onItineraryChange(action.data.itinerary);
    } else if (action.type === 'add_activity' && action.data.dayNumber && action.data.activity) {
      await onActivityAdd(action.data.dayNumber, action.data.activity);
    } else if (action.type === 'add_day' && action.data.days && onDayAdd) {
      await onDayAdd(action.data.days, action.data.position);
    } else if (action.type === 'modify_day' && action.data.dayNumber && action.data.modifyAction && onDayModify) {
      await onDayModify(
        action.data.dayNumber,
        action.data.modifyAction,
        action.data.activities,
        action.data.removeIndices
      );
    } else if (action.type === 'ask_clarification' && selectedOption) {
      // For clarification, send the selected option as a new message
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, pendingAction: { ...action, status: 'confirmed', data: { ...action.data, selectedOption } } };
          }
          return msg;
        })
      );
      // Send the selected option as a follow-up message
      await sendMessage(selectedOption);
      return; // Don't update status again below
    }

    setMessages(prev =>
      prev.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, pendingAction: { ...action, status: 'confirmed' } };
        }
        return msg;
      })
    );
  };

  const cancelAction = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg => {
        if (msg.id === messageId && msg.pendingAction) {
          return { ...msg, pendingAction: { ...msg.pendingAction, status: 'cancelled' } };
        }
        return msg;
      })
    );
  };

  const clearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: "Hi! I'm TripPilot. Tell me where you want to go (e.g., 'Plan a 30 day trip to Japan') and I'll map it out!"
      }
    ]);
  };

  return useMemo(
    () => ({
      messages,
      isLoading,
      sendMessage,
      confirmAction,
      cancelAction,
      clearHistory,
      mode,
      setMode,
    }),
    [messages, isLoading, mode]
  );
}
