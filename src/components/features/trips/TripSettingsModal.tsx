import { useState, useEffect } from 'react';
import { X, Settings, MapPin, Calendar, Globe, DollarSign, Camera, Package, Wallet, Loader2 } from 'lucide-react';
import type { Trip, TripStatus } from '@/types';

interface TripSettingsModalProps {
  isOpen: boolean;
  trip: Trip | null;
  onClose: () => void;
  onSave: (tripId: string, updates: Partial<Trip>) => Promise<void>;
}

const STATUS_OPTIONS: { value: TripStatus; label: string; color: string }[] = [
  { value: 'planning', label: 'Planning', color: 'bg-purple-100 text-purple-700' },
  { value: 'upcoming', label: 'Upcoming', color: 'bg-blue-100 text-blue-700' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { value: 'completed', label: 'Completed', color: 'bg-slate-100 text-slate-700' },
  { value: 'archived', label: 'Archived', color: 'bg-amber-100 text-amber-700' },
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
  { value: 'JPY', label: 'JPY - Japanese Yen', symbol: '¥' },
  { value: 'CAD', label: 'CAD - Canadian Dollar', symbol: 'C$' },
  { value: 'AUD', label: 'AUD - Australian Dollar', symbol: 'A$' },
  { value: 'CHF', label: 'CHF - Swiss Franc', symbol: 'Fr' },
  { value: 'CNY', label: 'CNY - Chinese Yuan', symbol: '¥' },
  { value: 'INR', label: 'INR - Indian Rupee', symbol: '₹' },
  { value: 'MXN', label: 'MXN - Mexican Peso', symbol: '$' },
  { value: 'BRL', label: 'BRL - Brazilian Real', symbol: 'R$' },
  { value: 'KRW', label: 'KRW - South Korean Won', symbol: '₩' },
];

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (NZST)' },
];

export function TripSettingsModal({ isOpen, trip, onClose, onSave }: TripSettingsModalProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timezone, setTimezone] = useState('');
  const [status, setStatus] = useState<TripStatus>('planning');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [packingEnabled, setPackingEnabled] = useState(false);
  const [photosEnabled, setPhotosEnabled] = useState(false);

  // UI state
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'dates' | 'settings'>('basic');

  // Populate form when trip changes
  useEffect(() => {
    if (trip) {
      setTitle(trip.title);
      setDescription(trip.description || '');
      setDestination(trip.destination.name);
      setStartDate(trip.startDate);
      setEndDate(trip.endDate);
      setTimezone(trip.timezone);
      setStatus(trip.status);
      setDefaultCurrency(trip.defaultCurrency);
      setBudgetEnabled(trip.budgetEnabled);
      setPackingEnabled(trip.packingEnabled);
      setPhotosEnabled(trip.photosEnabled);
      setActiveTab('basic');
      setError('');
    }
  }, [trip]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Prevent body scroll when open
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

  if (!isOpen || !trip) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!title.trim()) {
      setError('Please enter a trip title');
      setActiveTab('basic');
      return;
    }
    if (!destination.trim()) {
      setError('Please enter a destination');
      setActiveTab('dates');
      return;
    }
    if (!startDate) {
      setError('Please select a start date');
      setActiveTab('dates');
      return;
    }
    if (!endDate) {
      setError('Please select an end date');
      setActiveTab('dates');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be after start date');
      setActiveTab('dates');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: Partial<Trip> = {
        title: title.trim(),
        description: description.trim() || undefined,
        destination: {
          ...trip.destination,
          name: destination.trim(),
        },
        startDate,
        endDate,
        timezone,
        status,
        defaultCurrency,
        budgetEnabled,
        packingEnabled,
        photosEnabled,
        updatedAt: new Date().toISOString(),
      };

      await onSave(trip.id, updates);
      onClose();
    } catch (err) {
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Settings },
    { id: 'dates', label: 'Dates & Location', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Globe },
  ] as const;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-settings-title"
    >
      <div className="bg-white w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Settings className="w-5 h-5" />
              </div>
              <h2 id="trip-settings-title" className="text-xl font-extrabold">Trip Settings</h2>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close"
              className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-bold text-red-700">{error}</p>
            </div>
          )}

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Trip Title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  Trip Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Summer Vacation in Europe"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-bold text-slate-700 placeholder:text-slate-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes about your trip..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-700 placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  Trip Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatus(option.value)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                        status === option.value
                          ? `${option.color} border-current`
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dates & Location Tab */}
          {activeTab === 'dates' && (
            <div className="space-y-6">
              {/* Destination */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Destination
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., Paris, France"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-700 placeholder:text-slate-400"
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

              {/* Timezone */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-700 bg-white"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Currency */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  Default Currency
                </label>
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-700 bg-white"
                >
                  {CURRENCY_OPTIONS.map((currency) => (
                    <option key={currency.value} value={currency.value}>
                      {currency.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Feature Toggles */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">
                  Enabled Features
                </label>
                <div className="space-y-3">
                  {/* Budget Tracking */}
                  <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className={`p-2 rounded-lg ${budgetEnabled ? 'bg-green-100' : 'bg-slate-200'}`}>
                      <Wallet className={`w-5 h-5 ${budgetEnabled ? 'text-green-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-700">Budget Tracking</p>
                      <p className="text-sm text-slate-500">Track expenses and manage your trip budget</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={budgetEnabled}
                        onChange={(e) => setBudgetEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-checked:bg-green-500 rounded-full transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                    </div>
                  </label>

                  {/* Packing List */}
                  <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className={`p-2 rounded-lg ${packingEnabled ? 'bg-blue-100' : 'bg-slate-200'}`}>
                      <Package className={`w-5 h-5 ${packingEnabled ? 'text-blue-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-700">Packing List</p>
                      <p className="text-sm text-slate-500">Create and manage your packing checklist</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={packingEnabled}
                        onChange={(e) => setPackingEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-checked:bg-blue-500 rounded-full transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                    </div>
                  </label>

                  {/* Photos */}
                  <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className={`p-2 rounded-lg ${photosEnabled ? 'bg-purple-100' : 'bg-slate-200'}`}>
                      <Camera className={`w-5 h-5 ${photosEnabled ? 'text-purple-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-700">Trip Photos</p>
                      <p className="text-sm text-slate-500">Upload and organize photos from your trip</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={photosEnabled}
                        onChange={(e) => setPhotosEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-checked:bg-purple-500 rounded-full transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 btn-press px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-300 font-bold rounded-xl transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 btn-press px-4 py-3 bg-blue-500 hover:bg-blue-400 text-white border-b-4 border-blue-700 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
