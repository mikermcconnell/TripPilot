import { create } from 'zustand';
import type { PlannerUIState, DragItem, DroppableId } from '@/types/planner';

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
