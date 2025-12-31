import { Navigation, Phone, ExternalLink, DollarSign, Camera, Share2 } from 'lucide-react';
import { sanitizePhone, isValidUrl } from '@/utils/activityHelpers';
import type { Activity } from '@/types';

interface QuickActionsProps {
  activity: Activity;
  onNavigate?: () => void;
  onAddExpense?: () => void;
  onAddPhoto?: () => void;
  onShare?: () => void;
}

export function QuickActions({
  activity,
  onNavigate,
  onAddExpense,
  onAddPhoto,
  onShare,
}: QuickActionsProps) {

  const openInMaps = () => {
    if (activity.location.coordinates) {
      const { lat, lng } = activity.location.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const query = encodeURIComponent(activity.location.name);
      window.open(`https://www.google.com/maps/search/${query}`, '_blank', 'noopener,noreferrer');
    }
    onNavigate?.();
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

  const handleShare = async () => {
    const shareData = {
      title: activity.description,
      text: `${activity.description} at ${activity.location.name}${activity.time ? ` - ${activity.time}` : ''}`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    }
    onShare?.();
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Navigate - Always available */}
      <button
        onClick={openInMaps}
        className="btn-press flex flex-col items-center gap-1.5 px-3 py-3 bg-blue-500 hover:bg-blue-400 text-white border-b-4 border-blue-700 font-bold text-xs rounded-xl transition-all"
      >
        <Navigation className="w-5 h-5" />
        <span>Navigate</span>
      </button>

      {/* Phone or Website */}
      {activity.details?.phone ? (
        <button
          onClick={makeCall}
          className="btn-press flex flex-col items-center gap-1.5 px-3 py-3 bg-green-500 hover:bg-green-400 text-white border-b-4 border-green-700 font-bold text-xs rounded-xl transition-all"
        >
          <Phone className="w-5 h-5" />
          <span>Call</span>
        </button>
      ) : activity.details?.website ? (
        <button
          onClick={openWebsite}
          className="btn-press flex flex-col items-center gap-1.5 px-3 py-3 bg-purple-500 hover:bg-purple-400 text-white border-b-4 border-purple-700 font-bold text-xs rounded-xl transition-all"
        >
          <ExternalLink className="w-5 h-5" />
          <span>Website</span>
        </button>
      ) : (
        <button
          onClick={handleShare}
          className="btn-press flex flex-col items-center gap-1.5 px-3 py-3 bg-slate-500 hover:bg-slate-400 text-white border-b-4 border-slate-700 font-bold text-xs rounded-xl transition-all"
        >
          <Share2 className="w-5 h-5" />
          <span>Share</span>
        </button>
      )}

      {/* Add Expense or Add Photo or Share (only if not already shown in column 2) */}
      {onAddExpense ? (
        <button
          onClick={onAddExpense}
          className="btn-press flex flex-col items-center gap-1.5 px-3 py-3 bg-emerald-500 hover:bg-emerald-400 text-white border-b-4 border-emerald-700 font-bold text-xs rounded-xl transition-all"
        >
          <DollarSign className="w-5 h-5" />
          <span>Expense</span>
        </button>
      ) : onAddPhoto ? (
        <button
          onClick={onAddPhoto}
          className="btn-press flex flex-col items-center gap-1.5 px-3 py-3 bg-amber-500 hover:bg-amber-400 text-white border-b-4 border-amber-700 font-bold text-xs rounded-xl transition-all"
        >
          <Camera className="w-5 h-5" />
          <span>Photo</span>
        </button>
      ) : (activity.details?.phone || activity.details?.website) ? (
        <button
          onClick={handleShare}
          className="btn-press flex flex-col items-center gap-1.5 px-3 py-3 bg-slate-500 hover:bg-slate-400 text-white border-b-4 border-slate-700 font-bold text-xs rounded-xl transition-all"
        >
          <Share2 className="w-5 h-5" />
          <span>Share</span>
        </button>
      ) : null}
    </div>
  );
}
