import React, { useState } from 'react';
import { X, Check, Calendar } from 'lucide-react';
import type { DayQuickAddProps } from '@/types/planner';

export function DayQuickAdd({
  position,
  onSubmit,
  onCancel,
  suggestedDate,
}: DayQuickAddProps) {
  const [date, setDate] = useState(suggestedDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(date);
  };

  const positionLabel = position === 'start' ? 'Start' : position === 'end' ? 'End' : `Position ${position + 1}`;

  return (
    <div className="flex-shrink-0 w-[350px] bg-white rounded-lg border-2 border-indigo-500 shadow-lg p-4 animate-in slide-in-from-bottom duration-200">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-600">
          <Calendar size={20} />
          <h3 className="font-semibold">Add Day at {positionLabel}</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            All day dates will be recalculated based on trip start date
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            style={{ minHeight: '44px' }}
          >
            <Check size={16} />
            <span>Add Day</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <X size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
