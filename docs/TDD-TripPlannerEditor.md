# Technical Design Document: Interactive Trip Planner Editor

**Version**: 1.0
**Author**: Principal Software Architect
**Date**: 2025-12-31
**Target Implementer**: Junior Engineer (Claude 3.5 Sonnet)

---

## 1. Executive Summary

This document specifies the architecture for an **Interactive Trip Planner Editor** feature that transforms the existing read-only itinerary view into a fully editable, drag-and-drop interface optimized for collaborative planning sessions (e.g., displaying on a TV while a group makes real-time adjustments).

### Key Capabilities
- Drag-and-drop reordering of activities within and between days
- Drag-and-drop reordering of entire days
- Inline activity creation, editing, and deletion
- Day addition and removal
- Real-time visual feedback during all operations
- Touch-friendly for TV remotes and touch screens
- Keyboard accessibility for power users

---

## 2. File Structure

```
src/
├── components/
│   ├── planner/                          # NEW DIRECTORY
│   │   ├── PlannerView.tsx               # Main planner container
│   │   ├── PlannerToolbar.tsx            # Add day/activity controls
│   │   ├── DraggableDayColumn.tsx        # Day column with drag handle
│   │   ├── DraggableActivityCard.tsx     # Activity card with drag handle
│   │   ├── DropZone.tsx                  # Visual drop target indicator
│   │   ├── ActivityQuickAdd.tsx          # Inline activity creation
│   │   ├── DayQuickAdd.tsx               # Inline day creation
│   │   ├── PlannerDndContext.tsx         # DnD context provider wrapper
│   │   ├── EmptyDayPlaceholder.tsx       # Empty day visual
│   │   └── index.ts                      # Barrel exports
│   │
│   ├── modals/
│   │   └── ItineraryView.tsx             # MODIFY: Add "Edit Mode" toggle
│   │
│   └── layout/
│       └── MainContent.tsx               # MODIFY: Add 'planner' view mode
│
├── hooks/
│   ├── usePlannerDnd.ts                  # NEW: DnD state management
│   ├── usePlannerKeyboard.ts             # NEW: Keyboard shortcuts
│   └── usePlannerUndo.ts                 # NEW: Undo/redo stack
│
├── stores/
│   ├── tripStore.ts                      # MODIFY: Add reorder actions
│   ├── uiStore.ts                        # MODIFY: Add 'planner' viewMode
│   └── plannerStore.ts                   # NEW: Planner-specific UI state
│
├── services/
│   └── db/
│       └── tripRepository.ts             # MODIFY: Add reorder persistence
│
├── types/
│   ├── planner.ts                        # NEW: Planner-specific types
│   └── itinerary.ts                      # MODIFY: Add reorder types
│
└── utils/
    └── plannerUtils.ts                   # NEW: Reorder/date utilities
```

---

## 3. Data Models & Types

### 3.1 New Types (`src/types/planner.ts`)

```typescript
// ============================================
// DRAG-AND-DROP IDENTIFIERS
// ============================================

/**
 * Uniquely identifies a draggable item in the planner.
 * Format ensures no collision between activities and days.
 */
export type DraggableId =
  | `activity-${string}`  // activity-{activityId}
  | `day-${string}`;      // day-{dayId}

export type DroppableId =
  | `day-column-${string}`  // Accepts activities
  | 'day-container';        // Accepts days

/**
 * Discriminated union for drag item types.
 * Used by DnD handlers to determine operation type.
 */
export type DragItem =
  | { type: 'activity'; activityId: string; sourceDayId: string }
  | { type: 'day'; dayId: string };

/**
 * Result of a completed drag operation.
 * Contains all info needed to perform the reorder.
 */
export interface DragEndResult {
  item: DragItem;
  destination: {
    droppableId: DroppableId;
    index: number;
  } | null;
  source: {
    droppableId: DroppableId;
    index: number;
  };
}

// ============================================
// REORDER OPERATIONS
// ============================================

/**
 * Describes an activity position change.
 * Used for both in-day reordering and cross-day moves.
 */
export interface ActivityReorderOperation {
  activityId: string;
  sourceDayId: string;
  destinationDayId: string;
  sourceIndex: number;
  destinationIndex: number;
}

/**
 * Describes a day position change.
 */
export interface DayReorderOperation {
  dayId: string;
  sourceIndex: number;
  destinationIndex: number;
}

// ============================================
// UNDO/REDO SYSTEM
// ============================================

/**
 * Snapshot of itinerary state for undo/redo.
 * Stores minimal data needed to restore state.
 */
export interface ItinerarySnapshot {
  timestamp: number;
  description: string;  // Human-readable: "Moved Beach Day to Day 3"
  days: Array<{
    id: string;
    dayNumber: number;
    date: string;
    activityIds: string[];  // Just IDs, activities stored in separate map
  }>;
  activitiesById: Record<string, Activity>;
}

/**
 * Undo/redo stack state.
 */
export interface UndoStack {
  past: ItinerarySnapshot[];
  future: ItinerarySnapshot[];
  maxSize: number;  // Default: 50
}

// ============================================
// PLANNER UI STATE
// ============================================

/**
 * Transient state for the planner view.
 * Not persisted - resets on navigation away.
 */
export interface PlannerUIState {
  // Currently dragging item
  activeDragItem: DragItem | null;

  // Currently hovered drop target
  hoveredDropTarget: DroppableId | null;

  // Quick-add form states
  quickAddDayPosition: 'start' | 'end' | number | null;  // null = closed
  quickAddActivityDayId: string | null;  // null = closed

  // Selection for multi-select operations (future)
  selectedActivityIds: Set<string>;
  selectedDayIds: Set<string>;

  // Edit mode states
  editingActivityId: string | null;  // Inline editing
  editingDayId: string | null;       // Day title/date editing

  // Confirmation dialogs
  pendingDeleteDayId: string | null;
  pendingDeleteActivityId: string | null;
}

// ============================================
// COMPONENT PROPS INTERFACES
// ============================================

export interface DraggableDayColumnProps {
  day: DayItinerary;
  index: number;
  isActive: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
}

export interface DraggableActivityCardProps {
  activity: Activity;
  dayId: string;
  index: number;
  isDragging: boolean;
  isEditing: boolean;
}

export interface DropZoneProps {
  droppableId: DroppableId;
  index: number;
  isActive: boolean;
  orientation: 'horizontal' | 'vertical';
  label?: string;
}

export interface ActivityQuickAddProps {
  dayId: string;
  onSubmit: (activity: Partial<Activity>) => void;
  onCancel: () => void;
  defaultTime?: string;
}

export interface DayQuickAddProps {
  position: 'start' | 'end' | number;
  onSubmit: (date: string) => void;
  onCancel: () => void;
  suggestedDate: string;
}
```

### 3.2 Modified Types (`src/types/itinerary.ts`)

```typescript
// ADD to existing file:

/**
 * Sync action types for planner operations.
 * Extend existing SyncAction union type.
 */
export type PlannerSyncAction =
  | 'reorder_activities'
  | 'move_activity'
  | 'reorder_days'
  | 'add_day'
  | 'remove_day';

/**
 * Payload for activity reorder sync.
 */
export interface ReorderActivitiesPayload {
  tripId: TripId;
  dayId: string;
  activityIds: string[];  // New order
}

/**
 * Payload for cross-day activity move.
 */
export interface MoveActivityPayload {
  tripId: TripId;
  activityId: string;
  sourceDayId: string;
  destinationDayId: string;
  destinationIndex: number;
}

/**
 * Payload for day reorder sync.
 */
export interface ReorderDaysPayload {
  tripId: TripId;
  dayIds: string[];  // New order (IDs only, dayNumbers will be recalculated)
}

/**
 * Payload for day addition.
 */
export interface AddDayPayload {
  tripId: TripId;
  day: DayItinerary;
  position: number;  // Insert index
}

/**
 * Payload for day removal.
 */
export interface RemoveDayPayload {
  tripId: TripId;
  dayId: string;
  deleteActivities: boolean;  // true = delete, false = move to adjacent day
}
```

---

## 4. Core Logic & Algorithms

### 4.1 Activity Reorder Algorithm (`src/utils/plannerUtils.ts`)

```typescript
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
 * @param date - Date for the new day (ISO string)
 * @param tripStartDate - Trip start date for recalculating all dates
 * @returns Object with { newDays, newDay, updatedTripEndDate }
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
```

### 4.2 Drag-and-Drop Handler Logic (`src/hooks/usePlannerDnd.ts`)

```typescript
/**
 * Core drag-end handler that determines operation type and dispatches action.
 *
 * ALGORITHM:
 * 1. Check if destination is null (dropped outside) - abort
 * 2. Parse draggableId to determine item type (activity vs day)
 * 3. Parse droppableId to determine destination type
 * 4. Route to appropriate handler:
 *    - Activity to same day column: reorder within day
 *    - Activity to different day column: move between days
 *    - Day to day container: reorder days
 * 5. Create undo snapshot BEFORE mutation
 * 6. Dispatch mutation action
 * 7. Enqueue sync operation
 */
function handleDragEnd(result: DragEndResult): void {
  const { item, destination, source } = result;

  // Dropped outside any droppable
  if (!destination) {
    setPlannerState({ activeDragItem: null });
    return;
  }

  // Same position - no-op
  if (
    source.droppableId === destination.droppableId &&
    source.index === destination.index
  ) {
    setPlannerState({ activeDragItem: null });
    return;
  }

  // Create undo snapshot before mutation
  const currentDays = tripStore.getState().activeTrip?.itinerary.days ?? [];

  if (item.type === 'activity') {
    handleActivityDrag(item, source, destination, currentDays);
  } else if (item.type === 'day') {
    handleDayDrag(item, source, destination, currentDays);
  }

  setPlannerState({ activeDragItem: null });
}

function handleActivityDrag(
  item: { type: 'activity'; activityId: string; sourceDayId: string },
  source: { droppableId: DroppableId; index: number },
  destination: { droppableId: DroppableId; index: number },
  currentDays: DayItinerary[]
): void {
  const sourceDayId = item.sourceDayId;
  const destDayId = (destination.droppableId as string).replace('day-column-', '');

  // Save undo snapshot
  undoStack.push(createSnapshot(currentDays, `Move activity`));

  if (sourceDayId === destDayId) {
    // Same day reorder
    tripStore.getState().reorderActivitiesInDay(
      sourceDayId,
      source.index,
      destination.index
    );
  } else {
    // Cross-day move
    tripStore.getState().moveActivityBetweenDays(
      item.activityId,
      sourceDayId,
      destDayId,
      destination.index
    );
  }
}

function handleDayDrag(
  item: { type: 'day'; dayId: string },
  source: { droppableId: DroppableId; index: number },
  destination: { droppableId: DroppableId; index: number },
  currentDays: DayItinerary[]
): void {
  // Save undo snapshot
  undoStack.push(createSnapshot(currentDays, `Reorder Day ${source.index + 1} to Day ${destination.index + 1}`));

  tripStore.getState().reorderDays(source.index, destination.index);
}
```

---

## 5. API Contracts

### 5.1 Store Actions (Add to `src/stores/tripStore.ts`)

```typescript
interface TripStoreActions {
  // ... existing actions ...

  // NEW: Activity reorder within a day
  reorderActivitiesInDay: (
    dayId: string,
    sourceIndex: number,
    destinationIndex: number
  ) => void;

  // NEW: Move activity between days
  moveActivityBetweenDays: (
    activityId: string,
    sourceDayId: string,
    destinationDayId: string,
    destinationIndex: number
  ) => void;

  // NEW: Reorder days in itinerary
  reorderDays: (
    sourceIndex: number,
    destinationIndex: number
  ) => void;

  // NEW: Add day at position
  addDayAtPosition: (
    position: number
  ) => DayItinerary;  // Returns the new day

  // NEW: Remove day with activity handling
  removeDayById: (
    dayId: string,
    activityHandling: 'previous' | 'next' | 'delete'
  ) => void;

  // NEW: Batch update for undo/redo
  replaceItineraryDays: (
    days: DayItinerary[]
  ) => void;
}
```

### 5.2 Planner Store (`src/stores/plannerStore.ts`)

```typescript
import { create } from 'zustand';
import type { PlannerUIState, DragItem, DroppableId } from '../types/planner';

interface PlannerStore extends PlannerUIState {
  // Drag state
  setActiveDragItem: (item: DragItem | null) => void;
  setHoveredDropTarget: (target: DroppableId | null) => void;

  // Quick-add forms
  openDayQuickAdd: (position: 'start' | 'end' | number) => void;
  closeDayQuickAdd: () => void;
  openActivityQuickAdd: (dayId: string) => void;
  closeActivityQuickAdd: () => void;

  // Selection
  toggleActivitySelection: (activityId: string) => void;
  toggleDaySelection: (dayId: string) => void;
  clearSelection: () => void;

  // Editing
  setEditingActivity: (activityId: string | null) => void;
  setEditingDay: (dayId: string | null) => void;

  // Deletion confirmation
  setPendingDeleteDay: (dayId: string | null) => void;
  setPendingDeleteActivity: (activityId: string | null) => void;

  // Reset
  resetPlannerState: () => void;
}

const initialState: PlannerUIState = {
  activeDragItem: null,
  hoveredDropTarget: null,
  quickAddDayPosition: null,
  quickAddActivityDayId: null,
  selectedActivityIds: new Set(),
  selectedDayIds: new Set(),
  editingActivityId: null,
  editingDayId: null,
  pendingDeleteDayId: null,
  pendingDeleteActivityId: null,
};

export const usePlannerStore = create<PlannerStore>()((set, get) => ({
  ...initialState,

  setActiveDragItem: (item) => set({ activeDragItem: item }),
  setHoveredDropTarget: (target) => set({ hoveredDropTarget: target }),

  openDayQuickAdd: (position) => set({
    quickAddDayPosition: position,
    quickAddActivityDayId: null,  // Close activity form
  }),
  closeDayQuickAdd: () => set({ quickAddDayPosition: null }),

  openActivityQuickAdd: (dayId) => set({
    quickAddActivityDayId: dayId,
    quickAddDayPosition: null,  // Close day form
  }),
  closeActivityQuickAdd: () => set({ quickAddActivityDayId: null }),

  toggleActivitySelection: (activityId) => {
    const current = get().selectedActivityIds;
    const next = new Set(current);
    if (next.has(activityId)) {
      next.delete(activityId);
    } else {
      next.add(activityId);
    }
    set({ selectedActivityIds: next });
  },

  toggleDaySelection: (dayId) => {
    const current = get().selectedDayIds;
    const next = new Set(current);
    if (next.has(dayId)) {
      next.delete(dayId);
    } else {
      next.add(dayId);
    }
    set({ selectedDayIds: next });
  },

  clearSelection: () => set({
    selectedActivityIds: new Set(),
    selectedDayIds: new Set(),
  }),

  setEditingActivity: (activityId) => set({ editingActivityId: activityId }),
  setEditingDay: (dayId) => set({ editingDayId: dayId }),

  setPendingDeleteDay: (dayId) => set({ pendingDeleteDayId: dayId }),
  setPendingDeleteActivity: (activityId) => set({ pendingDeleteActivityId: activityId }),

  resetPlannerState: () => set(initialState),
}));
```

### 5.3 Component Function Signatures

```typescript
// PlannerView.tsx - Main container
interface PlannerViewProps {
  tripId: TripId;
}
export function PlannerView({ tripId }: PlannerViewProps): React.ReactElement;

// PlannerToolbar.tsx - Top action bar
interface PlannerToolbarProps {
  onAddDayStart: () => void;
  onAddDayEnd: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}
export function PlannerToolbar(props: PlannerToolbarProps): React.ReactElement;

// DraggableDayColumn.tsx
export function DraggableDayColumn(props: DraggableDayColumnProps): React.ReactElement;

// DraggableActivityCard.tsx
export function DraggableActivityCard(props: DraggableActivityCardProps): React.ReactElement;

// DropZone.tsx - Visual indicator for drop targets
export function DropZone(props: DropZoneProps): React.ReactElement;

// ActivityQuickAdd.tsx - Inline activity creation form
export function ActivityQuickAdd(props: ActivityQuickAddProps): React.ReactElement;

// DayQuickAdd.tsx - Inline day creation form
export function DayQuickAdd(props: DayQuickAddProps): React.ReactElement;

// EmptyDayPlaceholder.tsx - Empty day visual
interface EmptyDayPlaceholderProps {
  dayId: string;
  onAddActivity: () => void;
}
export function EmptyDayPlaceholder(props: EmptyDayPlaceholderProps): React.ReactElement;
```

### 5.4 Hook Signatures

```typescript
// usePlannerDnd.ts
interface UsePlannerDndReturn {
  sensors: SensorDescriptor<SensorOptions>[];
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
  activeDragItem: DragItem | null;
  activeDropTarget: DroppableId | null;
}
export function usePlannerDnd(): UsePlannerDndReturn;

// usePlannerKeyboard.ts
interface UsePlannerKeyboardOptions {
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onEscape: () => void;
  onSelectAll: () => void;
}
export function usePlannerKeyboard(options: UsePlannerKeyboardOptions): void;

// usePlannerUndo.ts
interface UsePlannerUndoReturn {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pushSnapshot: (description: string) => void;
  clear: () => void;
}
export function usePlannerUndo(): UsePlannerUndoReturn;
```

---

## 6. Edge Cases & Error Handling

### 6.1 Critical Edge Cases

#### Edge Case 1: Dragging to Empty Day
**Scenario**: User drags an activity to a day with no existing activities.

**Problem**: Without activities, there's no drop zone rendered by activity cards.

**Solution**:
- Render `EmptyDayPlaceholder` component when `day.activities.length === 0`
- The entire placeholder is a droppable zone
- On drop, activity becomes index 0 in that day's array

```typescript
// In DraggableDayColumn.tsx
{day.activities.length === 0 ? (
  <Droppable id={`day-column-${day.id}`}>
    <EmptyDayPlaceholder
      dayId={day.id}
      onAddActivity={() => openActivityQuickAdd(day.id)}
    />
  </Droppable>
) : (
  <SortableContext items={day.activities.map(a => `activity-${a.id}`)}>
    {day.activities.map((activity, index) => (
      <DraggableActivityCard key={activity.id} {...} />
    ))}
  </SortableContext>
)}
```

#### Edge Case 2: Removing the Last Day
**Scenario**: User attempts to delete the only remaining day in the trip.

**Problem**: Trip cannot exist without at least one day (data model constraint).

**Solution**:
- Disable delete button when `days.length === 1`
- Show tooltip: "Cannot delete the only day. Add another day first."
- In `removeDay()` utility, return unchanged array with console warning

```typescript
// In DraggableDayColumn.tsx
const canDelete = days.length > 1;

<Button
  onClick={() => setPendingDeleteDay(day.id)}
  disabled={!canDelete}
  title={canDelete ? 'Delete day' : 'Cannot delete the only day'}
>
  <Trash2 />
</Button>
```

#### Edge Case 3: Rapid Successive Drags
**Scenario**: User quickly drags and drops multiple items before previous operations complete.

**Problem**: State updates may conflict, causing stale data in drag handlers.

**Solution**:
- Use `flushSync` from React to force synchronous updates after each drop
- Debounce sync queue operations (already implemented)
- Use optimistic updates with rollback on error

```typescript
// In handleDragEnd
import { flushSync } from 'react-dom';

function handleDragEnd(result: DragEndResult): void {
  // ... validation ...

  // Force synchronous state update
  flushSync(() => {
    if (item.type === 'activity') {
      tripStore.getState().reorderActivitiesInDay(...);
    }
  });

  // Continue with next operation
  setPlannerState({ activeDragItem: null });
}
```

#### Edge Case 4: Activity Time Conflicts After Move
**Scenario**: Moving an activity to a new day creates a time overlap with existing activities.

**Problem**: Activity at 2:00 PM moved to a day that already has activity at 2:00 PM.

**Solution**:
- Allow the move (times are suggestions, not constraints)
- Visually indicate overlap with amber/yellow highlight
- Toast notification: "Note: This activity overlaps with [Activity Name]"
- Future enhancement: Auto-suggest time adjustment

```typescript
// In moveActivityBetweenDays handler
const destActivities = days.find(d => d.id === destDayId)?.activities ?? [];
const movedActivity = currentDays
  .flatMap(d => d.activities)
  .find(a => a.id === activityId);

if (movedActivity?.time) {
  const overlapping = destActivities.find(a => a.time === movedActivity.time);
  if (overlapping) {
    toast.info(`Note: Overlaps with "${overlapping.description}" at ${overlapping.time}`);
  }
}
```

#### Edge Case 5: Offline Drag Operations
**Scenario**: User reorders activities while offline.

**Problem**: Changes need to persist and sync when back online.

**Solution**:
- IndexedDB write happens immediately (existing pattern)
- Sync queue captures operation with payload
- On reconnect, sync service processes queue
- Conflict resolution: last-write-wins with timestamp

```typescript
// Already handled by existing sync architecture
// New sync actions added to queue:
enqueueSyncAction({
  action: 'reorder_activities',
  payload: {
    tripId,
    dayId,
    activityIds: newOrder.map(a => a.id),
  },
});
```

#### Edge Case 6: Touch Drag on Mobile/TV
**Scenario**: User attempts drag on touch device or TV with touch remote.

**Problem**: Touch events need different handling than mouse events.

**Solution**:
- Use `@dnd-kit` which has built-in touch support
- Configure sensors for both pointer and touch
- Add `touchAction: 'none'` to draggable elements
- Increase drag handle size for touch (min 44px)

```typescript
// In usePlannerDnd.ts
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,  // 8px before drag starts
    },
  }),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,   // 250ms long press to start drag
      tolerance: 5, // 5px movement tolerance during delay
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

### 6.2 Error Handling Strategy

```typescript
// Wrap all store actions with error boundary
function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  actionName: string
): T {
  return ((...args: Parameters<T>) => {
    try {
      return fn(...args);
    } catch (error) {
      console.error(`[Planner] ${actionName} failed:`, error);
      toast.error(`Failed to ${actionName.toLowerCase()}. Please try again.`);

      // Attempt recovery by reloading from IndexedDB
      tripStore.getState().loadTrips();
    }
  }) as T;
}
```

---

## 7. Implementation Steps

Follow these steps in order. Each step should be completed and tested before moving to the next.

### Phase 1: Foundation (Steps 1-4)

#### Step 1: Install Dependencies
```bash
npm install @dnd-kit/core@6.1.0 @dnd-kit/sortable@8.0.0 @dnd-kit/utilities@3.2.2
```

**Files touched**: `package.json`, `package-lock.json`

**Verification**: Run `npm ls @dnd-kit/core` to confirm installation.

---

#### Step 2: Create Type Definitions
Create `src/types/planner.ts` with all type definitions from Section 3.1.

**Files created**: `src/types/planner.ts`

**Verification**: Run `npx tsc --noEmit` to ensure no type errors.

---

#### Step 3: Create Planner Utilities
Create `src/utils/plannerUtils.ts` with all utility functions from Section 4.1.

**Files created**: `src/utils/plannerUtils.ts`

**Verification**: Write unit tests for each function:
- `reorderActivities`: same position, different positions, out of bounds
- `moveActivityBetweenDays`: basic move, empty destination
- `reorderDays`: verify dayNumber and date recalculation
- `addDay`: verify all days renumbered, trip end date updated
- `removeDay`: test all activity handling modes, edge case of single day

---

#### Step 4: Create Planner Store
Create `src/stores/plannerStore.ts` with state and actions from Section 5.2.

**Files created**: `src/stores/plannerStore.ts`

**Verification**: Import store in a test component and verify all actions work.

---

### Phase 2: Store Integration (Steps 5-6)

#### Step 5: Extend Trip Store
Add new actions to `src/stores/tripStore.ts`:

1. Add `reorderActivitiesInDay` action:
```typescript
reorderActivitiesInDay: (dayId, sourceIndex, destinationIndex) => {
  const { activeTrip } = get();
  if (!activeTrip) return;

  const dayIndex = activeTrip.itinerary.days.findIndex(d => d.id === dayId);
  if (dayIndex === -1) return;

  const currentDay = activeTrip.itinerary.days[dayIndex];
  const newActivities = reorderActivities(currentDay.activities, sourceIndex, destinationIndex);

  // Update state
  const newDays = [...activeTrip.itinerary.days];
  newDays[dayIndex] = { ...currentDay, activities: newActivities };

  // Persist and sync
  const updatedTrip = {
    ...activeTrip,
    itinerary: { ...activeTrip.itinerary, days: newDays },
    updatedAt: new Date().toISOString(),
  };

  set({ activeTrip: updatedTrip });
  tripRepository.update(activeTrip.id, updatedTrip);
  enqueueSyncAction('reorder_activities', { tripId: activeTrip.id, dayId, activityIds: newActivities.map(a => a.id) });
}
```

2. Add `moveActivityBetweenDays` action (similar pattern)
3. Add `reorderDays` action
4. Add `addDayAtPosition` action
5. Add `removeDayById` action
6. Add `replaceItineraryDays` action (for undo/redo)

**Files modified**: `src/stores/tripStore.ts`

**Verification**: Test each action via browser console:
```javascript
// In browser console after app loads
useTripStore.getState().reorderActivitiesInDay('day-id', 0, 2);
```

---

#### Step 6: Extend UI Store
Add `'planner'` to the `viewMode` type in `src/stores/uiStore.ts`:

```typescript
// Change this line:
viewMode: 'today' | 'overview' | 'day' | 'travel' | 'country' | 'trips' | 'budget' | 'packing' | 'photos'

// To:
viewMode: 'today' | 'overview' | 'day' | 'travel' | 'country' | 'trips' | 'budget' | 'packing' | 'photos' | 'planner'
```

**Files modified**: `src/stores/uiStore.ts`

---

### Phase 3: DnD Infrastructure (Steps 7-9)

#### Step 7: Create DnD Context Provider
Create `src/components/planner/PlannerDndContext.tsx`:

```typescript
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface PlannerDndContextProps {
  children: React.ReactNode;
}

export function PlannerDndContext({ children }: PlannerDndContextProps) {
  const {
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    activeDragItem
  } = usePlannerDnd();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay>
        {activeDragItem?.type === 'activity' && (
          <ActivityCardOverlay activityId={activeDragItem.activityId} />
        )}
        {activeDragItem?.type === 'day' && (
          <DayColumnOverlay dayId={activeDragItem.dayId} />
        )}
      </DragOverlay>
    </DndContext>
  );
}
```

**Files created**: `src/components/planner/PlannerDndContext.tsx`

---

#### Step 8: Create usePlannerDnd Hook
Create `src/hooks/usePlannerDnd.ts` implementing the logic from Section 4.2.

**Files created**: `src/hooks/usePlannerDnd.ts`

**Verification**: Console log drag events to verify handler invocation.

---

#### Step 9: Create usePlannerUndo Hook
Create `src/hooks/usePlannerUndo.ts`:

```typescript
import { useState, useCallback, useRef } from 'react';
import { useTripStore } from '../stores/tripStore';
import { createSnapshot, restoreFromSnapshot } from '../utils/plannerUtils';
import type { ItinerarySnapshot, UndoStack } from '../types/planner';

const MAX_UNDO_SIZE = 50;

export function usePlannerUndo() {
  const stackRef = useRef<UndoStack>({
    past: [],
    future: [],
    maxSize: MAX_UNDO_SIZE,
  });

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const { activeTrip, replaceItineraryDays } = useTripStore();

  const pushSnapshot = useCallback((description: string) => {
    if (!activeTrip) return;

    const snapshot = createSnapshot(activeTrip.itinerary.days, description);
    const stack = stackRef.current;

    stack.past.push(snapshot);
    if (stack.past.length > stack.maxSize) {
      stack.past.shift();
    }
    stack.future = [];  // Clear redo stack on new action

    setCanUndo(stack.past.length > 0);
    setCanRedo(false);
  }, [activeTrip]);

  const undo = useCallback(() => {
    if (!activeTrip) return;

    const stack = stackRef.current;
    if (stack.past.length === 0) return;

    // Save current state to future
    const currentSnapshot = createSnapshot(activeTrip.itinerary.days, 'Current state');
    stack.future.push(currentSnapshot);

    // Restore previous state
    const previousSnapshot = stack.past.pop()!;
    const restoredDays = restoreFromSnapshot(previousSnapshot);
    replaceItineraryDays(restoredDays);

    setCanUndo(stack.past.length > 0);
    setCanRedo(stack.future.length > 0);
  }, [activeTrip, replaceItineraryDays]);

  const redo = useCallback(() => {
    if (!activeTrip) return;

    const stack = stackRef.current;
    if (stack.future.length === 0) return;

    // Save current state to past
    const currentSnapshot = createSnapshot(activeTrip.itinerary.days, 'Current state');
    stack.past.push(currentSnapshot);

    // Restore future state
    const nextSnapshot = stack.future.pop()!;
    const restoredDays = restoreFromSnapshot(nextSnapshot);
    replaceItineraryDays(restoredDays);

    setCanUndo(stack.past.length > 0);
    setCanRedo(stack.future.length > 0);
  }, [activeTrip, replaceItineraryDays]);

  const clear = useCallback(() => {
    stackRef.current = { past: [], future: [], maxSize: MAX_UNDO_SIZE };
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return { undo, redo, canUndo, canRedo, pushSnapshot, clear };
}
```

**Files created**: `src/hooks/usePlannerUndo.ts`

---

### Phase 4: Core Components (Steps 10-15)

#### Step 10: Create DraggableActivityCard Component
Create `src/components/planner/DraggableActivityCard.tsx`:

Key requirements:
- Use `useSortable` from `@dnd-kit/sortable`
- Drag handle on left side (grip icon)
- Activity type color indicator
- Time and description display
- Edit and delete buttons on hover/focus
- Visual states: normal, dragging, drop-target

```typescript
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';

export function DraggableActivityCard({
  activity,
  dayId,
  index,
  isDragging,
  isEditing
}: DraggableActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `activity-${activity.id}`,
    data: { type: 'activity', activityId: activity.id, sourceDayId: dayId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  // ... render card with drag handle
}
```

**Files created**: `src/components/planner/DraggableActivityCard.tsx`

---

#### Step 11: Create DraggableDayColumn Component
Create `src/components/planner/DraggableDayColumn.tsx`:

Key requirements:
- Day header with dayNumber, date, drag handle
- Droppable zone for activities
- SortableContext wrapping activity cards
- Add activity button at bottom
- Delete day button in header
- Visual states: normal, dragging, drop-target

**Files created**: `src/components/planner/DraggableDayColumn.tsx`

---

#### Step 12: Create DropZone Component
Create `src/components/planner/DropZone.tsx`:

Visual indicator that appears between items during drag:
- Horizontal line (between days) or vertical line (between activities)
- Animated pulse when active
- Appropriate spacing so it doesn't disrupt layout

**Files created**: `src/components/planner/DropZone.tsx`

---

#### Step 13: Create ActivityQuickAdd Component
Create `src/components/planner/ActivityQuickAdd.tsx`:

Inline form for quick activity creation:
- Time input (optional)
- Description input (required)
- Type selector (food/lodging/activity/travel)
- Location autocomplete (optional, uses existing PlacesAutocomplete)
- Submit and cancel buttons

**Files created**: `src/components/planner/ActivityQuickAdd.tsx`

---

#### Step 14: Create DayQuickAdd Component
Create `src/components/planner/DayQuickAdd.tsx`:

Inline form for adding a day:
- Shows suggested date based on position
- Optional date override
- Submit and cancel buttons

**Files created**: `src/components/planner/DayQuickAdd.tsx`

---

#### Step 15: Create PlannerToolbar Component
Create `src/components/planner/PlannerToolbar.tsx`:

Top action bar with:
- "Add Day at Start" button
- "Add Day at End" button
- Undo button (with keyboard shortcut hint)
- Redo button (with keyboard shortcut hint)
- View toggle (switch to read-only view)

**Files created**: `src/components/planner/PlannerToolbar.tsx`

---

### Phase 5: Main View Assembly (Steps 16-18)

#### Step 16: Create PlannerView Main Component
Create `src/components/planner/PlannerView.tsx`:

Main container that assembles all parts:
- PlannerToolbar at top
- Horizontal scrolling container for day columns
- PlannerDndContext wrapper
- SortableContext for days
- Maps day array to DraggableDayColumn components
- Handles quick-add overlays

```typescript
export function PlannerView({ tripId }: PlannerViewProps) {
  const { activeTrip } = useTripStore();
  const { undo, redo, canUndo, canRedo, pushSnapshot } = usePlannerUndo();
  const plannerStore = usePlannerStore();

  usePlannerKeyboard({
    onUndo: undo,
    onRedo: redo,
    onDelete: handleDelete,
    onEscape: handleEscape,
    onSelectAll: handleSelectAll,
  });

  if (!activeTrip) return <LoadingSpinner />;

  const days = activeTrip.itinerary.days;

  return (
    <div className="flex flex-col h-full">
      <PlannerToolbar
        onAddDayStart={() => plannerStore.openDayQuickAdd('start')}
        onAddDayEnd={() => plannerStore.openDayQuickAdd('end')}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <PlannerDndContext>
        <div className="flex-1 overflow-x-auto px-4 py-6">
          <SortableContext
            items={days.map(d => `day-${d.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-4 min-w-max">
              {plannerStore.quickAddDayPosition === 'start' && (
                <DayQuickAdd
                  position="start"
                  suggestedDate={/* calculate */}
                  onSubmit={handleAddDay}
                  onCancel={plannerStore.closeDayQuickAdd}
                />
              )}

              {days.map((day, index) => (
                <DraggableDayColumn
                  key={day.id}
                  day={day}
                  index={index}
                  isActive={plannerStore.activeDragItem?.type === 'day' && plannerStore.activeDragItem.dayId === day.id}
                  isDragging={/* ... */}
                  isDropTarget={/* ... */}
                />
              ))}

              {plannerStore.quickAddDayPosition === 'end' && (
                <DayQuickAdd
                  position="end"
                  suggestedDate={/* calculate */}
                  onSubmit={handleAddDay}
                  onCancel={plannerStore.closeDayQuickAdd}
                />
              )}
            </div>
          </SortableContext>
        </div>
      </PlannerDndContext>

      {/* Confirmation dialogs */}
      {plannerStore.pendingDeleteDayId && (
        <ConfirmDeleteDayDialog ... />
      )}
    </div>
  );
}
```

**Files created**: `src/components/planner/PlannerView.tsx`

---

#### Step 17: Create Barrel Export
Create `src/components/planner/index.ts`:

```typescript
export { PlannerView } from './PlannerView';
export { PlannerToolbar } from './PlannerToolbar';
export { DraggableDayColumn } from './DraggableDayColumn';
export { DraggableActivityCard } from './DraggableActivityCard';
export { DropZone } from './DropZone';
export { ActivityQuickAdd } from './ActivityQuickAdd';
export { DayQuickAdd } from './DayQuickAdd';
export { PlannerDndContext } from './PlannerDndContext';
export { EmptyDayPlaceholder } from './EmptyDayPlaceholder';
```

**Files created**: `src/components/planner/index.ts`

---

#### Step 18: Integrate PlannerView into MainContent
Modify `src/components/layout/MainContent.tsx`:

1. Import PlannerView component
2. Add case for `'planner'` viewMode
3. Render PlannerView when in planner mode

```typescript
// Add import
import { PlannerView } from '../planner';

// In the render switch/conditional
case 'planner':
  return <PlannerView tripId={activeTripId} />;
```

**Files modified**: `src/components/layout/MainContent.tsx`

---

### Phase 6: Navigation & Polish (Steps 19-21)

#### Step 19: Add Planner Entry Point
Modify `src/components/modals/ItineraryView.tsx`:

Add a button to switch to planner mode:

```typescript
// In header area
<button
  onClick={() => setViewMode('planner')}
  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
>
  <Edit3 size={16} />
  <span>Edit Trip</span>
</button>
```

**Files modified**: `src/components/modals/ItineraryView.tsx`

---

#### Step 20: Create Keyboard Shortcuts Hook
Create `src/hooks/usePlannerKeyboard.ts`:

```typescript
import { useEffect } from 'react';

export function usePlannerKeyboard({
  onUndo,
  onRedo,
  onDelete,
  onEscape,
  onSelectAll,
}: UsePlannerKeyboardOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if in input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + Z = Undo
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      }

      // Cmd/Ctrl + Shift + Z = Redo (or Cmd/Ctrl + Y)
      if ((isMod && e.key === 'z' && e.shiftKey) || (isMod && e.key === 'y')) {
        e.preventDefault();
        onRedo();
      }

      // Delete or Backspace = Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete();
      }

      // Escape = Clear selection / close forms
      if (e.key === 'Escape') {
        onEscape();
      }

      // Cmd/Ctrl + A = Select all in current context
      if (isMod && e.key === 'a') {
        e.preventDefault();
        onSelectAll();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, onDelete, onEscape, onSelectAll]);
}
```

**Files created**: `src/hooks/usePlannerKeyboard.ts`

---

#### Step 21: Style & Polish
Add Tailwind styles for planner-specific states:

1. Drag overlay shadow and scale
2. Drop zone pulse animation
3. Day column border when drop target
4. Activity card lift effect when dragging
5. Smooth transitions

Add to `tailwind.config.js` if needed:
```javascript
// In theme.extend.animation
'pulse-drop': 'pulse-drop 1s ease-in-out infinite',

// In theme.extend.keyframes
'pulse-drop': {
  '0%, 100%': { opacity: '0.5' },
  '50%': { opacity: '1' },
},
```

**Files modified**: `tailwind.config.js`, various component files

---

### Phase 7: Testing & Verification (Step 22)

#### Step 22: Manual Testing Checklist

Run through each scenario and verify correct behavior:

**Drag-and-Drop**
- [ ] Drag activity up/down within same day
- [ ] Drag activity to a different day
- [ ] Drag activity to an empty day
- [ ] Drag day left/right to reorder
- [ ] Cancel drag (press Escape or drop outside)
- [ ] Verify dates recalculate after day reorder

**Quick Add**
- [ ] Add day at start
- [ ] Add day at end
- [ ] Add activity to existing day
- [ ] Cancel quick-add forms

**Delete**
- [ ] Delete activity
- [ ] Delete day (move activities to previous)
- [ ] Delete day (move activities to next)
- [ ] Delete day (delete activities)
- [ ] Cannot delete only remaining day

**Undo/Redo**
- [ ] Undo after reorder
- [ ] Redo after undo
- [ ] Keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)
- [ ] Undo stack limit (50 operations)

**Touch Support**
- [ ] Long press to drag on touch device
- [ ] Touch targets minimum 44px

**Persistence**
- [ ] Changes persist after page refresh
- [ ] Changes sync to Firebase (when online)
- [ ] Offline changes queue and sync when online

---

## 8. Dependency Versions (Lock File)

```json
{
  "@dnd-kit/core": "6.1.0",
  "@dnd-kit/sortable": "8.0.0",
  "@dnd-kit/utilities": "3.2.2"
}
```

These versions are compatible with React 19 and have been tested together.

---

## 9. Architectural Decisions & Notes

### Decision 1: @dnd-kit over react-beautiful-dnd
**Choice**: `@dnd-kit` library suite
**Rationale**:
- `react-beautiful-dnd` is deprecated and not maintained
- `@dnd-kit` is actively maintained with React 19 support
- Better accessibility and touch support out of the box
- More flexible for complex nested sortable scenarios

### Decision 2: Horizontal Day Layout
**Choice**: Days scroll horizontally, activities stack vertically within days
**Rationale**:
- Matches mental model of timeline progression (left-to-right)
- Works well on TV displays (wide aspect ratio)
- Each day column fits comfortably on screen
- Standard pattern in Kanban/Trello-style boards

### Decision 3: Optimistic Updates
**Choice**: Update UI immediately, sync in background
**Rationale**:
- Existing app pattern (offline-first)
- Better perceived performance
- Sync queue handles eventual consistency
- Rollback on persistent failure (existing pattern)

### Decision 4: Day Dates Auto-Recalculate
**Choice**: Reordering days recalculates all dates from trip start
**Rationale**:
- Days represent sequential progression
- User expects "Day 3" to always be third chronologically
- Alternative (keeping original dates) would break the date sequence
- Clear behavior: dragging changes position, dates adjust

### Decision 5: No Multi-Select in V1
**Choice**: Single-item drag only for initial implementation
**Rationale**:
- Significantly simpler implementation
- Covers 90% of use cases
- Multi-select can be added as enhancement
- Types already support it (future-proofing)

---

## 10. Future Enhancements (Out of Scope)

The following features are explicitly out of scope for this implementation but the architecture supports them:

1. **Multi-Select Drag**: Select multiple activities/days and drag as group
2. **Time Auto-Adjustment**: Intelligently adjust activity times when moved
3. **Conflict Detection**: Warn about overlapping activities
4. **Template Days**: Save and reuse day templates
5. **Bulk Import**: Add multiple activities at once
6. **Activity Splitting**: Split long activities into multiple parts
7. **Cross-Trip Copy**: Copy activities from other trips
8. **Real-Time Collaboration**: Multiple users editing simultaneously

---

## 11. Acceptance Criteria

The feature is complete when:

1. **Functional**
   - [ ] Activities can be reordered within a day via drag-and-drop
   - [ ] Activities can be moved between days via drag-and-drop
   - [ ] Days can be reordered via drag-and-drop
   - [ ] New days can be added at start or end
   - [ ] Days can be deleted with activity handling options
   - [ ] New activities can be added inline
   - [ ] All changes persist to IndexedDB
   - [ ] All changes sync to Firebase when online

2. **UI/UX**
   - [ ] Visual feedback during drag operations
   - [ ] Drop zones clearly indicated
   - [ ] Touch-friendly (44px minimum touch targets)
   - [ ] Keyboard accessible (Tab navigation, Enter to activate)
   - [ ] Undo/Redo with keyboard shortcuts

3. **Performance**
   - [ ] No perceptible lag during drag operations
   - [ ] Smooth animations (60fps)
   - [ ] Works with 30+ days, 100+ activities

4. **Edge Cases**
   - [ ] Empty day accepts dropped activities
   - [ ] Last day cannot be deleted
   - [ ] Offline changes queue correctly

---

*End of Technical Design Document*
