import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { parseISO, format, addDays as dateFnsAddDays } from 'date-fns';
import type {
  Trip,
  TripId,
  TripSummary,
  CreateTripInput,
  Activity,
  Itinerary,
  DayItinerary,
  LocationData,
  InterDayTravel,
  NewDayWithoutIds,
} from '@/types';
import { tripFirestoreService } from '@/services/firebase/tripFirestoreService';
import { tripRepository } from '@/services/db/tripRepository';
import { auth } from '@/config/firebase';
import { placesService } from '@/services/maps/placesService';
import {
  reorderActivities,
  moveActivityBetweenDays as moveActivityBetweenDaysUtil,
  reorderDays as reorderDaysUtil,
  addDay,
  removeDay,
} from '@/utils/plannerUtils';

interface TripState {
  // Data
  trips: Trip[];
  activeTrip: Trip | null;
  activeTripId: TripId | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTrips: () => Promise<void>;
  setActiveTrip: (tripId: TripId) => Promise<void>;
  createTrip: (input: CreateTripInput) => Promise<Trip>;
  updateTrip: (tripId: TripId, updates: Partial<Trip>) => Promise<void>;
  deleteTrip: (tripId: TripId) => Promise<void>;
  archiveTrip: (tripId: TripId) => Promise<void>;
  unarchiveTrip: (tripId: TripId) => Promise<void>;
  duplicateTrip: (tripId: TripId) => Promise<Trip>;

  // Itinerary actions
  addActivity: (dayNumber: number, activity: Omit<Activity, 'id'>) => Promise<void>;
  updateActivity: (dayId: string, activityId: string, updates: Partial<Activity>) => Promise<void>;
  deleteActivity: (dayId: string, activityId: string) => Promise<void>;
  replaceItinerary: (itinerary: Itinerary) => Promise<void>;
  addDays: (days: NewDayWithoutIds[], position?: string) => Promise<void>;
  modifyDay: (
    dayNumber: number,
    action: 'add_activities' | 'remove_activities' | 'replace_activities',
    activities?: Omit<Activity, 'id'>[],
    removeIndices?: number[]
  ) => Promise<void>;

  // Planner actions
  reorderActivitiesInDay: (
    dayId: string,
    sourceIndex: number,
    destinationIndex: number
  ) => Promise<void>;
  moveActivityBetweenDays: (
    activityId: string,
    sourceDayId: string,
    destinationDayId: string,
    destinationIndex: number
  ) => Promise<void>;
  reorderDays: (
    sourceIndex: number,
    destinationIndex: number
  ) => Promise<void>;
  addDayAtPosition: (
    position: number
  ) => Promise<DayItinerary>;
  addDayWithLocation: (
    position: number,
    locationName: string
  ) => Promise<DayItinerary>;
  removeDayById: (
    dayId: string,
    activityHandling: 'previous' | 'next' | 'delete'
  ) => Promise<void>;
  updateDayLocation: (
    dayId: string,
    location: LocationData
  ) => Promise<void>;
  resetDayLocation: (
    dayId: string
  ) => Promise<void>;
  updateDayTravel: (
    dayId: string,
    travel: InterDayTravel | undefined
  ) => Promise<void>;
  replaceItineraryDays: (
    days: DayItinerary[]
  ) => Promise<void>;

  // Computed
  getTripSummaries: () => TripSummary[];
  getActiveTripDays: () => DayItinerary[];

  // Sync
  syncLocalTrips: () => Promise<void>;
  isGuestMode: () => boolean;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      // Initial state
      trips: [],
      activeTrip: null,
      activeTripId: null,
      isLoading: false,
      error: null,

      // Load all trips from Firebase or IndexedDB (guest mode)
      loadTrips: async () => {
        set({ isLoading: true, error: null });
        try {
          const userId = auth.currentUser?.uid;
          let trips: Trip[] = [];

          if (userId) {
            // Authenticated: load from Firebase
            trips = await tripFirestoreService.getAll(userId);
          } else {
            // Guest mode: load from IndexedDB
            trips = await tripRepository.getAll();
          }

          const activeTripId = get().activeTripId;

          // Find active trip if we have an ID
          let activeTrip: Trip | null = null;
          if (activeTripId) {
            activeTrip = trips.find(t => t.id === activeTripId) || null;
          }

          // If no active trip, use the most recent one
          if (!activeTrip && trips.length > 0) {
            // Sort by updatedAt descending and take first
            const sorted = [...trips].sort((a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            activeTrip = sorted[0];
          }

          set({
            trips,
            activeTrip,
            activeTripId: activeTrip?.id || null,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load trips',
            isLoading: false,
          });
        }
      },

      // Set active trip
      setActiveTrip: async (tripId: TripId) => {
        const trip = get().trips.find(t => t.id === tripId);
        if (trip) {
          set({ activeTrip: trip, activeTripId: tripId });
        }
      },

      // Create new trip
      createTrip: async (input: CreateTripInput) => {
        const now = new Date().toISOString();
        const tripId = nanoid() as TripId;

        // Parse dates to calculate days (use parseISO to avoid timezone issues)
        const start = parseISO(input.startDate);
        const end = parseISO(input.endDate);
        const daysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Generate empty days
        const days: DayItinerary[] = [];
        for (let i = 0; i < daysCount; i++) {
          const dayDate = dateFnsAddDays(start, i);

          days.push({
            id: nanoid(),
            dayNumber: i + 1,
            date: format(dayDate, 'yyyy-MM-dd'), // YYYY-MM-DD in local time
            activities: [],
          });
        }

        const userId = auth.currentUser?.uid;
        const isLocalOnly = !userId;

        const trip: Trip = {
          id: tripId,
          title: input.title,
          description: '',
          startDate: input.startDate,
          endDate: input.endDate,
          timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          destination: {
            name: input.destination,
            country: '',
            countryCode: '',
            coordinates: { lat: 0, lng: 0 },
          },
          itinerary: {
            title: input.title,
            days,
          },
          status: 'planning',
          createdAt: now,
          updatedAt: now,
          lastAccessedAt: now,
          budgetEnabled: false,
          packingEnabled: false,
          photosEnabled: false,
          defaultCurrency: input.defaultCurrency || 'USD',
          isLocalOnly,
        };

        // Save to Firebase or IndexedDB
        if (userId) {
          await tripFirestoreService.create(trip, userId);
        } else {
          // Guest mode: save to IndexedDB
          await tripRepository.create(trip);
        }

        // Update state
        set(state => ({
          trips: [...state.trips, trip],
          activeTrip: trip,
          activeTripId: trip.id,
        }));

        return trip;
      },

      // Update trip
      updateTrip: async (tripId: TripId, updates: Partial<Trip>) => {
        const userId = auth.currentUser?.uid;
        const trip = get().trips.find(t => t.id === tripId);

        if (userId && !trip?.isLocalOnly) {
          // Authenticated and cloud trip: update in Firebase
          await tripFirestoreService.update(tripId, updates, userId);
        } else {
          // Guest mode or local trip: update in IndexedDB
          await tripRepository.update(tripId, updates);
        }

        set(state => ({
          trips: state.trips.map(t => (t.id === tripId ? { ...t, ...updates } : t)),
          activeTrip:
            state.activeTrip?.id === tripId
              ? { ...state.activeTrip, ...updates }
              : state.activeTrip,
        }));
      },

      // Delete trip
      deleteTrip: async (tripId: TripId) => {
        const userId = auth.currentUser?.uid;
        const trip = get().trips.find(t => t.id === tripId);

        if (userId && !trip?.isLocalOnly) {
          // Authenticated and cloud trip: delete from Firebase
          await tripFirestoreService.delete(tripId, userId);
        } else {
          // Guest mode or local trip: delete from IndexedDB
          await tripRepository.delete(tripId);
        }

        set(state => {
          const newTrips = state.trips.filter(t => t.id !== tripId);
          const newActiveTrip =
            state.activeTripId === tripId ? newTrips[0] || null : state.activeTrip;

          return {
            trips: newTrips,
            activeTrip: newActiveTrip,
            activeTripId: newActiveTrip?.id || null,
          };
        });
      },

      // Archive trip
      archiveTrip: async (tripId: TripId) => {
        await get().updateTrip(tripId, { status: 'archived' });
      },

      // Unarchive trip
      unarchiveTrip: async (tripId: TripId) => {
        await get().updateTrip(tripId, { status: 'completed' });
      },

      // Duplicate trip
      duplicateTrip: async (tripId: TripId) => {
        const trip = get().trips.find(t => t.id === tripId);
        if (!trip) {
          throw new Error('Trip not found');
        }

        const now = new Date().toISOString();
        const newTripId = nanoid() as TripId;
        const userId = auth.currentUser?.uid;
        const isLocalOnly = !userId;

        // Deep clone the itinerary with new IDs
        const newDays: DayItinerary[] = trip.itinerary.days.map(day => ({
          ...day,
          id: nanoid(),
          activities: day.activities.map(activity => ({
            ...activity,
            id: nanoid(),
          })),
        }));

        const newTrip: Trip = {
          ...trip,
          id: newTripId,
          title: `${trip.title} (Copy)`,
          status: 'planning',
          createdAt: now,
          updatedAt: now,
          lastAccessedAt: now,
          isLocalOnly,
          itinerary: {
            ...trip.itinerary,
            title: `${trip.itinerary.title} (Copy)`,
            days: newDays,
          },
        };

        // Save to Firebase or IndexedDB
        if (userId) {
          await tripFirestoreService.create(newTrip, userId);
        } else {
          // Guest mode: save to IndexedDB
          await tripRepository.create(newTrip);
        }

        // Update state
        set(state => ({
          trips: [...state.trips, newTrip],
        }));

        return newTrip;
      },

      // Add activity to day
      addActivity: async (dayNumber: number, activity: Omit<Activity, 'id'>) => {
        const { activeTrip } = get();
        if (!activeTrip) return;

        const targetDay = activeTrip.itinerary.days.find(d => d.dayNumber === dayNumber);
        if (!targetDay) return;

        const newActivity: Activity = {
          ...activity,
          id: nanoid(),
        };

        const updatedDays = activeTrip.itinerary.days.map(d => {
          if (d.dayNumber === dayNumber) {
            return { ...d, activities: [...d.activities, newActivity] };
          }
          return d;
        });

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days: updatedDays,
        };

        await get().updateTrip(activeTrip.id, { itinerary: updatedItinerary });
      },

      // Update activity
      updateActivity: async (dayId: string, activityId: string, updates: Partial<Activity>) => {
        const { activeTrip } = get();
        if (!activeTrip) return;

        const updatedDays = activeTrip.itinerary.days.map(day => {
          if (day.id === dayId) {
            return {
              ...day,
              activities: day.activities.map(a =>
                a.id === activityId ? { ...a, ...updates } : a
              ),
            };
          }
          return day;
        });

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days: updatedDays,
        };

        await get().updateTrip(activeTrip.id, { itinerary: updatedItinerary });
      },

      // Delete activity
      deleteActivity: async (dayId: string, activityId: string) => {
        const { activeTrip } = get();
        if (!activeTrip) return;

        const updatedDays = activeTrip.itinerary.days.map(day => {
          if (day.id === dayId) {
            return {
              ...day,
              activities: day.activities.filter(a => a.id !== activityId),
            };
          }
          return day;
        });

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days: updatedDays,
        };

        await get().updateTrip(activeTrip.id, { itinerary: updatedItinerary });
      },

      // Replace entire itinerary
      replaceItinerary: async (itinerary: Itinerary) => {
        const { activeTrip } = get();
        if (!activeTrip) return;

        await get().updateTrip(activeTrip.id, { itinerary });
      },

      // Add days to itinerary
      addDays: async (days: NewDayWithoutIds[], position: string = 'end') => {
        const { activeTrip } = get();
        if (!activeTrip) return;

        const existingDays = [...activeTrip.itinerary.days];

        // Create new days with IDs and proper dates (use parseISO to avoid timezone issues)
        const lastDay = existingDays[existingDays.length - 1];
        const lastDate = lastDay ? parseISO(lastDay.date) : parseISO(activeTrip.startDate);

        const newDays: DayItinerary[] = days.map((day, index) => {
          const dayDate = dateFnsAddDays(lastDate, index + 1);

          return {
            id: nanoid(),
            dayNumber: existingDays.length + index + 1,
            date: format(dayDate, 'yyyy-MM-dd'),
            activities: (day.activities || []).map(a => ({
              ...a,
              id: nanoid(),
            })),
          };
        });

        let updatedDays: DayItinerary[];

        if (position === 'start') {
          // Insert at beginning, renumber all days
          updatedDays = [
            ...newDays.map((d, i) => ({ ...d, dayNumber: i + 1 })),
            ...existingDays.map((d, i) => ({ ...d, dayNumber: newDays.length + i + 1 })),
          ];
        } else if (!isNaN(Number(position))) {
          // Insert at specific position
          const insertIndex = Number(position) - 1;
          updatedDays = [
            ...existingDays.slice(0, insertIndex),
            ...newDays,
            ...existingDays.slice(insertIndex),
          ].map((d, i) => ({ ...d, dayNumber: i + 1 }));
        } else {
          // Default: append to end
          updatedDays = [...existingDays, ...newDays];
        }

        // Update end date based on new total days
        const newEndDate = updatedDays[updatedDays.length - 1]?.date || activeTrip.endDate;

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days: updatedDays,
        };

        await get().updateTrip(activeTrip.id, {
          itinerary: updatedItinerary,
          endDate: newEndDate,
        });
      },

      // Modify a specific day's activities
      modifyDay: async (
        dayNumber: number,
        action: 'add_activities' | 'remove_activities' | 'replace_activities',
        activities?: Omit<Activity, 'id'>[],
        removeIndices?: number[]
      ) => {
        const { activeTrip } = get();
        if (!activeTrip) return;

        const targetDay = activeTrip.itinerary.days.find(d => d.dayNumber === dayNumber);
        if (!targetDay) return;

        let updatedActivities: Activity[];

        switch (action) {
          case 'add_activities':
            const newActivities = (activities || []).map(a => ({
              ...a,
              id: nanoid(),
            }));
            updatedActivities = [...targetDay.activities, ...newActivities];
            break;

          case 'remove_activities':
            updatedActivities = targetDay.activities.filter(
              (_, index) => !removeIndices?.includes(index)
            );
            break;

          case 'replace_activities':
            updatedActivities = (activities || []).map(a => ({
              ...a,
              id: nanoid(),
            }));
            break;

          default:
            return;
        }

        const updatedDays = activeTrip.itinerary.days.map(d => {
          if (d.dayNumber === dayNumber) {
            return { ...d, activities: updatedActivities };
          }
          return d;
        });

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days: updatedDays,
        };

        await get().updateTrip(activeTrip.id, { itinerary: updatedItinerary });
      },

      // Get trip summaries for list view
      getTripSummaries: () => {
        const { trips } = get();
        return trips.map(trip => {
          const days = trip.itinerary?.days || [];
          return {
            id: trip.id,
            title: trip.title,
            destination: trip.destination?.name || 'Unknown',
            coverImageUrl: trip.coverImageUrl,
            startDate: trip.startDate,
            endDate: trip.endDate,
            status: trip.status,
            daysCount: days.length,
            activitiesCount: days.reduce(
              (sum, day) => sum + (day.activities?.length || 0),
              0
            ),
          };
        });
      },

      // Get active trip days
      getActiveTripDays: () => {
        const { activeTrip } = get();
        return activeTrip?.itinerary.days || [];
      },

      // ============================================
      // PLANNER ACTIONS
      // ============================================

      // Reorder activities within a single day
      reorderActivitiesInDay: async (
        dayId: string,
        sourceIndex: number,
        destinationIndex: number
      ) => {
        const { activeTrip } = get();
        if (!activeTrip) return;

        const dayIndex = activeTrip.itinerary.days.findIndex(d => d.id === dayId);
        if (dayIndex === -1) return;

        const currentDay = activeTrip.itinerary.days[dayIndex];
        const newActivities = reorderActivities(currentDay.activities, sourceIndex, destinationIndex);

        // Update state
        const newDays = [...activeTrip.itinerary.days];
        newDays[dayIndex] = { ...currentDay, activities: newActivities };

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days: newDays,
        };

        // Persist and sync
        const updatedTrip: Partial<Trip> = {
          itinerary: updatedItinerary,
          updatedAt: new Date().toISOString(),
        };

        await get().updateTrip(activeTrip.id, updatedTrip);
      },

      // Move activity between days
      moveActivityBetweenDays: async (
        activityId: string,
        sourceDayId: string,
        destinationDayId: string,
        destinationIndex: number
      ) => {
        const { activeTrip } = get();
        if (!activeTrip) return;

        const sourceDayIndex = activeTrip.itinerary.days.findIndex(d => d.id === sourceDayId);
        const destDayIndex = activeTrip.itinerary.days.findIndex(d => d.id === destinationDayId);

        if (sourceDayIndex === -1 || destDayIndex === -1) return;

        const sourceDay = activeTrip.itinerary.days[sourceDayIndex];
        const destDay = activeTrip.itinerary.days[destDayIndex];

        const sourceActivityIndex = sourceDay.activities.findIndex(a => a.id === activityId);
        if (sourceActivityIndex === -1) return;

        const [newSourceActivities, newDestActivities] = moveActivityBetweenDaysUtil(
          sourceDay.activities,
          destDay.activities,
          sourceActivityIndex,
          destinationIndex
        );

        // Update state
        const newDays = [...activeTrip.itinerary.days];
        newDays[sourceDayIndex] = { ...sourceDay, activities: newSourceActivities };
        newDays[destDayIndex] = { ...destDay, activities: newDestActivities };

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days: newDays,
        };

        const updatedTrip: Partial<Trip> = {
          itinerary: updatedItinerary,
          updatedAt: new Date().toISOString(),
        };

        await get().updateTrip(activeTrip.id, updatedTrip);
      },

      // Reorder days in itinerary
      reorderDays: async (sourceIndex: number, destinationIndex: number) => {
        const { activeTrip } = get();
        if (!activeTrip) return;

        const newDays = reorderDaysUtil(
          activeTrip.itinerary.days,
          sourceIndex,
          destinationIndex,
          activeTrip.startDate
        );

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days: newDays,
        };

        // Update end date to match new last day
        const newEndDate = newDays[newDays.length - 1]?.date || activeTrip.endDate;

        const updatedTrip: Partial<Trip> = {
          itinerary: updatedItinerary,
          endDate: newEndDate,
          updatedAt: new Date().toISOString(),
        };

        await get().updateTrip(activeTrip.id, updatedTrip);
      },

      // Add day at position
      addDayAtPosition: async (position: number): Promise<DayItinerary> => {
        const { activeTrip } = get();
        if (!activeTrip) {
          throw new Error('No active trip');
        }

        const { newDays, newDay, newTripEndDate } = addDay(
          activeTrip.itinerary.days,
          position,
          activeTrip.startDate
        );

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days: newDays,
        };

        const updatedTrip: Partial<Trip> = {
          itinerary: updatedItinerary,
          endDate: newTripEndDate,
          updatedAt: new Date().toISOString(),
        };

        await get().updateTrip(activeTrip.id, updatedTrip);

        return newDay;
      },

      // Add day at position with a placeholder location activity
      addDayWithLocation: async (
        position: number,
        locationName: string
      ): Promise<DayItinerary> => {
        const { activeTrip } = get();
        if (!activeTrip) {
          throw new Error('No active trip');
        }

        const { newDays, newDay, newTripEndDate } = addDay(
          activeTrip.itinerary.days,
          position,
          activeTrip.startDate
        );

        // Try to geocode the location name
        let coordinates = { lat: 0, lng: 0 };
        let formattedAddress = locationName;

        try {
          const geocodeResult = await placesService.geocode(locationName);
          if (geocodeResult) {
            coordinates = { lat: geocodeResult.lat, lng: geocodeResult.lng };
            formattedAddress = geocodeResult.formattedAddress;
          }
        } catch (error) {
          console.warn('Geocoding failed, using default coordinates:', error);
        }

        // Create a placeholder activity for the location
        const placeholderActivity: Activity = {
          id: nanoid(),
          description: `Visit ${locationName}`,
          type: 'activity',
          location: {
            name: locationName,
            address: formattedAddress,
            coordinates,
          },
          details: {
            notes: coordinates.lat === 0 && coordinates.lng === 0
              ? `Placeholder for ${locationName} (location not found on map)`
              : undefined,
          },
        };

        // Add the placeholder activity to the new day
        const dayIndex = newDays.findIndex(d => d.id === newDay.id);
        if (dayIndex !== -1) {
          newDays[dayIndex] = {
            ...newDays[dayIndex],
            activities: [placeholderActivity],
          };
        }

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days: newDays,
        };

        const updatedTrip: Partial<Trip> = {
          itinerary: updatedItinerary,
          endDate: newTripEndDate,
          updatedAt: new Date().toISOString(),
        };

        await get().updateTrip(activeTrip.id, updatedTrip);

        return newDays[dayIndex];
      },

      // Remove day by ID
      removeDayById: async (
        dayId: string,
        activityHandling: 'previous' | 'next' | 'delete'
      ) => {
        const { activeTrip } = get();
        if (!activeTrip) return;

        const { newDays, orphanedActivities, newTripEndDate } = removeDay(
          activeTrip.itinerary.days,
          dayId,
          activityHandling,
          activeTrip.startDate
        );

        // If nothing changed (e.g., trying to remove only day), exit
        if (newDays.length === activeTrip.itinerary.days.length) {
          return;
        }

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days: newDays,
        };

        const updatedTrip: Partial<Trip> = {
          itinerary: updatedItinerary,
          endDate: newTripEndDate,
          updatedAt: new Date().toISOString(),
        };

        await get().updateTrip(activeTrip.id, updatedTrip);

        // Log orphaned activities if any (for debugging)
        if (orphanedActivities.length > 0) {
          console.info('Orphaned activities from removed day:', orphanedActivities);
        }
      },

      // Update day's primary location
      updateDayLocation: async (dayId: string, location: LocationData) => {
        const { activeTrip } = get();
        if (!activeTrip) return;

        const dayIndex = activeTrip.itinerary.days.findIndex(d => d.id === dayId);
        if (dayIndex === -1) return;

        const newDays = [...activeTrip.itinerary.days];
        newDays[dayIndex] = {
          ...newDays[dayIndex],
          primaryLocation: location,
        };

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days: newDays,
        };

        const updatedTrip: Partial<Trip> = {
          itinerary: updatedItinerary,
          updatedAt: new Date().toISOString(),
        };

        await get().updateTrip(activeTrip.id, updatedTrip);
      },

      // Reset/clear day's primary location
      resetDayLocation: async (dayId: string) => {
        const { activeTrip } = get();
        if (!activeTrip) return;

        const dayIndex = activeTrip.itinerary.days.findIndex(d => d.id === dayId);
        if (dayIndex === -1) return;

        const newDays = [...activeTrip.itinerary.days];
        // Remove the primaryLocation property
        const { primaryLocation: _, ...dayWithoutLocation } = newDays[dayIndex];
        newDays[dayIndex] = dayWithoutLocation as typeof newDays[number];

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days: newDays,
        };

        const updatedTrip: Partial<Trip> = {
          itinerary: updatedItinerary,
          updatedAt: new Date().toISOString(),
        };

        await get().updateTrip(activeTrip.id, updatedTrip);
      },

      // Update travel mode for a day (how to get there from previous day)
      updateDayTravel: async (dayId: string, travel: InterDayTravel | undefined) => {
        const { activeTrip } = get();
        if (!activeTrip) return;

        const dayIndex = activeTrip.itinerary.days.findIndex(d => d.id === dayId);
        if (dayIndex === -1) return;

        const newDays = [...activeTrip.itinerary.days];
        newDays[dayIndex] = {
          ...newDays[dayIndex],
          travelFromPrevious: travel,
        };

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days: newDays,
        };

        const updatedTrip: Partial<Trip> = {
          itinerary: updatedItinerary,
          updatedAt: new Date().toISOString(),
        };

        await get().updateTrip(activeTrip.id, updatedTrip);
      },

      // Replace itinerary days (for undo/redo)
      replaceItineraryDays: async (days: DayItinerary[]) => {
        const { activeTrip } = get();
        if (!activeTrip) return;

        const updatedItinerary: Itinerary = {
          ...activeTrip.itinerary,
          days,
        };

        // Update end date to match new last day
        const newEndDate = days[days.length - 1]?.date || activeTrip.endDate;

        const updatedTrip: Partial<Trip> = {
          itinerary: updatedItinerary,
          endDate: newEndDate,
          updatedAt: new Date().toISOString(),
        };

        await get().updateTrip(activeTrip.id, updatedTrip);
        // No sync queue for undo/redo - this is a local operation
      },

      // Sync local trips to cloud when user signs in
      syncLocalTrips: async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        try {
          // Get all local-only trips from IndexedDB
          const localTrips = await tripRepository.getLocalOnly();

          if (localTrips.length === 0) return;

          console.log(`Syncing ${localTrips.length} local trips to cloud...`);

          // Upload each local trip to Firebase
          for (const trip of localTrips) {
            const syncedTrip: Trip = {
              ...trip,
              isLocalOnly: false,
            };

            // Create in Firebase
            await tripFirestoreService.create(syncedTrip, userId);

            // Update local copy to mark as synced
            await tripRepository.markAsSynced(trip.id);
          }

          // Reload trips to get fresh state
          await get().loadTrips();

          console.log('Local trips synced successfully');
        } catch (error) {
          console.error('Failed to sync local trips:', error);
          throw error;
        }
      },

      // Check if currently in guest mode
      isGuestMode: () => {
        return !auth.currentUser;
      },
    }),
    {
      name: 'trippilot-trips',
      partialize: state => ({
        activeTripId: state.activeTripId,
      }),
    }
  )
);
