import { useState, useEffect } from 'react';
import { X, Save, MapPin, Clock, DollarSign, Tag, FileText } from 'lucide-react';
import { BookingInfo } from './BookingInfo';
import type { Activity, ActivityDetails, BookingInfo as BookingInfoType, MoneyAmount } from '@/types';

interface ActivityEditModalProps {
  activity: Activity;
  onClose: () => void;
  onSave: (updatedActivity: Activity) => void;
}

const ACTIVITY_TYPES = [
  { value: 'activity', label: 'Activity', icon: '🎯' },
  { value: 'food', label: 'Food', icon: '🍽️' },
  { value: 'lodging', label: 'Lodging', icon: '🏨' },
  { value: 'travel', label: 'Travel', icon: '🚗' },
];

export function ActivityEditModal({ activity, onClose, onSave }: ActivityEditModalProps) {
  const [formData, setFormData] = useState<Activity>({
    ...activity,
    details: activity.details || {},
  });

  const [showBookingSection, setShowBookingSection] = useState(!!activity.details?.booking?.confirmationNumber);
  const [showCostSection, setShowCostSection] = useState(!!activity.details?.estimatedCost || !!activity.details?.actualCost);

  const handleBasicChange = (field: keyof Activity, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (field: keyof Activity['location'], value: string) => {
    setFormData((prev) => ({
      ...prev,
      location: { ...prev.location, [field]: value },
    }));
  };

  const handleDetailsChange = (field: keyof ActivityDetails, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      details: { ...prev.details, [field]: value },
    }));
  };

  const handleBookingChange = (booking: BookingInfoType) => {
    handleDetailsChange('booking', booking);
  };

  const handleEstimatedCostChange = (field: keyof MoneyAmount, value: string | number) => {
    const currentCost = formData.details?.estimatedCost || { amount: 0, currency: 'USD' };
    handleDetailsChange('estimatedCost', {
      ...currentCost,
      [field]: field === 'amount' ? parseFloat(value as string) || 0 : value,
    });
  };

  const handleActualCostChange = (field: keyof MoneyAmount, value: string | number) => {
    const currentCost = formData.details?.actualCost || { amount: 0, currency: 'USD' };
    handleDetailsChange('actualCost', {
      ...currentCost,
      [field]: field === 'amount' ? parseFloat(value as string) || 0 : value,
    });
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map((t) => t.trim()).filter(Boolean);
    handleDetailsChange('tags', tags);
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  // Keyboard navigation: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-activity-title"
    >
      <div className="bg-white w-full md:max-w-3xl md:rounded-3xl rounded-t-3xl max-h-[90vh] md:max-h-[85vh] overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 id="edit-activity-title" className="text-2xl font-extrabold">Edit Activity</h2>
            <button
              onClick={onClose}
              aria-label="Close edit activity modal"
              className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto custom-scrollbar max-h-[calc(90vh-180px)] md:max-h-[calc(85vh-180px)] p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wide">
                Basic Information
              </h3>

              {/* Activity Type */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ACTIVITY_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleBasicChange('type', type.value)}
                      className={`btn-press flex flex-col items-center gap-2 p-3 border-2 rounded-xl transition-all ${
                        formData.type === type.value
                          ? 'bg-blue-500 border-blue-700 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                      }`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <span className="text-xs font-bold">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleBasicChange('description', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-bold text-slate-700"
                  placeholder="e.g., Dinner at La Piazza"
                />
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.time || ''}
                    onChange={(e) => handleBasicChange('time', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime || ''}
                    onChange={(e) => handleBasicChange('endTime', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </section>

            {/* Location */}
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.location.name}
                  onChange={(e) => handleLocationChange('name', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  placeholder="e.g., La Piazza Restaurant"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.location.address || ''}
                  onChange={(e) => handleLocationChange('address', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  placeholder="e.g., 123 Main St, Rome, Italy"
                />
              </div>
            </section>

            {/* Contact Information */}
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wide">
                Contact Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.details?.phone || ''}
                    onChange={(e) => handleDetailsChange('phone', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.details?.email || ''}
                    onChange={(e) => handleDetailsChange('email', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                    placeholder="contact@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.details?.website || ''}
                    onChange={(e) => handleDetailsChange('website', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </section>

            {/* Booking Information */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wide">
                  Booking Information
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBookingSection(!showBookingSection)}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700"
                >
                  {showBookingSection ? 'Hide' : 'Add Booking'}
                </button>
              </div>

              {showBookingSection && (
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4">
                  <BookingInfo
                    booking={formData.details?.booking}
                    isEditing={true}
                    onChange={handleBookingChange}
                  />
                </div>
              )}
            </section>

            {/* Cost Information */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Cost
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCostSection(!showCostSection)}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700"
                >
                  {showCostSection ? 'Hide' : 'Add Cost'}
                </button>
              </div>

              {showCostSection && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Estimated Cost */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Estimated Cost
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={formData.details?.estimatedCost?.currency || 'USD'}
                        onChange={(e) => handleEstimatedCostChange('currency', e.target.value)}
                        className="px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-center font-bold"
                        placeholder="USD"
                        maxLength={3}
                      />
                      <input
                        type="number"
                        value={formData.details?.estimatedCost?.amount || ''}
                        onChange={(e) => handleEstimatedCostChange('amount', e.target.value)}
                        className="col-span-2 px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Actual Cost */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Actual Cost
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={formData.details?.actualCost?.currency || 'USD'}
                        onChange={(e) => handleActualCostChange('currency', e.target.value)}
                        className="px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-center font-bold"
                        placeholder="USD"
                        maxLength={3}
                      />
                      <input
                        type="number"
                        value={formData.details?.actualCost?.amount || ''}
                        onChange={(e) => handleActualCostChange('amount', e.target.value)}
                        className="col-span-2 px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.details?.isPaid || false}
                        onChange={(e) => handleDetailsChange('isPaid', e.target.checked)}
                        className="w-4 h-4 rounded border-2 border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-bold text-slate-700">Paid</span>
                    </label>
                  </div>
                </div>
              )}
            </section>

            {/* Notes */}
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Notes
              </h3>
              <textarea
                value={formData.details?.notes || ''}
                onChange={(e) => handleDetailsChange('notes', e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 min-h-[100px] resize-y"
                placeholder="Add any additional notes or important information..."
              />
            </section>

            {/* Tags */}
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Tags
              </h3>
              <input
                type="text"
                value={formData.details?.tags?.join(', ') || ''}
                onChange={(e) => handleTagsChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                placeholder="e.g., family-friendly, outdoor, romantic (comma-separated)"
              />
              {formData.details?.tags && formData.details.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.details.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-slate-200 p-4 bg-slate-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 btn-press px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-300 font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 btn-press px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white border-b-4 border-blue-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
