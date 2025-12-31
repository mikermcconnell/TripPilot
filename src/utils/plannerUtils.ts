import { nanoid } from 'nanoid';
import { parseISO, format, addDays } from 'date-fns';
import type { Activity, DayItinerary } from '@/types/itinerary';
import type { ItinerarySnapshot } from '@/types/planner';

/**
 * Reorders activities within a single day.
 *
 * @param activities - Current activities array
 * @param sourceIndex - Original position (0-indexed)
 * @param destinationIndex - Target position (0-indexed)
 * @returns New activities array with updated order
 *
 * ALGORITHM:
 * 1. Create shallow copy to avoid mutation
 * 2. Remove item from source position
 * 3. Insert item at destination position
 * 4. Return new array (original unchanged)
 */
export function reorderActivities(
  activities: Activity[],
  sourceIndex: number,
  destinationIndex: number
): Activity[] {
  // Edge case: no-op if same position
  if (sourceIndex === destinationIndex) {
    return activities;
  }

  // Edge case: out of bounds
  if (
    sourceIndex < 0 ||
    sourceIndex >= activities.length ||
    destinationIndex < 0 ||
    destinationIndex > activities.length
  ) {
    console.warn('reorderActivities: Index out of bounds', { sourceIndex, destinationIndex, length: activities.length });
    return activities;
  }

  const result = [...activities];
  const [removed] = result.splice(sourceIndex, 1);
  result.splice(destinationIndex, 0, removed);

  return result;
}

/**
 * Moves an activity from one day to another.
 *
 * @param sourceDayActivities - Activities in source day
 * @param destDayActivities - Activities in destination day
 * @param sourceIndex - Position in source day
 * @param destinationIndex - Target position in destination day
 * @returns Tuple of [newSourceActivities, newDestActivities]
 *
 * ALGORITHM:
 * 1. Create copies of both arrays
 * 2. Remove activity from source
 * 3. Insert into destination at specified index
 * 4. Return both modified arrays
 */
export function moveActivityBetweenDays(
  sourceDayActivities: Activity[],
  destDayActivities: Activity[],
  sourceIndex: number,
  destinationIndex: number
): [Activity[], Activity[]] {
  const sourceResult = [...sourceDayActivities];
  const destResult = [...destDayActivities];

  const [movedActivity] = sourceResult.splice(sourceIndex, 1);
  destResult.splice(destinationIndex, 0, movedActivity);

  return [sourceResult, destResult];
}

/**
 * Reorders days in the itinerary and recalculates dayNumbers and dates.
 *
 * @param days - Current days array
 * @param sourceIndex - Original position (0-indexed)
 * @param destinationIndex - Target position (0-indexed)
 * @param tripStartDate - Trip start date for recalculating day dates
 * @returns New days array with updated dayNumbers and dates
 *
 * ALGORITHM:
 * 1. Reorder days array (same as activity reorder)
 * 2. Iterate through new order
 * 3. Set dayNumber = index + 1 (1-indexed)
 * 4. Calculate date = tripStartDate + (index) days
 * 5. Return fully updated array
 *
 * IMPORTANT: This changes dates of ALL days. Activities within days
 * keep their times but effectively move to new calendar dates.
 */
export function reorderDays(
  days: DayItinerary[],
  sourceIndex: number,
  destinationIndex: number,
  tripStartDate: string
): DayItinerary[] {
  if (sourceIndex === destinationIndex) {
    return days;
  }

  const result = [...days];
  const [removed] = result.splice(sourceIndex, 1);
  result.splice(destinationIndex, 0, removed);

  // Recalculate dayNumbers and dates
  const startDate = parseISO(tripStartDate);

  return result.map((day, index) => ({
    ...day,
    dayNumber: index + 1,
    date: format(addDays(startDate, index), 'yyyy-MM-dd'),
  }));
}

/**
 * Adds a new day at the specified position.
 *
 * @param days - Current days array
 * @param position - Insert position (0 = start, days.length = end)
 * @param tripStartDate - Trip start date for recalculating all dates
 * @returns Object with { newDays, newDay, newTripEndDate }
 *
 * ALGORITHM:
 * 1. Create new day with unique ID
 * 2. Insert at specified position
 * 3. Recalculate ALL dayNumbers and dates from position 0
 * 4. Calculate new trip end date
 * 5. Return updated structure
 *
 * NOTE: Adding a day always extends the trip duration by 1.
 * The user can later adjust the trip end date if needed.
 */
export function addDay(
  days: DayItinerary[],
  position: number,
  tripStartDate: string
): { newDays: DayItinerary[]; newDay: DayItinerary; newTripEndDate: string } {
  const startDate = parseISO(tripStartDate);

  const newDay: DayItinerary = {
    id: nanoid(),
    dayNumber: position + 1,  // Will be recalculated
    date: format(addDays(startDate, position), 'yyyy-MM-dd'),
    activities: [],
  };

  const result = [...days];
  result.splice(position, 0, newDay);

  // Recalculate all dayNumbers and dates
  const newDays = result.map((day, index) => ({
    ...day,
    dayNumber: index + 1,
    date: format(addDays(startDate, index), 'yyyy-MM-dd'),
  }));

  const newTripEndDate = format(addDays(startDate, newDays.length - 1), 'yyyy-MM-dd');

  return { newDays, newDay, newTripEndDate };
}

/**
 * Removes a day from the itinerary.
 *
 * @param days - Current days array
 * @param dayId - ID of day to remove
 * @param moveActivitiesTo - 'previous' | 'next' | 'delete'
 * @param tripStartDate - Trip start date for recalculating dates
 * @returns Object with { newDays, orphanedActivities, newTripEndDate }
 *
 * ALGORITHM:
 * 1. Find day by ID
 * 2. Handle activities based on moveActivitiesTo option
 * 3. Remove day from array
 * 4. Recalculate dayNumbers and dates
 * 5. Calculate new trip end date
 *
 * EDGE CASES:
 * - Last day: Cannot move to 'next' (fallback to delete)
 * - First day: Cannot move to 'previous' (fallback to next or delete)
 * - Only day: Cannot remove (return unchanged)
 */
export function removeDay(
  days: DayItinerary[],
  dayId: string,
  moveActivitiesTo: 'previous' | 'next' | 'delete',
  tripStartDate: string
): { newDays: DayItinerary[]; orphanedActivities: Activity[]; newTripEndDate: string } {
  // Cannot remove the only day
  if (days.length <= 1) {
    console.warn('removeDay: Cannot remove the only day');
    return {
      newDays: days,
      orphanedActivities: [],
      newTripEndDate: days[0]?.date ?? tripStartDate,
    };
  }

  const dayIndex = days.findIndex(d => d.id === dayId);
  if (dayIndex === -1) {
    console.warn('removeDay: Day not found', dayId);
    return {
      newDays: days,
      orphanedActivities: [],
      newTripEndDate: days[days.length - 1].date,
    };
  }

  const dayToRemove = days[dayIndex];
  let orphanedActivities: Activity[] = [];
  let result = [...days];

  // Handle activities
  if (moveActivitiesTo === 'delete') {
    orphanedActivities = [...dayToRemove.activities];
  } else {
    const targetIndex = moveActivitiesTo === 'previous'
      ? Math.max(0, dayIndex - 1)
      : Math.min(days.length - 1, dayIndex + 1);

    // If trying to move to self (edge case), delete instead
    if (targetIndex === dayIndex) {
      orphanedActivities = [...dayToRemove.activities];
    } else {
      result[targetIndex] = {
        ...result[targetIndex],
        activities: [...result[targetIndex].activities, ...dayToRemove.activities],
      };
    }
  }

  // Remove the day
  result.splice(dayIndex, 1);

  // Recalculate dayNumbers and dates
  const startDate = parseISO(tripStartDate);
  const newDays = result.map((day, index) => ({
    ...day,
    dayNumber: index + 1,
    date: format(addDays(startDate, index), 'yyyy-MM-dd'),
  }));

  const newTripEndDate = format(addDays(startDate, newDays.length - 1), 'yyyy-MM-dd');

  return { newDays, orphanedActivities, newTripEndDate };
}

/**
 * Creates an undo snapshot of the current itinerary state.
 *
 * @param days - Current days array
 * @param description - Human-readable description of the operation
 * @returns ItinerarySnapshot for undo stack
 */
export function createSnapshot(
  days: DayItinerary[],
  description: string
): ItinerarySnapshot {
  const activitiesById: Record<string, Activity> = {};

  const daysSnapshot = days.map(day => {
    day.activities.forEach(activity => {
      activitiesById[activity.id] = activity;
    });

    return {
      id: day.id,
      dayNumber: day.dayNumber,
      date: day.date,
      activityIds: day.activities.map(a => a.id),
    };
  });

  return {
    timestamp: Date.now(),
    description,
    days: daysSnapshot,
    activitiesById,
  };
}

/**
 * Restores itinerary state from a snapshot.
 *
 * @param snapshot - Snapshot to restore from
 * @returns DayItinerary[] with full activity objects
 */
export function restoreFromSnapshot(snapshot: ItinerarySnapshot): DayItinerary[] {
  return snapshot.days.map(daySnapshot => ({
    id: daySnapshot.id,
    dayNumber: daySnapshot.dayNumber,
    date: daySnapshot.date,
    activities: daySnapshot.activityIds
      .map(id => snapshot.activitiesById[id])
      .filter(Boolean),  // Remove any undefined (shouldn't happen)
  }));
}
