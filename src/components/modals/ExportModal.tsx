import React, { useState } from 'react';
import { X, FileText, Table, Braces, Download, Loader2, Check } from 'lucide-react';
import { exportTrip, type ExportFormat } from '@/services/export';
import type { Trip } from '@/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
}

interface ExportOption {
  format: ExportFormat;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: 'pdf',
    icon: FileText,
    title: 'PDF Document',
    description: 'Print-ready itinerary with professional formatting',
  },
  {
    format: 'csv',
    icon: Table,
    title: 'CSV Spreadsheet',
    description: 'Import into Excel or Google Sheets',
  },
  {
    format: 'json',
    icon: Braces,
    title: 'JSON Data',
    description: 'Full data backup for re-import',
  },
];

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, trip }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await exportTrip(trip, selectedFormat);
      setSuccess(true);
      // Auto-close after success
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border-2 border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b-2 border-slate-100 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Download className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">
                Export Trip
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                {trip.title}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm font-bold text-slate-600 mb-4">
            Choose export format:
          </p>

          {/* Format Options */}
          <div className="grid grid-cols-3 gap-3">
            {EXPORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedFormat === option.format;

              return (
                <button
                  key={option.format}
                  onClick={() => setSelectedFormat(option.format)}
                  disabled={loading}
                  className={`
                    relative p-4 rounded-2xl border-2 transition-all text-center
                    ${isSelected
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}

                  <div className={`
                    w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center
                    ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}
                  `}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className={`font-bold text-sm ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                    {option.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 leading-tight">
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Trip Summary */}
          <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Days:</span>
              <span className="font-bold text-slate-700">{trip.itinerary.days.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-500">Activities:</span>
              <span className="font-bold text-slate-700">
                {trip.itinerary.days.reduce((sum, day) => sum + day.activities.length, 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-500">Destination:</span>
              <span className="font-bold text-slate-700">{trip.destination.name}</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
              <p className="text-sm font-bold text-red-600">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-center flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <p className="text-sm font-bold text-green-600">Export successful!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t-2 border-slate-100 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="btn-press px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-700 uppercase tracking-wide disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading || success}
            className="btn-press px-6 py-3 text-sm font-black text-white bg-blue-500 hover:bg-blue-400 border-b-4 border-blue-700 rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : success ? (
              <>
                <Check className="w-4 h-4" />
                Done
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {selectedFormat.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
