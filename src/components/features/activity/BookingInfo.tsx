import { useState } from 'react';
import { Calendar, Clock, CreditCard, Hash } from 'lucide-react';
import type { BookingInfo as BookingInfoType } from '@/types';

interface BookingInfoProps {
  booking: BookingInfoType | undefined;
  isEditing: boolean;
  onChange?: (booking: BookingInfoType) => void;
}

export function BookingInfo({ booking, isEditing, onChange }: BookingInfoProps) {
  const [localBooking, setLocalBooking] = useState<BookingInfoType>(
    booking || {
      confirmationNumber: '',
      checkIn: '',
      checkOut: '',
    }
  );

  const handleChange = (field: keyof BookingInfoType, value: string) => {
    const updated = { ...localBooking, [field]: value };
    setLocalBooking(updated);
    onChange?.(updated);
  };

  if (!isEditing && !booking?.confirmationNumber) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
        <CreditCard className="w-4 h-4" />
        Booking Information
      </h4>

      <div className="space-y-3">
        {/* Confirmation Number */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            Confirmation Number
          </label>
          {isEditing ? (
            <input
              type="text"
              value={localBooking.confirmationNumber}
              onChange={(e) => handleChange('confirmationNumber', e.target.value)}
              placeholder="ABC123XYZ"
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
            />
          ) : (
            <div className="px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg font-mono text-sm font-bold text-slate-700">
              {booking?.confirmationNumber}
            </div>
          )}
        </div>

        {/* Check-in Time */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Check-in Time
          </label>
          {isEditing ? (
            <input
              type="time"
              value={localBooking.checkIn || ''}
              onChange={(e) => handleChange('checkIn', e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
            />
          ) : (
            booking?.checkIn && (
              <div className="px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm text-slate-700">
                {booking.checkIn}
              </div>
            )
          )}
        </div>

        {/* Check-out Time */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Check-out Time
          </label>
          {isEditing ? (
            <input
              type="time"
              value={localBooking.checkOut || ''}
              onChange={(e) => handleChange('checkOut', e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
            />
          ) : (
            booking?.checkOut && (
              <div className="px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm text-slate-700">
                {booking.checkOut}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
