import { GoogleGenAI, Type } from "@google/genai";
import { Itinerary, ITINERARY_TOOLS } from "@/types";
import { ChatMode } from "@/hooks/useChat";

const API_KEY = process.env.VITE_GEMINI_API_KEY;

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Using Gemini 3 Pro for reliable structured output
const MODEL_NAME = 'gemini-3-pro-preview';

export const parseItineraryText = async (text: string): Promise<Itinerary | null> => {
  if (!API_KEY) {
    console.error("API Key missing");
    return null;
  }

  try {
    console.log("Starting Gemini parse, text length:", text.length);
    const startTime = Date.now();

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Parse the following travel itinerary text into a structured JSON format.
      If dates are not explicit, assume starting from tomorrow.
      Infer coordinates (lat/lng) for famous locations if possible, otherwise use approximate city center coordinates.

      IMPORTANT: Be concise. Only include essential information from the input. Do not add extra details or embellish descriptions.

      Text to parse:
      ${text}`,
      config: {
        maxOutputTokens: 8192,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  dayNumber: { type: Type.NUMBER },
                  date: { type: Type.STRING },
                  activities: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        time: { type: Type.STRING },
                        description: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['food', 'activity', 'lodging', 'travel'] },
                        location: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            coordinates: {
                              type: Type.OBJECT,
                              properties: {
                                lat: { type: Type.NUMBER },
                                lng: { type: Type.NUMBER },
                              }
                            },
                            address: { type: Type.STRING }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log("Gemini response received in", Date.now() - startTime, "ms");

    const jsonText = response.text;
    if (!jsonText) {
      console.error("Empty response from Gemini");
      return null;
    }

    console.log("Response length:", jsonText.length, "chars");

    try {
      const parsed = JSON.parse(jsonText) as Itinerary;
      console.log("Successfully parsed itinerary with", parsed.days?.length || 0, "days");
      return parsed;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Response preview:", jsonText.substring(0, 500));
      console.error("Response end:", jsonText.substring(jsonText.length - 200));
      return null;
    }
  } catch (error) {
    console.error("Error parsing itinerary:", error);
    return null;
  }
};

export const getChatResponse = async (
  history: { role: string; parts: { text?: string }[] }[],
  message: string,
  currentItinerary: Itinerary,
  hasActiveTrip: boolean,
  mode: ChatMode = 'create'
) => {
  if (!API_KEY) throw new Error("API Key missing");

  // Generate day summary for edit mode context
  const daySummary = currentItinerary.days.map(d => {
    const location = d.activities[0]?.location?.name || 'Unknown';
    return `Day ${d.dayNumber}: ${location}`;
  }).join(', ');

  // Mode-specific system instructions
  let systemInstruction: string;

  if (mode === 'edit' && hasActiveTrip) {
    // EDIT MODE - Focus on modifying existing trip
    systemInstruction = `You are TripPilot in EDIT MODE, helping modify an existing trip.

    CURRENT TRIP: "${currentItinerary.title || 'Untitled Trip'}"
    DAYS: ${currentItinerary.days.length} (${daySummary})

    IMPORTANT RULES FOR EDIT MODE:
    1. CLARIFY AMBIGUOUS INTENT: If the user's request could mean creating a new trip OR editing the current one, use 'ask_clarification' to ask them.
       Example: User says "Plan a trip to Spain" - Ask: "Would you like to add Spain to your current trip, or create a separate Spain trip?"

    2. DEFAULT TO ADDING, NOT REPLACING:
       - To ADD new days: Use 'add_day' (preferred for extending the trip)
       - To ADD activities to existing day: Use 'modify_day' with action 'add_activities'
       - To MODIFY a day's activities: Use 'modify_day'
       - ONLY use 'create_itinerary' if the user EXPLICITLY wants to replace the entire trip

    3. SINGLE ADDITIONS: Use 'propose_activity' for adding ONE specific item to a day

    4. COORDINATES: You MUST provide estimated 'latitude' and 'longitude' for EVERY location. Never leave them as 0.

    5. Be helpful and suggest logical extensions (e.g., if trip is in Ireland and user asks to add Galway, suggest adding it as Day 3)

    Available tools:
    - add_day: Add new days to extend the trip
    - modify_day: Change activities within an existing day
    - propose_activity: Add a single activity to a specific day
    - ask_clarification: Ask user when intent is unclear
    - create_itinerary: ONLY use if user explicitly wants to replace entire trip
    `;
  } else {
    // CREATE MODE - Focus on creating new trips
    systemInstruction = `You are TripPilot in CREATE MODE, helping plan new trips.

    RULES:
    1. ACTION OVER CONVERSATION: When user asks to plan a trip (e.g., "Plan a 5 day trip to Tokyo"), IMMEDIATELY generate a full itinerary using 'create_itinerary'. Do not ask clarifying questions.

    2. ASSUME DEFAULTS: If details are missing, assume:
       - "First Timer's Best Of" style trip
       - Moderate pacing
       - Mid-range budget

    3. FULL TRIPS: Use 'create_itinerary' to generate comprehensive multi-day plans (up to 30 days). Fill every day with 2-3 activities.

    4. Be decisive. Say "Here is a complete plan..." and call the tool.

    5. COORDINATES: You MUST provide estimated 'latitude' and 'longitude' for EVERY location using your internal knowledge. Never leave them as 0.

    ${hasActiveTrip
      ? `Note: User has an active trip but is in CREATE mode. They want to create a NEW separate trip.`
      : `Current Context: User has NO active trip. A new trip will be created when they confirm.`
    }
    `;
  }

  const chat = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction,
      // Removed googleMaps to fix "Google Maps tool is not enabled for this model" error
      // Function calling cannot be combined with googleMaps/googleSearch in some configurations.
      tools: ITINERARY_TOOLS as any,
    },
    history: history.map(h => ({
      role: h.role,
      parts: h.parts.map(p => ({ text: p.text || '' })),
    })),
  });

  const result = await chat.sendMessage({ message });
  return result;
};