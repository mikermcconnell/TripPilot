import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { TripSummary, TripId } from '@/types';

interface TripSwitcherProps {
  trips: TripSummary[];
  activeTripId: TripId | null;
  onTripSelect: (tripId: TripId) => void;
}

export function TripSwitcher({ trips, activeTripId, onTripSelect }: TripSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTrip = trips.find(t => t.id === activeTripId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!activeTrip || trips.length <= 1) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-300 transition-all"
      >
        <div className="text-left">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Current Trip</p>
          <p className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{activeTrip.title}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-72 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto custom-scrollbar">
          <div className="p-2 space-y-1">
            {trips.map((trip) => {
              const isActive = trip.id === activeTripId;
              return (
                <button
                  key={trip.id}
                  onClick={() => {
                    onTripSelect(trip.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center justify-between
                    ${isActive
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-slate-50 text-slate-700'
                    }
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${isActive ? 'text-white' : 'text-slate-700'}`}>
                      {trip.title}
                    </p>
                    <p className={`text-xs truncate ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {trip.destination}
                    </p>
                  </div>
                  {isActive && (
                    <Check className="w-4 h-4 text-white flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
