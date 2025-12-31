import React from 'react';
import { Globe, MapIcon, Calendar, Navigation, Briefcase } from 'lucide-react';
import { useUIStore, ExtendedViewMode } from '@/stores';

interface NavItem {
  id: ExtendedViewMode;
  icon: React.ElementType;
  label: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'trips', icon: Briefcase, label: 'All Trips', description: 'View and manage trips' },
  { id: 'country', icon: Globe, label: 'By Country', description: 'Trip organized by location' },
  { id: 'overview', icon: MapIcon, label: 'Calendar', description: 'Day-by-day schedule' },
  { id: 'day', icon: Calendar, label: 'Itinerary', description: 'Detailed daily activities' },
  { id: 'travel', icon: Navigation, label: 'Journeys', description: 'Routes & logistics' },
];

export function Sidebar() {
  const viewMode = useUIStore(state => state.viewMode);
  const setViewMode = useUIStore(state => state.setViewMode);

  return (
    <aside
      className="hidden lg:flex flex-col w-64 border-r-2 border-slate-200 bg-white"
      aria-label="Main navigation"
    >
      {/* Navigation */}
      <nav className="p-4" role="navigation" aria-label="View navigation">
        <div className="space-y-1" role="list">
          {NAV_ITEMS.map(item => {
            const isActive = viewMode === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setViewMode(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all text-left
                  ${isActive
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isActive ? 'bg-blue-600' : 'bg-slate-100'
                }`}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm">{item.label}</div>
                  <div className={`text-xs truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom section - could add settings, etc. */}
      <div className="mt-auto p-4 border-t-2 border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          v1.0.0
        </p>
      </div>
    </aside>
  );
}
