import React from 'react';
import { ChevronRight, Home, type LucideIcon } from 'lucide-react';
import { useUIStore, useTripStore, type ExtendedViewMode } from '@/stores';

interface BreadcrumbsProps {
  className?: string;
}

interface Crumb {
  label: string;
  onClick?: () => void;
  icon?: LucideIcon;
}

const VIEW_LABELS: Record<string, string> = {
  country: 'By Country',
  overview: 'Calendar',
  day: 'Itinerary',
  travel: 'Journeys',
  trips: 'All Trips',
  today: 'Today',
};

export function Breadcrumbs({ className = '' }: BreadcrumbsProps) {
  const viewMode = useUIStore(state => state.viewMode);
  const activeDayId = useUIStore(state => state.activeDayId);
  const setViewMode = useUIStore(state => state.setViewMode);
  const activeTrip = useTripStore(state => state.activeTrip);

  // Get current day info if in day view
  const currentDay = activeTrip?.itinerary?.days?.find(d => d.id === activeDayId);

  const crumbs: Crumb[] = [
    { label: 'Trips', onClick: () => setViewMode('trips' as ExtendedViewMode), icon: Home },
  ];

  // Add trip name if active
  if (activeTrip) {
    crumbs.push({
      label: activeTrip.title,
      onClick: () => setViewMode('overview' as ExtendedViewMode),
    });
  }

  // Add current view
  if (viewMode !== 'trips' && activeTrip) {
    crumbs.push({
      label: VIEW_LABELS[viewMode] || viewMode,
    });
  }

  // Add day number if in day view
  if (viewMode === 'day' && currentDay) {
    crumbs.push({
      label: `Day ${currentDay.dayNumber}`,
    });
  }

  return (
    <nav className={`flex items-center gap-1 text-sm ${className}`} aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const Icon = crumb.icon;

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            )}
            {crumb.onClick && !isLast ? (
              <button
                onClick={crumb.onClick}
                className="flex items-center gap-1 text-slate-500 hover:text-blue-600 font-medium transition-colors truncate max-w-[120px]"
              >
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                <span className="truncate">{crumb.label}</span>
              </button>
            ) : (
              <span className={`flex items-center gap-1 font-bold truncate max-w-[120px] ${isLast ? 'text-slate-700' : 'text-slate-500'}`}>
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                <span className="truncate">{crumb.label}</span>
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
