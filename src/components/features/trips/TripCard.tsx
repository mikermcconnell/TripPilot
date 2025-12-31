import { useState } from 'react';
import { MapPin, Calendar, Clock, MoreVertical, Pencil, Copy, Archive, Download, Trash2, ArchiveRestore } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import type { TripSummary, TripId } from '@/types';

interface TripCardProps {
  trip: TripSummary;
  isActive: boolean;
  onClick: () => void;
  onEdit?: (tripId: TripId) => void;
  onDuplicate?: (tripId: TripId) => void;
  onArchive?: (tripId: TripId) => void;
  onUnarchive?: (tripId: TripId) => void;
  onExport?: (tripId: TripId) => void;
  onDelete?: (tripId: TripId) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'upcoming':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'active':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'completed':
      return 'bg-slate-100 text-slate-500 border-slate-200';
    case 'archived':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'cancelled':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-slate-100 text-slate-500 border-slate-200';
  }
};

export function TripCard({
  trip,
  isActive,
  onClick,
  onEdit,
  onDuplicate,
  onArchive,
  onUnarchive,
  onExport,
  onDelete,
}: TripCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const duration = differenceInDays(endDate, startDate) + 1;
  const dayCount = trip.daysCount;
  const isArchived = trip.status === 'archived';
  const hasActions = onEdit || onDuplicate || onArchive || onUnarchive || onExport || onDelete;

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setIsMenuOpen(false);
  };

  const handleClickOutside = () => {
    setIsMenuOpen(false);
  };

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsMenuOpen(false); }}
    >
      <button
        onClick={onClick}
        className={`
          w-full text-left transition-all duration-200 rounded-2xl p-5
          ${isActive
            ? 'bg-blue-500 text-white border-2 border-blue-700 shadow-lg scale-[1.02]'
            : 'bg-white border-2 border-slate-200 hover:border-blue-300 hover:shadow-md'
          }
        `}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-8">
            <h3 className={`text-xl font-extrabold mb-1 truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
              {trip.title}
            </h3>
            <div className={`flex items-center gap-2 text-sm ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate font-bold">{trip.destination}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className={`flex items-center gap-1.5 text-sm font-bold ${isActive ? 'text-blue-100' : 'text-slate-600'}`}>
            <Calendar className="w-4 h-4" />
            <span>{format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-bold ${isActive ? 'text-blue-100' : 'text-slate-600'}`}>
            <Clock className="w-4 h-4" />
            <span>{duration} {duration === 1 ? 'day' : 'days'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border-2 ${
              isActive ? 'bg-white/20 text-white border-white/30' : getStatusBadge(trip.status)
            }`}
          >
            {trip.status}
          </span>
          <span className={`text-xs font-bold ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
            {dayCount} {dayCount === 1 ? 'day' : 'days'} planned
          </span>
        </div>
      </button>

      {/* Actions Menu Button */}
      {hasActions && (isHovered || isMenuOpen) && (
        <div className="absolute top-3 right-3">
          <button
            onClick={handleMenuClick}
            className={`p-2 rounded-lg transition-all ${
              isActive
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-white hover:bg-slate-50 text-slate-600 shadow-sm border border-slate-200'
            }`}
            aria-label="Trip actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={handleClickOutside}
              />
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {onEdit && (
                  <button
                    onClick={(e) => handleAction(e, () => onEdit(trip.id))}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="w-4 h-4 text-slate-500" />
                    <span className="font-medium">Edit Details</span>
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={(e) => handleAction(e, () => onDuplicate(trip.id))}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span className="font-medium">Duplicate</span>
                  </button>
                )}
                {onArchive && !isArchived && (
                  <button
                    onClick={(e) => handleAction(e, () => onArchive(trip.id))}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50"
                  >
                    <Archive className="w-4 h-4 text-slate-500" />
                    <span className="font-medium">Archive</span>
                  </button>
                )}
                {onUnarchive && isArchived && (
                  <button
                    onClick={(e) => handleAction(e, () => onUnarchive(trip.id))}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50"
                  >
                    <ArchiveRestore className="w-4 h-4 text-slate-500" />
                    <span className="font-medium">Unarchive</span>
                  </button>
                )}
                {onExport && (
                  <button
                    onClick={(e) => handleAction(e, () => onExport(trip.id))}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span className="font-medium">Export</span>
                  </button>
                )}
                {onDelete && (
                  <>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={(e) => handleAction(e, () => onDelete(trip.id))}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="font-medium">Delete</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
