import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useOfflineStore } from '@/stores';

export function SyncStatus() {
  const { isOnline, pendingActions, failedActions, retryFailedActions, clearCompletedActions } = useOfflineStore();
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Auto-hide success message
  useEffect(() => {
    if (isOnline && pendingActions === 0 && failedActions === 0 && showDetails) {
      const timer = setTimeout(() => setShowDetails(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingActions, failedActions, showDetails]);

  // Don't show anything if online and no pending/failed syncs
  if (isOnline && pendingActions === 0 && failedActions === 0 && !showDetails) {
    return null;
  }

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryFailedActions();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleClearFailed = async () => {
    await clearCompletedActions();
    setShowDetails(false);
  };

  // Offline banner
  if (!isOnline) {
    return (
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up"
        role="status"
        aria-live="polite"
      >
        <div className="bg-amber-500 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 border-b-4 border-amber-700">
          <WifiOff className="w-5 h-5 animate-pulse-glow" aria-hidden="true" />
          <div>
            <p className="font-bold text-sm">You're offline</p>
            {pendingActions > 0 && (
              <p className="text-xs opacity-90">
                {pendingActions} change{pendingActions !== 1 ? 's' : ''} will sync when online
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Syncing in progress
  if (pendingActions > 0) {
    return (
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up"
        role="status"
        aria-live="polite"
      >
        <div className="bg-blue-500 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 border-b-4 border-blue-700">
          <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
          <div>
            <p className="font-bold text-sm">Syncing changes...</p>
            <p className="text-xs opacity-90">
              {pendingActions} item{pendingActions !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Failed syncs
  if (failedActions > 0) {
    return (
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up max-w-md"
        role="alert"
        aria-live="assertive"
      >
        <div className="bg-red-500 text-white px-6 py-3 rounded-xl shadow-xl border-b-4 border-red-700">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-bold text-sm">Sync failed</p>
                <p className="text-xs opacity-90 mb-3">
                  {failedActions} change{failedActions !== 1 ? 's' : ''} couldn't be synced
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="btn-press px-3 py-1.5 bg-white text-red-600 border-b-2 border-red-100 font-bold text-xs rounded-lg transition-all disabled:opacity-50"
                    data-testid="retry-sync-button"
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCw className="w-3 h-3 inline animate-spin mr-1" />
                        Retrying...
                      </>
                    ) : (
                      'Retry'
                    )}
                  </button>
                  <button
                    onClick={handleClearFailed}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold text-xs rounded-lg transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="p-1 hover:bg-white/20 rounded transition-all"
              aria-label="Close sync status"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state (auto-hides after 3 seconds)
  if (showDetails) {
    return (
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up"
        role="status"
        aria-live="polite"
      >
        <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 border-b-4 border-green-700">
          <CheckCircle className="w-5 h-5" aria-hidden="true" />
          <p className="font-bold text-sm">All changes synced</p>
        </div>
      </div>
    );
  }

  return null;
}
