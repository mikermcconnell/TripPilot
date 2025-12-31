import React from 'react';
import { Sun, Calendar, Briefcase, Globe, Navigation } from 'lucide-react';
import { useUIStore, ExtendedViewMode } from '@/stores';
import { useTripStore } from '@/stores';

interface NavItem {
  id: ExtendedViewMode;
  icon: React.ElementType;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'today', icon: Sun, label: 'Today' },
  { id: 'country', icon: Globe, label: 'Countries' },
  { id: 'day', icon: Calendar, label: 'Itinerary' },
  { id: 'travel', icon: Navigation, label: 'Journeys' },
  { id: 'trips', icon: Briefcase, label: 'Trips' },
];

export function BottomNav() {
  const viewMode = useUIStore(state => state.viewMode);
  const setViewMode = useUIStore(state => state.setViewMode);
  const activeTrip = useTripStore(state => state.activeTrip);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 safe-area-bottom z-40"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around items-center h-16" role="list">
        {NAV_ITEMS.map(item => {
          const isActive = viewMode === item.id;
          const Icon = item.icon;

          // Disable trip-specific views if no active trip
          const isDisabled = !activeTrip && ['today', 'day', 'country', 'travel'].includes(item.id);

          return (
            <button
              key={item.id}
              onClick={() => setViewMode(item.id)}
              disabled={isDisabled}
              className={`
                flex flex-col items-center justify-center w-full h-full
                transition-colors min-h-touch
                ${isActive
                  ? 'text-blue-500'
                  : isDisabled
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-400 active:text-slate-600'}
              `}
              role="listitem"
              aria-label={isDisabled ? `${item.label} (requires active trip)` : item.label}
              aria-current={isActive ? 'page' : undefined}
              aria-disabled={isDisabled}
            >
              <Icon
                className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`}
                aria-hidden="true"
              />
              <span className={`text-xs mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
