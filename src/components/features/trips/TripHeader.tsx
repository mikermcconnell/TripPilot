import React, { useRef, useState } from 'react';
import { Calendar, MapPin, Camera, Pencil, X, Check } from 'lucide-react';
import { useTripStore } from '@/stores';

// Default cover images for different destinations (can be expanded)
const DEFAULT_COVERS: Record<string, string> = {
  dublin: 'https://images.unsplash.com/photo-1549918864-48ac978761a4?w=1200&q=80',
  ireland: 'https://images.unsplash.com/photo-1590089415225-401ed6f9db8e?w=1200&q=80',
  paris: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80',
  london: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80',
  rome: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=80',
  tokyo: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80',
  'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=80',
  default: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80',
};

function getDefaultCover(destination: string): string {
  const lowerDest = destination.toLowerCase();
  for (const [key, url] of Object.entries(DEFAULT_COVERS)) {
    if (lowerDest.includes(key)) {
      return url;
    }
  }
  return DEFAULT_COVERS.default;
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

function getDaysUntilTrip(startDate: string): { label: string; type: 'upcoming' | 'active' | 'past' } {
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  const diffTime = start.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 1) {
    return { label: `${diffDays} days away`, type: 'upcoming' };
  } else if (diffDays === 1) {
    return { label: 'Tomorrow!', type: 'upcoming' };
  } else if (diffDays === 0) {
    return { label: "It's today!", type: 'active' };
  } else {
    return { label: 'Trip completed', type: 'past' };
  }
}

interface TripHeaderProps {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImageUrl?: string;
  onEditTitle?: () => void;
}

export function TripHeader({
  title,
  destination,
  startDate,
  endDate,
  coverImageUrl,
}: TripHeaderProps) {
  const { activeTrip, updateTrip } = useTripStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [isHoveringCover, setIsHoveringCover] = useState(false);

  const coverImage = coverImageUrl || getDefaultCover(destination);
  const dateRange = formatDateRange(startDate, endDate);
  const tripStatus = getDaysUntilTrip(startDate);

  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTrip) return;

    // Convert to base64 for local storage (in a real app, upload to cloud storage)
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      await updateTrip(activeTrip.id, { coverImageUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleTitleSave = async () => {
    if (activeTrip && editedTitle.trim()) {
      await updateTrip(activeTrip.id, { title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditedTitle(title);
    setIsEditingTitle(false);
  };

  return (
    <div className="relative">
      {/* Cover Image Container */}
      <div
        className="relative h-48 overflow-hidden rounded-2xl mx-4 mt-4 cursor-pointer group"
        onMouseEnter={() => setIsHoveringCover(true)}
        onMouseLeave={() => setIsHoveringCover(false)}
        onClick={handleCoverClick}
      >
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${coverImage})` }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Edit Cover Overlay */}
        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
            isHoveringCover ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white font-semibold">
            <Camera className="w-5 h-5" />
            <span>Change Cover Photo</span>
          </div>
        </div>

        {/* Trip Status Badge */}
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide backdrop-blur-sm ${
            tripStatus.type === 'upcoming'
              ? 'bg-blue-500/80 text-white'
              : tripStatus.type === 'active'
              ? 'bg-emerald-500/80 text-white'
              : 'bg-slate-500/80 text-white'
          }`}>
            {tripStatus.label}
          </span>
        </div>

        {/* Trip Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {/* Title */}
          {isEditingTitle ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="flex-1 px-3 py-2 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white text-2xl font-black placeholder:text-white/50 focus:outline-none focus:border-white/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') handleTitleCancel();
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleTitleSave(); }}
                className="p-2 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-white transition-colors"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleTitleCancel(); }}
                className="p-2 bg-slate-500 hover:bg-slate-400 rounded-xl text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-2 group/title">
              <h1 className="text-3xl font-black text-white drop-shadow-lg">
                {title}
              </h1>
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white opacity-0 group-hover/title:opacity-100 transition-all"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Destination & Dates */}
          <div className="flex flex-wrap items-center gap-4 text-white/90">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span className="font-semibold">{destination}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span className="font-semibold">{dateRange}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

export default TripHeader;
