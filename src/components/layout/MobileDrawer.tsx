import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTripStore } from '@/stores';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const activeTrip = useTripStore(state => state.activeTrip);
  const trips = useTripStore(state => state.trips);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-modal-backdrop animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 left-0 bottom-0 w-80 max-w-[85vw]
          bg-white z-modal
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="h-16 border-b-2 border-slate-200 flex items-center justify-between px-4 safe-area-top">
          <h2 className="font-extrabold text-lg text-slate-800">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-4rem)] custom-scrollbar">
          {/* Active Trip Info */}
          {activeTrip && (
            <div className="p-4 border-b-2 border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                Active Trip
              </p>
              <h3 className="text-lg font-extrabold text-slate-800">
                {activeTrip.title}
              </h3>
              <p className="text-sm font-medium text-slate-500 mt-1">
                {activeTrip.destination.name}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeTrip.itinerary?.days?.length ?? 0} days
              </p>
            </div>
          )}

          {/* Trip List */}
          {trips.length > 1 && (
            <div className="p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                All Trips ({trips.length})
              </p>
              {/* Trip list will be rendered here in future */}
              <p className="text-sm text-slate-500">
                Switch trips from the Trips view
              </p>
            </div>
          )}

          {/* Settings (placeholder) */}
          <div className="p-4 border-t-2 border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
              Settings
            </p>
            <p className="text-sm text-slate-500">
              Coming soon...
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
