import React from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

/**
 * Global Google Maps API provider.
 * Wraps the entire app to ensure Google Maps services (including Places Autocomplete)
 * are available to all components.
 */
export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  if (!apiKey) {
    console.warn('Google Maps API key not configured. Some features may not work.');
    return <>{children}</>;
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['places']}
      onLoad={() => console.log('Google Maps API loaded')}
    >
      {children}
    </APIProvider>
  );
};
