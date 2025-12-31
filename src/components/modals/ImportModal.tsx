import React, { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (text: string) => Promise<void>;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onImport(text);
      setText('');
      onClose();
    } catch (err) {
      setError("We couldn't parse that. Try pasting again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border-2 border-slate-200">
        <div className="flex items-center justify-between p-5 border-b-2 border-slate-100">
          <h3 className="font-extrabold text-xl text-slate-700 flex items-center gap-2">
            Import Trip
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors">
            <X className="w-6 h-6" strokeWidth={3} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 mb-4 flex gap-3">
             <div className="bg-white p-2 rounded-xl border-2 border-blue-100 h-fit text-blue-500">
                <Sparkles size={20} />
             </div>
             <div>
               <p className="text-sm font-bold text-blue-800 mb-1">Got a rough plan?</p>
               <p className="text-xs font-semibold text-blue-600/80 leading-relaxed">
                 Paste your email confirmation, notes, or raw text below. We'll turn it into a beautiful itinerary instantly.
               </p>
             </div>
          </div>
          
          <textarea
            className="w-full h-48 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none text-slate-700 font-medium placeholder:text-slate-400 transition-all"
            placeholder="e.g. Arriving in Paris on June 15th..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {error && (
            <div className="mt-3 text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 text-center">
              {error}
            </div>
          )}
        </div>

        <div className="p-5 bg-slate-50 border-t-2 border-slate-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="btn-press px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-700 uppercase tracking-wide"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            onClick={handleImport}
            disabled={loading || !text.trim()}
            className="btn-press px-6 py-3 text-sm font-black text-white bg-blue-500 hover:bg-blue-400 border-b-4 border-blue-700 rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Processing...' : 'Create Itinerary'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;