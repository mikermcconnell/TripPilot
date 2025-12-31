import { useState, useEffect } from 'react';
import { Check, Loader2, AlertCircle, CloudOff } from 'lucide-react';
import { useOfflineStore } from '@/stores';

type SaveStatus = 'saved' | 'saving' | 'error' | 'offline';

export function SaveIndicator() {
  const { isOnline, pendingActions, failedActions } = useOfflineStore();
  const [showSaved, setShowSaved] = useState(false);
  const [wasOnline, setWasOnline] = useState(isOnline);

  // Determine current status
  let status: SaveStatus = 'saved';
  if (!isOnline) {
    status = 'offline';
  } else if (failedActions > 0) {
    status = 'error';
  } else if (pendingActions > 0) {
    status = 'saving';
  }

  // Show "Saved" briefly after syncing completes
  useEffect(() => {
    if (status === 'saved' && wasOnline && pendingActions === 0) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status, wasOnline, pendingActions]);

  // Track online status changes
  useEffect(() => {
    setWasOnline(isOnline);
  }, [isOnline]);

  // Don't show anything when saved and indicator has faded
  if (status === 'saved' && !showSaved) {
    return null;
  }

  const statusConfig = {
    saved: {
      icon: Check,
      text: 'Saved',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      iconColor: 'text-green-600',
      animate: false,
    },
    saving: {
      icon: Loader2,
      text: 'Saving...',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-600',
      animate: true,
    },
    error: {
      icon: AlertCircle,
      text: 'Sync failed',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      iconColor: 'text-red-600',
      animate: false,
    },
    offline: {
      icon: CloudOff,
      text: 'Offline',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      iconColor: 'text-amber-600',
      animate: false,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 ${config.bgColor} rounded-lg transition-all duration-300 ${
        showSaved ? 'animate-in fade-in' : ''
      }`}
      role="status"
      aria-live="polite"
    >
      <Icon
        className={`w-3.5 h-3.5 ${config.iconColor} ${config.animate ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      <span className={`text-xs font-bold ${config.textColor}`}>
        {config.text}
      </span>
    </div>
  );
}

/**
 * A more compact version for tight spaces
 */
export function SaveIndicatorCompact() {
  const { isOnline, pendingActions, failedActions } = useOfflineStore();
  const [showSaved, setShowSaved] = useState(false);

  let status: SaveStatus = 'saved';
  if (!isOnline) {
    status = 'offline';
  } else if (failedActions > 0) {
    status = 'error';
  } else if (pendingActions > 0) {
    status = 'saving';
  }

  useEffect(() => {
    if (status === 'saved' && pendingActions === 0) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status, pendingActions]);

  if (status === 'saved' && !showSaved) {
    return (
      <div className="w-2 h-2 rounded-full bg-green-500" title="All changes saved" />
    );
  }

  const statusConfig = {
    saved: {
      color: 'bg-green-500',
      title: 'Saved',
      pulse: false,
    },
    saving: {
      color: 'bg-blue-500',
      title: 'Saving...',
      pulse: true,
    },
    error: {
      color: 'bg-red-500',
      title: 'Sync failed',
      pulse: false,
    },
    offline: {
      color: 'bg-amber-500',
      title: 'Offline - changes saved locally',
      pulse: true,
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`w-2.5 h-2.5 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}
      title={config.title}
      role="status"
      aria-label={config.title}
    />
  );
}
