import { useState, useEffect, useCallback, useRef } from 'react';
import type { MarkerClusterer } from '@googlemaps/markerclusterer';
import {
  createMarkerClusterer,
  clearClusterer,
  type ClusterConfig,
} from '@/utils/markerClusterer';
import type { GeoCoordinates } from '@/types/maps';

export interface MarkerData {
  id: string;
  position: GeoCoordinates;
  title?: string;
  icon?: string;
  color?: string;
  onClick?: () => void;
}

interface UseMapMarkersOptions {
  map: google.maps.Map | null;
  enableClustering?: boolean;
  clusterConfig?: ClusterConfig;
}

interface UseMapMarkersResult {
  markers: google.maps.marker.AdvancedMarkerElement[];
  clusterer: MarkerClusterer | null;
  setMarkerData: (data: MarkerData[]) => void;
  clearMarkers: () => void;
  focusMarker: (id: string) => void;
}

/**
 * Hook to manage map markers with optional clustering
 * Automatically creates/updates markers and applies clustering
 */
export function useMapMarkers({
  map,
  enableClustering = true,
  clusterConfig = {},
}: UseMapMarkersOptions): UseMapMarkersResult {
  const [markers, setMarkers] = useState<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [clusterer, setClusterer] = useState<MarkerClusterer | null>(null);

  const markerDataRef = useRef<MarkerData[]>([]);
  const markerMapRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());

  /**
   * Create marker element from data
   */
  const createMarkerElement = useCallback((data: MarkerData): google.maps.marker.AdvancedMarkerElement => {
    // Create custom marker content
    const markerContent = document.createElement('div');
    markerContent.className = 'custom-map-marker';
    markerContent.style.cssText = `
      width: 32px;
      height: 32px;
      background: ${data.color || '#3b82f6'};
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s ease;
    `;

    // Add icon if provided
    if (data.icon) {
      const iconElement = document.createElement('span');
      iconElement.textContent = data.icon;
      iconElement.style.fontSize = '16px';
      markerContent.appendChild(iconElement);
    }

    // Add hover effect
    markerContent.addEventListener('mouseenter', () => {
      markerContent.style.transform = 'scale(1.2)';
    });
    markerContent.addEventListener('mouseleave', () => {
      markerContent.style.transform = 'scale(1)';
    });

    // Create marker
    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: { lat: data.position.lat, lng: data.position.lng },
      content: markerContent,
      title: data.title,
      map: enableClustering ? null : map, // Don't attach to map if clustering
    });

    // Add click listener
    if (data.onClick) {
      marker.addListener('click', data.onClick);
    }

    return marker;
  }, [map, enableClustering]);

  /**
   * Set marker data and create/update markers
   */
  const setMarkerData = useCallback((data: MarkerData[]) => {
    if (!map) return;

    markerDataRef.current = data;

    // Clear existing markers
    markers.forEach(marker => {
      marker.map = null;
    });
    markerMapRef.current.clear();

    // Create new markers
    const newMarkers = data.map(markerData => {
      const marker = createMarkerElement(markerData);
      markerMapRef.current.set(markerData.id, marker);
      return marker;
    });

    setMarkers(newMarkers);

    // Update clustering
    if (enableClustering && clusterer) {
      clearClusterer(clusterer);
      clusterer.addMarkers(newMarkers);
    }
  }, [map, markers, clusterer, enableClustering, createMarkerElement]);

  /**
   * Clear all markers
   */
  const clearMarkers = useCallback(() => {
    markers.forEach(marker => {
      marker.map = null;
    });
    markerMapRef.current.clear();
    setMarkers([]);

    if (clusterer) {
      clearClusterer(clusterer);
    }
  }, [markers, clusterer]);

  /**
   * Focus on a specific marker (pan and zoom)
   */
  const focusMarker = useCallback((id: string) => {
    const marker = markerMapRef.current.get(id);
    if (!marker || !map) return;

    const position = marker.position as google.maps.LatLng;
    map.panTo(position);
    map.setZoom(15);

    // Animate marker
    const content = marker.content as HTMLElement;
    if (content) {
      content.style.transform = 'scale(1.5)';
      setTimeout(() => {
        content.style.transform = 'scale(1)';
      }, 300);
    }
  }, [map]);

  // Initialize clusterer when map is available
  useEffect(() => {
    if (!map || !enableClustering) {
      return;
    }

    const newClusterer = createMarkerClusterer(map, markers, clusterConfig);
    setClusterer(newClusterer);

    return () => {
      if (newClusterer) {
        clearClusterer(newClusterer);
        newClusterer.setMap(null);
      }
    };
  }, [map, enableClustering]); // Intentionally omit markers and clusterConfig to avoid recreating

  // Update clusterer when markers change
  useEffect(() => {
    if (clusterer && enableClustering) {
      clearClusterer(clusterer);
      if (markers.length > 0) {
        clusterer.addMarkers(markers);
      }
    }
  }, [markers, clusterer, enableClustering]);

  return {
    markers,
    clusterer,
    setMarkerData,
    clearMarkers,
    focusMarker,
  };
}
