import { useState } from 'react';
import { X, MapPin, Calendar, Save } from 'lucide-react';
import { PlacesAutocomplete } from '@/components/maps/PlacesAutocomplete';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, destination: string, startDate: string, endDate: string) => void;
}

export function CreateTripModal({ isOpen, onClose, onCreate }: CreateTripModalProps) {
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!title.trim()) {
      setError('Please enter a trip title');
      return;
    }
    if (!destination.trim()) {
      setError('Please enter a destination');
      return;
    }
    if (!startDate) {
      setError('Please select a start date');
      return;
    }
    if (!endDate) {
      setError('Please select an end date');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be after start date');
      return;
    }

    if (title.trim().length > 100) {
      setError('Title must be 100 characters or less');
      return;
    }
    if (destination.trim().length > 200) {
      setError('Destination must be 200 characters or less');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate(title.trim(), destination.trim(), startDate, endDate);

      // Reset form
      setTitle('');
      setDestination('');
      setStartDate('');
      setEndDate('');
      setError('');
      onClose();
    } catch (err) {
      setError('Failed to create trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-trip-title"
    >
      <div className="bg-white w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 id="create-trip-title" className="text-2xl font-extrabold">Create New Trip</h2>
            <button
              onClick={handleClose}
              aria-label="Close create trip modal"
              className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6" data-testid="create-trip-form">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4" data-testid="form-error">
              <p className="text-sm font-bold text-red-700">{error}</p>
            </div>
          )}

          {/* Trip Title */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
              Trip Title
            </label>
            <input
              data-testid="trip-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Summer Vacation in Europe"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-bold text-slate-700 placeholder:text-slate-400"
            />
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Destination
            </label>
            <PlacesAutocomplete
              onPlaceSelect={(prediction) => {
                setDestination(prediction.description);
              }}
              placeholder="e.g., Paris, France"
              types={['(cities)']}
              inputClassName="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-700 placeholder:text-slate-400"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-700"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-700">
              <span className="font-bold">Tip:</span> You can add activities and customize your itinerary after creating the trip.
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 btn-press px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-300 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              data-testid="submit-create-trip"
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-press px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white border-b-4 border-blue-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Create Trip
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
