import React from 'react';
import { MapIcon, Calendar, Navigation } from 'lucide-react';
import { useUIStore } from '@/stores';
import type { ViewMode } from '@/types';

interface ViewItem {
  id: ViewMode;
  icon: React.ElementType;
  label: string;
}

const VIEW_ITEMS: ViewItem[] = [
  { id: 'overview', icon: MapIcon, label: 'Calendar' },
  { id: 'day', icon: Calendar, label: 'Itinerary' },
  { id: 'travel', icon: Navigation, label: 'Journeys' },
];

export function ViewSwitcher() {
  const viewMode = useUIStore(state => state.viewMode);
  const setViewMode = useUIStore(state => state.setViewMode);

  return (
    <div
      className="flex bg-slate-100 p-1 rounded-xl border-2 border-slate-200"
      role="tablist"
      aria-label="View options"
    >
      {VIEW_ITEMS.map(item => {
        const isActive = viewMode === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => setViewMode(item.id)}
            className={`
              flex items-center gap-2 px-3 lg:px-4 py-1.5 rounded-lg
              text-sm font-bold transition-all
              ${isActive
                ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-400 hover:text-slate-600'}
            `}
            role="tab"
            aria-selected={isActive}
            aria-label={`Switch to ${item.label} view`}
          >
            <Icon className="w-4 h-4 hidden sm:block" aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
