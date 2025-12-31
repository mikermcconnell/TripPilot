import { useEffect, useRef } from 'react';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  itemName?: string;
}

const variantStyles = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    headerBg: 'bg-gradient-to-r from-red-500 to-red-600',
    confirmBg: 'bg-red-500 hover:bg-red-600 border-red-700',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    headerBg: 'bg-gradient-to-r from-amber-500 to-amber-600',
    confirmBg: 'bg-amber-500 hover:bg-amber-600 border-amber-700',
  },
  info: {
    icon: AlertTriangle,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    headerBg: 'bg-gradient-to-r from-blue-500 to-blue-600',
    confirmBg: 'bg-blue-500 hover:bg-blue-600 border-blue-700',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  itemName,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button on open
    cancelButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden"
      >
        {/* Header */}
        <div className={`${styles.headerBg} p-5 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${styles.iconBg} rounded-xl`}>
                <Icon className={`w-5 h-5 ${styles.iconColor}`} />
              </div>
              <h2 id="confirm-dialog-title" className="text-xl font-extrabold">
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              aria-label="Close"
              className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-600 leading-relaxed">
            {message}
            {itemName && (
              <>
                {' '}
                <span className="font-bold text-slate-800">"{itemName}"</span>?
              </>
            )}
          </p>

          {variant === 'danger' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-700 font-medium">
                This action cannot be undone. All associated data will be permanently removed.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 bg-slate-50 border-t border-slate-100">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 btn-press px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-300 font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 btn-press px-4 py-3 ${styles.confirmBg} text-white border-b-4 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
