import React from 'react';
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
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { usePlannerDnd } from '@/hooks/usePlannerDnd';
import { useTripStore } from '@/stores/tripStore';

interface PlannerDndContextProps {
  children: React.ReactNode;
}

export function PlannerDndContext({ children }: PlannerDndContextProps) {
  const {
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    activeDragItem,
  } = usePlannerDnd();

  const { activeTrip } = useTripStore();

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

  // Find the dragged item for overlay
  let overlayContent = null;
  if (activeDragItem && activeTrip) {
    if (activeDragItem.type === 'activity') {
      // Find the activity
      const activity = activeTrip.itinerary.days
        .flatMap(d => d.activities)
        .find(a => a.id === activeDragItem.activityId);

      if (activity) {
        overlayContent = (
          <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-blue-500 opacity-90 min-w-[300px]">
            <div className="font-medium text-gray-900">{activity.description}</div>
            {activity.time && (
              <div className="text-sm text-gray-600 mt-1">{activity.time}</div>
            )}
          </div>
        );
      }
    } else if (activeDragItem.type === 'day') {
      // Find the day
      const day = activeTrip.itinerary.days.find(d => d.id === activeDragItem.dayId);

      if (day) {
        overlayContent = (
          <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-indigo-500 opacity-90 min-w-[250px]">
            <div className="font-semibold text-gray-900">Day {day.dayNumber}</div>
            <div className="text-sm text-gray-600 mt-1">{day.date}</div>
            <div className="text-xs text-gray-500 mt-2">
              {day.activities.length} {day.activities.length === 1 ? 'activity' : 'activities'}
            </div>
          </div>
        );
      }
    }
  }

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
        {overlayContent}
      </DragOverlay>
    </DndContext>
  );
}
