import { useEffect } from 'react';
import { MapPin, Clock, Phone, Mail, Globe, FileText, Tag, DollarSign, Edit2, X } from 'lucide-react';
import { QuickActions } from './QuickActions';
import { BookingInfo } from './BookingInfo';
import { getActivityIcon, getActivityColor, sanitizePhone, isValidUrl } from '@/utils/activityHelpers';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { Activity } from '@/types';

interface ActivityDetailProps {
  activity: Activity;
  onClose: () => void;
  onEdit?: () => void;
  onAddExpense?: () => void;
  onAddPhoto?: () => void;
}

export function ActivityDetail({
  activity,
  onClose,
  onEdit,
  onAddExpense,
  onAddPhoto,
}: ActivityDetailProps) {
  const modalRef = useFocusTrap();

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

  const hasBooking = !!activity.details?.booking?.confirmationNumber;
  const hasNotes = !!activity.details?.notes;
  const hasCost = !!activity.details?.estimatedCost || !!activity.details?.actualCost;
  const hasTags = !!activity.details?.tags && activity.details.tags.length > 0;
  const hasContact = !!activity.details?.phone || !!activity.details?.email || !!activity.details?.website;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-detail-title"
    >
      <div ref={modalRef} className="bg-white w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl max-h-[90vh] md:max-h-[85vh] overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className={`relative bg-gradient-to-br ${getActivityColor(activity.type)} p-6 text-white`}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl" aria-hidden="true">{getActivityIcon(activity.type)}</span>
                {activity.time && (
                  <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    <span className="font-bold text-sm">
                      {activity.time}
                      {activity.endTime && ` - ${activity.endTime}`}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    aria-label="Edit activity"
                    className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all"
                  >
                    <Edit2 className="w-5 h-5" aria-hidden="true" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close activity details"
                  className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <h2 id="activity-detail-title" className="text-2xl font-extrabold mb-3 leading-tight">
              {activity.description}
            </h2>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">{activity.location.name}</p>
                {activity.location.address && (
                  <p className="text-xs opacity-80 mt-0.5">{activity.location.address}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto custom-scrollbar max-h-[calc(90vh-280px)] md:max-h-[calc(85vh-280px)]">
          <div className="p-6 space-y-6">
            {/* Quick Actions */}
            <QuickActions
              activity={activity}
              onAddExpense={onAddExpense}
              onAddPhoto={onAddPhoto}
            />

            {/* Booking Information */}
            {hasBooking && (
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4">
                <BookingInfo booking={activity.details?.booking} isEditing={false} />
              </div>
            )}

            {/* Contact Information */}
            {hasContact && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Contact Information
                </h4>
                <div className="space-y-2">
                  {activity.details?.phone && (
                    <a
                      href={`tel:${sanitizePhone(activity.details.phone)}`}
                      className="flex items-center gap-3 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl hover:border-blue-300 transition-all"
                    >
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-bold text-slate-700">{activity.details.phone}</span>
                    </a>
                  )}
                  {activity.details?.email && (
                    <a
                      href={`mailto:${activity.details.email}`}
                      className="flex items-center gap-3 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl hover:border-blue-300 transition-all"
                    >
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-700">{activity.details.email}</span>
                    </a>
                  )}
                  {activity.details?.website && isValidUrl(activity.details.website) && (
                    <a
                      href={activity.details.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl hover:border-blue-300 transition-all"
                    >
                      <Globe className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-blue-600 underline">{activity.details.website}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Cost Information */}
            {hasCost && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Cost
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {activity.details?.estimatedCost && (
                    <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-xl">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                        Estimated
                      </p>
                      <p className="text-lg font-bold text-slate-700">
                        {activity.details.estimatedCost.currency} {activity.details.estimatedCost.amount.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {activity.details?.actualCost && (
                    <div className="p-3 bg-green-50 border-2 border-green-200 rounded-xl">
                      <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">
                        Actual
                      </p>
                      <p className="text-lg font-bold text-green-700">
                        {activity.details.actualCost.currency} {activity.details.actualCost.amount.toFixed(2)}
                      </p>
                      {activity.details.isPaid && (
                        <p className="text-xs font-bold text-green-600 mt-1">✓ Paid</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {hasNotes && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </h4>
                <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{activity.details?.notes}</p>
                </div>
              </div>
            )}

            {/* Tags */}
            {hasTags && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activity.details?.tags?.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {activity.details?.attachments && activity.details.attachments.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Attachments
                </h4>
                <div className="space-y-2">
                  {activity.details.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl"
                    >
                      <FileText className="w-4 h-4 text-slate-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700 truncate">{attachment.filename}</p>
                        <p className="text-xs text-slate-500">{attachment.mimeType}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
