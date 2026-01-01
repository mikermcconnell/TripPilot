import React, { useState } from 'react';
import { X, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import type { Activity } from '@/types/itinerary';

interface DeleteActivityModalProps {
  isOpen: boolean;
  activity: Activity | null;
  dayNumber: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteActivityModal: React.FC<DeleteActivityModalProps> = ({
  isOpen,
  activity,
  dayNumber,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !activity) return null;

  const handleConfirm = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Delete Activity</h2>
              <p className="text-xs text-slate-500">
                Day {dayNumber}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-slate-700 mb-4">
              Are you sure you want to delete this activity?
            </p>

            {/* Activity Preview */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
              <div className="font-bold text-slate-800 mb-1">
                {activity.description}
              </div>
              {activity.time && (
                <div className="text-sm text-slate-600 mb-1">
                  {activity.time}
                </div>
              )}
              {activity.location?.name && (
                <div className="text-sm text-slate-500">
                  {activity.location.name}
                </div>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border-2 border-amber-100 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-800">
              This action cannot be undone.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-bold border-b-4 border-red-700 disabled:border-slate-400 btn-press flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Activity
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
