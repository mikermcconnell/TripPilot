import { useCallback } from 'react';
import type {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTripStore } from '@/stores/tripStore';
import type { DragItem, DroppableId } from '@/types/planner';

export interface UsePlannerDndReturn {
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
  activeDragItem: DragItem | null;
  activeDropTarget: DroppableId | null;
}

export function usePlannerDnd(): UsePlannerDndReturn {
  const { setActiveDragItem, setHoveredDropTarget, activeDragItem, hoveredDropTarget } = usePlannerStore();
  const {
    reorderActivitiesInDay,
    moveActivityBetweenDays,
    reorderDays,
  } = useTripStore();

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as { type: 'activity' | 'day'; activityId?: string; sourceDayId?: string; dayId?: string };

    if (data.type === 'activity' && data.activityId && data.sourceDayId) {
      setActiveDragItem({
        type: 'activity',
        activityId: data.activityId,
        sourceDayId: data.sourceDayId,
      });
    } else if (data.type === 'day' && data.dayId) {
      setActiveDragItem({
        type: 'day',
        dayId: data.dayId,
      });
    }
  }, [setActiveDragItem]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      setHoveredDropTarget(over.id as DroppableId);
    } else {
      setHoveredDropTarget(null);
    }
  }, [setHoveredDropTarget]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // Clear hover state
    setHoveredDropTarget(null);

    // Dropped outside any droppable
    if (!over) {
      setActiveDragItem(null);
      return;
    }

    const data = active.data.current as { type: 'activity' | 'day'; activityId?: string; sourceDayId?: string; dayId?: string };

    if (data.type === 'activity' && data.activityId && data.sourceDayId) {
      handleActivityDragEnd(
        data.activityId,
        data.sourceDayId,
        over.id as string,
        active.data.current?.sortable?.index ?? 0,
        over.data.current?.sortable?.index ?? 0
      );
    } else if (data.type === 'day' && data.dayId) {
      handleDayDragEnd(
        active.data.current?.sortable?.index ?? 0,
        over.data.current?.sortable?.index ?? 0
      );
    }

    setActiveDragItem(null);
  }, [setActiveDragItem, setHoveredDropTarget, reorderActivitiesInDay, moveActivityBetweenDays, reorderDays]);

  const handleActivityDragEnd = useCallback((
    activityId: string,
    sourceDayId: string,
    overDroppableId: string,
    sourceIndex: number,
    destinationIndex: number
  ) => {
    // Extract destination day ID from droppable ID
    const destDayId = overDroppableId.replace('day-column-', '');

    // Same position - no-op
    if (sourceDayId === destDayId && sourceIndex === destinationIndex) {
      return;
    }

    if (sourceDayId === destDayId) {
      // Same day reorder
      reorderActivitiesInDay(sourceDayId, sourceIndex, destinationIndex);
    } else {
      // Cross-day move
      moveActivityBetweenDays(activityId, sourceDayId, destDayId, destinationIndex);
    }
  }, [reorderActivitiesInDay, moveActivityBetweenDays]);

  const handleDayDragEnd = useCallback((
    sourceIndex: number,
    destinationIndex: number
  ) => {
    // Same position - no-op
    if (sourceIndex === destinationIndex) {
      return;
    }

    reorderDays(sourceIndex, destinationIndex);
  }, [reorderDays]);

  const handleDragCancel = useCallback(() => {
    setActiveDragItem(null);
    setHoveredDropTarget(null);
  }, [setActiveDragItem, setHoveredDropTarget]);

  return {
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    activeDragItem,
    activeDropTarget: hoveredDropTarget,
  };
}
