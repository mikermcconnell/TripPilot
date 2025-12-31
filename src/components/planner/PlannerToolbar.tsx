import React from 'react';
import { Plus, Undo2, Redo2, Eye } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

interface PlannerToolbarProps {
  onAddDayStart: () => void;
  onAddDayEnd: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function PlannerToolbar({
  onAddDayStart,
  onAddDayEnd,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: PlannerToolbarProps) {
  const { setViewMode } = useUIStore();

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trip Planner</h1>
            <p className="text-sm text-gray-600 mt-1">
              Drag and drop to rearrange your itinerary
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Add Day Start */}
            <button
              onClick={onAddDayStart}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              style={{ minHeight: '44px' }}
            >
              <Plus size={16} />
              <span>Add Day at Start</span>
            </button>

            {/* Add Day End */}
            <button
              onClick={onAddDayEnd}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              style={{ minHeight: '44px' }}
            >
              <Plus size={16} />
              <span>Add Day at End</span>
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-300 mx-2" />

            {/* Undo */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                ${canUndo
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }
              `}
              style={{ minHeight: '44px' }}
              title="Undo (Cmd/Ctrl+Z)"
            >
              <Undo2 size={16} />
              <span className="text-sm">Undo</span>
            </button>

            {/* Redo */}
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                ${canRedo
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }
              `}
              style={{ minHeight: '44px' }}
              title="Redo (Cmd/Ctrl+Shift+Z)"
            >
              <Redo2 size={16} />
              <span className="text-sm">Redo</span>
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-300 mx-2" />

            {/* View Mode Toggle */}
            <button
              onClick={() => setViewMode('overview')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              style={{ minHeight: '44px' }}
              title="Switch to read-only view"
            >
              <Eye size={16} />
              <span className="text-sm">View Mode</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
