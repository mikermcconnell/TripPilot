import type { Activity, DayItinerary } from './itinerary';

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
