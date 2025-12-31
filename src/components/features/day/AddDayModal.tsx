import React, { useState } from 'react';
import { X, MapPin, Calendar, Loader2 } from 'lucide-react';

interface AddDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (position: number, locationName: string) => Promise<void>;
  suggestedPosition: number; // Position where the day will be inserted
  totalDays: number;
}

export const AddDayModal: React.FC<AddDayModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  suggestedPosition,
  totalDays,
}) => {
  const [locationName, setLocationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locationName.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onSubmit(suggestedPosition, locationName.trim());
        setLocationName('');
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setLocationName('');
      onClose();
    }
  };

  // Determine what the new day number will be
  const newDayNumber = suggestedPosition + 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Add New Day</h2>
              <p className="text-xs text-slate-500">
                This will be Day {newDayNumber}
                {suggestedPosition < totalDays && ` (between Day ${suggestedPosition} and Day ${suggestedPosition + 1})`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                Location or City
              </div>
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g., Galloway, Paris, Tokyo..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-slate-700 font-medium"
              autoFocus
            />
            <p className="mt-2 text-xs text-slate-500">
              Enter a city or location name. A placeholder activity will be created for this location.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">ℹ</span>
                </div>
              </div>
              <div className="text-sm text-blue-900">
                <p className="font-bold mb-1">What happens next?</p>
                <ul className="space-y-1 text-blue-800">
                  <li>• Day {newDayNumber} will be created</li>
                  <li>• A placeholder activity will be added for this location</li>
                  <li>• The location will appear on the map</li>
                  <li>• You can add more activities later</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!locationName.trim() || isSubmitting}
              className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-bold border-b-4 border-emerald-700 disabled:border-slate-400 btn-press flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finding location...
                </>
              ) : (
                'Add Day'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
