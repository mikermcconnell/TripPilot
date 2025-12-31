import { MapPin, Clock, Navigation, Phone, ExternalLink } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import { getActivityIcon, sanitizePhone, isValidUrl } from '@/utils/activityHelpers';
import type { Activity } from '@/types';

interface NextActivityCardProps {
  activity: Activity;
  timeUntil: number | null;
  onViewDetails?: () => void;
}

export function NextActivityCard({ activity, timeUntil, onViewDetails }: NextActivityCardProps) {

  const openInMaps = () => {
    if (activity.location.coordinates) {
      const { lat, lng } = activity.location.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const query = encodeURIComponent(activity.location.name);
      window.open(`https://www.google.com/maps/search/${query}`, '_blank', 'noopener,noreferrer');
    }
  };

  const makeCall = () => {
    if (activity.details?.phone) {
      const sanitizedPhone = sanitizePhone(activity.details.phone);
      window.location.href = `tel:${sanitizedPhone}`;
    }
  };

  const openWebsite = () => {
    if (activity.details?.website && isValidUrl(activity.details.website)) {
      window.open(activity.details.website, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 shadow-xl text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">
              What's Next
            </p>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getActivityIcon(activity.type)}</span>
              {timeUntil !== null && <CountdownTimer milliseconds={timeUntil} />}
            </div>
          </div>
          {activity.time && (
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
              <Clock className="w-4 h-4" />
              <span className="font-bold text-sm">{activity.time}</span>
            </div>
          )}
        </div>

        {/* Activity Info */}
        <h2 className="text-2xl font-extrabold mb-3 leading-tight">
          {activity.description}
        </h2>

        <div className="flex items-start gap-2 mb-4">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">{activity.location.name}</p>
            {activity.location.address && (
              <p className="text-xs opacity-80 mt-0.5">{activity.location.address}</p>
            )}
          </div>
        </div>

        {/* Booking Info */}
        {activity.details?.booking?.confirmationNumber && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-4">
            <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">
              Confirmation
            </p>
            <p className="font-mono font-bold">
              {activity.details.booking.confirmationNumber}
            </p>
          </div>
        )}

        {/* Notes */}
        {activity.details?.notes && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-4">
            <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">
              Notes
            </p>
            <p className="text-sm">{activity.details.notes}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={openInMaps}
            className="btn-press flex items-center justify-center gap-2 px-4 py-3 bg-white text-blue-600 border-b-4 border-blue-100 font-bold text-sm rounded-xl transition-all hover:bg-blue-50"
          >
            <Navigation className="w-4 h-4" />
            Navigate
          </button>

          {activity.details?.phone ? (
            <button
              onClick={makeCall}
              className="btn-press flex items-center justify-center gap-2 px-4 py-3 bg-white/20 backdrop-blur-sm text-white border-b-4 border-white/30 font-bold text-sm rounded-xl transition-all hover:bg-white/30"
            >
              <Phone className="w-4 h-4" />
              Call
            </button>
          ) : activity.details?.website ? (
            <button
              onClick={openWebsite}
              className="btn-press flex items-center justify-center gap-2 px-4 py-3 bg-white/20 backdrop-blur-sm text-white border-b-4 border-white/30 font-bold text-sm rounded-xl transition-all hover:bg-white/30"
            >
              <ExternalLink className="w-4 h-4" />
              Website
            </button>
          ) : (
            <button
              onClick={onViewDetails}
              className="btn-press flex items-center justify-center gap-2 px-4 py-3 bg-white/20 backdrop-blur-sm text-white border-b-4 border-white/30 font-bold text-sm rounded-xl transition-all hover:bg-white/30"
            >
              Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
