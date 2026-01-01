import { MarkerClusterer, GridAlgorithm } from '@googlemaps/markerclusterer';

/**
 * Marker Clustering Configuration
 * Optimized for activity/place markers on trip maps
 */

export interface ClusterConfig {
  gridSize?: number;
  maxZoom?: number;
  minimumClusterSize?: number;
  styles?: ClusterStyle[];
}

export interface ClusterStyle {
  url?: string;
  textColor?: string;
  textSize?: number;
  width?: number;
  height?: number;
}

/**
 * Default cluster styling - blue theme matching app design
 */
const DEFAULT_CLUSTER_STYLES: ClusterStyle[] = [
  {
    textColor: 'white',
    textSize: 12,
    width: 40,
    height: 40,
  },
  {
    textColor: 'white',
    textSize: 13,
    width: 50,
    height: 50,
  },
  {
    textColor: 'white',
    textSize: 14,
    width: 60,
    height: 60,
  },
];

/**
 * Default cluster configuration
 */
const DEFAULT_CONFIG: Required<ClusterConfig> = {
  gridSize: 60,
  maxZoom: 15,
  minimumClusterSize: 2,
  styles: DEFAULT_CLUSTER_STYLES,
};

/**
 * Create a marker clusterer instance
 * @param map - Google Maps instance
 * @param markers - Array of markers to cluster
 * @param config - Optional clustering configuration
 * @returns MarkerClusterer instance
 */
export function createMarkerClusterer(
  map: google.maps.Map,
  markers: google.maps.marker.AdvancedMarkerElement[] = [],
  config: ClusterConfig = {}
): MarkerClusterer {
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Create custom renderer for cluster appearance
  const renderer = {
    render: ({ count, position }: { count: number; position: google.maps.LatLng }) => {
      // Determine cluster size tier (small/medium/large)
      const tier = count < 10 ? 0 : count < 50 ? 1 : 2;
      const style = mergedConfig.styles[tier] || mergedConfig.styles[0];

      // Create cluster marker element
      const clusterElement = document.createElement('div');
      clusterElement.className = 'custom-cluster-marker';
      clusterElement.style.cssText = `
        width: ${style.width}px;
        height: ${style.height}px;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: ${style.textSize}px;
        color: ${style.textColor};
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
        cursor: pointer;
        transition: transform 0.2s ease;
      `;
      clusterElement.textContent = count.toString();

      // Add hover effect
      clusterElement.addEventListener('mouseenter', () => {
        clusterElement.style.transform = 'scale(1.1)';
      });
      clusterElement.addEventListener('mouseleave', () => {
        clusterElement.style.transform = 'scale(1)';
      });

      // Create AdvancedMarkerElement for the cluster
      return new google.maps.marker.AdvancedMarkerElement({
        position,
        content: clusterElement,
        zIndex: 1000 + count, // Higher count = higher z-index
      });
    },
  };

  return new MarkerClusterer({
    map,
    markers,
    renderer,
    // Clustering algorithm options
    algorithm: new GridAlgorithm({
      gridSize: mergedConfig.gridSize,
      maxZoom: mergedConfig.maxZoom,
    }),
  });
}

/**
 * Add markers to an existing clusterer
 * @param clusterer - MarkerClusterer instance
 * @param markers - Markers to add
 */
export function addMarkersToClusterer(
  clusterer: MarkerClusterer,
  markers: google.maps.marker.AdvancedMarkerElement[]
): void {
  clusterer.addMarkers(markers);
}

/**
 * Remove markers from clusterer
 * @param clusterer - MarkerClusterer instance
 * @param markers - Markers to remove
 */
export function removeMarkersFromClusterer(
  clusterer: MarkerClusterer,
  markers: google.maps.marker.AdvancedMarkerElement[]
): void {
  clusterer.removeMarkers(markers);
}

/**
 * Clear all markers from clusterer
 * @param clusterer - MarkerClusterer instance
 */
export function clearClusterer(clusterer: MarkerClusterer): void {
  clusterer.clearMarkers();
}

/**
 * Update clusterer configuration
 * Recreates clusterer with new config
 * @param clusterer - Existing clusterer
 * @param map - Map instance
 * @param config - New configuration
 * @returns New MarkerClusterer instance
 */
export function updateClustererConfig(
  clusterer: MarkerClusterer,
  map: google.maps.Map,
  config: ClusterConfig
): MarkerClusterer {
  // Access protected markers property via type assertion
  const existingMarkers = (clusterer as unknown as { markers: google.maps.marker.AdvancedMarkerElement[] }).markers;
  clusterer.clearMarkers();
  clusterer.setMap(null);

  return createMarkerClusterer(map, existingMarkers, config);
}
