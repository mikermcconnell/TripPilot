import React, { useEffect } from 'react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import type { TripId } from '@/types';
import { useTripStore } from '@/stores/tripStore';
import { usePlannerStore } from '@/stores/plannerStore';
import { usePlannerUndo } from '@/hooks/usePlannerUndo';
import { usePlannerKeyboard } from '@/hooks/usePlannerKeyboard';
import { PlannerToolbar } from './PlannerToolbar';
import { PlannerDndContext } from './PlannerDndContext';
import { DraggableDayColumn } from './DraggableDayColumn';
import { DayQuickAdd } from './DayQuickAdd';
import { ActivityQuickAdd } from './ActivityQuickAdd';
import { nanoid } from 'nanoid';
import { format, addDays, parseISO } from 'date-fns';

interface PlannerViewProps {
  tripId: TripId;
}

export function PlannerView({ tripId }: PlannerViewProps) {
  const { activeTrip, addActivity, addDayAtPosition, removeDayById } = useTripStore();
  const {
    quickAddDayPosition,
    quickAddActivityDayId,
    closeDayQuickAdd,
    closeActivityQuickAdd,
    openDayQuickAdd,
    pendingDeleteDayId,
    setPendingDeleteDay,
    resetPlannerState,
  } = usePlannerStore();

  const { undo, redo, canUndo, canRedo, pushSnapshot } = usePlannerUndo();

  // Reset planner state on unmount
  useEffect(() => {
    return () => {
      resetPlannerState();
    };
  }, [resetPlannerState]);

  // Keyboard shortcuts
  usePlannerKeyboard({
    onUndo: undo,
    onRedo: redo,
    onDelete: () => {
      // Handle delete based on selection
      if (pendingDeleteDayId) {
        handleConfirmDeleteDay('delete');
      }
    },
    onEscape: () => {
      closeDayQuickAdd();
      closeActivityQuickAdd();
      setPendingDeleteDay(null);
    },
    onSelectAll: () => {
      // TODO: Implement multi-select
      console.log('Select all');
    },
  });

  if (!activeTrip) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Trip</h2>
          <p className="text-gray-600">Please select or create a trip to start planning.</p>
        </div>
      </div>
    );
  }

  const days = activeTrip.itinerary.days;

  const handleAddDay = async (date: string) => {
    const position = quickAddDayPosition === 'start' ? 0 : quickAddDayPosition === 'end' ? days.length : quickAddDayPosition as number;

    pushSnapshot(`Add day at ${quickAddDayPosition}`);
    await addDayAtPosition(position);
    closeDayQuickAdd();
  };

  const handleAddActivity = async (activity: Partial<import('@/types').Activity>) => {
    if (!quickAddActivityDayId) return;

    const day = days.find(d => d.id === quickAddActivityDayId);
    if (!day) return;

    pushSnapshot(`Add activity to Day ${day.dayNumber}`);
    await addActivity(day.dayNumber, activity as Omit<import('@/types').Activity, 'id'>);
    closeActivityQuickAdd();
  };

  const handleConfirmDeleteDay = async (activityHandling: 'previous' | 'next' | 'delete') => {
    if (!pendingDeleteDayId) return;

    const day = days.find(d => d.id === pendingDeleteDayId);
    if (!day) return;

    pushSnapshot(`Delete Day ${day.dayNumber}`);
    await removeDayById(pendingDeleteDayId, activityHandling);
    setPendingDeleteDay(null);
  };

  const getSuggestedDate = (): string => {
    if (quickAddDayPosition === 'start') {
      const firstDay = days[0];
      if (firstDay) {
        const prevDate = addDays(parseISO(firstDay.date), -1);
        return format(prevDate, 'yyyy-MM-dd');
      }
    } else if (quickAddDayPosition === 'end') {
      const lastDay = days[days.length - 1];
      if (lastDay) {
        const nextDate = addDays(parseISO(lastDay.date), 1);
        return format(nextDate, 'yyyy-MM-dd');
      }
    }
    return activeTrip.startDate;
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <PlannerToolbar
        onAddDayStart={() => openDayQuickAdd('start')}
        onAddDayEnd={() => openDayQuickAdd('end')}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <PlannerDndContext>
        <div className="flex-1 overflow-x-auto overflow-y-auto px-6 py-6">
          <SortableContext
            items={days.map(d => `day-${d.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-4 min-w-max pb-4">
              {/* Add Day at Start */}
              {quickAddDayPosition === 'start' && (
                <DayQuickAdd
                  position="start"
                  suggestedDate={getSuggestedDate()}
                  onSubmit={handleAddDay}
                  onCancel={closeDayQuickAdd}
                />
              )}

              {/* Days */}
              {days.map((day, index) => (
                <React.Fragment key={day.id}>
                  <DraggableDayColumn
                    day={day}
                    index={index}
                    isActive={false}
                    isDragging={false}
                    isDropTarget={false}
                  />

                  {/* Activity Quick Add */}
                  {quickAddActivityDayId === day.id && (
                    <div className="flex-shrink-0 w-[350px]">
                      <ActivityQuickAdd
                        dayId={day.id}
                        onSubmit={handleAddActivity}
                        onCancel={closeActivityQuickAdd}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}

              {/* Add Day at End */}
              {quickAddDayPosition === 'end' && (
                <DayQuickAdd
                  position="end"
                  suggestedDate={getSuggestedDate()}
                  onSubmit={handleAddDay}
                  onCancel={closeDayQuickAdd}
                />
              )}
            </div>
          </SortableContext>
        </div>
      </PlannerDndContext>

      {/* Delete Day Confirmation Dialog */}
      {pendingDeleteDayId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Day</h3>
            <p className="text-gray-600 mb-4">
              What should happen to activities in this day?
            </p>
            <div className="space-y-2 mb-6">
              <button
                onClick={() => handleConfirmDeleteDay('previous')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left"
                style={{ minHeight: '44px' }}
              >
                Move to previous day
              </button>
              <button
                onClick={() => handleConfirmDeleteDay('next')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left"
                style={{ minHeight: '44px' }}
              >
                Move to next day
              </button>
              <button
                onClick={() => handleConfirmDeleteDay('delete')}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-left"
                style={{ minHeight: '44px' }}
              >
                Delete activities
              </button>
            </div>
            <button
              onClick={() => setPendingDeleteDay(null)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              style={{ minHeight: '44px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
