import { useState, useEffect } from 'react';

/**
 * Hook to track online/offline status
 * @returns boolean indicating if the browser is online
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // Handler for going online
    const handleOnline = () => setIsOnline(true);

    // Handler for going offline
    const handleOffline = () => setIsOnline(false);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Extended online status with connection quality estimation
 */
export interface ConnectionInfo {
  isOnline: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number; // Mbps
  rtt?: number; // Round-trip time in ms
  saveData?: boolean;
}

/**
 * Hook to get detailed connection information
 * Uses Network Information API when available
 */
export function useConnectionInfo(): ConnectionInfo {
  const isOnline = useOnlineStatus();
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    isOnline,
  });

  useEffect(() => {
    // Type assertion for Network Information API
    const connection = (navigator as any).connection ||
                       (navigator as any).mozConnection ||
                       (navigator as any).webkitConnection;

    if (!connection) {
      setConnectionInfo({ isOnline });
      return;
    }

    const updateConnectionInfo = () => {
      setConnectionInfo({
        isOnline,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      });
    };

    // Initial update
    updateConnectionInfo();

    // Listen for changes
    connection.addEventListener('change', updateConnectionInfo);

    return () => {
      connection.removeEventListener('change', updateConnectionInfo);
    };
  }, [isOnline]);

  return connectionInfo;
}
