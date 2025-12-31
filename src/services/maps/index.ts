/**
 * Google Maps Services
 * Barrel export for all maps-related services
 */

// Services
export { directionsService } from './directionsService';
export { distanceMatrixService } from './distanceMatrixService';
export { placesService } from './placesService';
export { routeOptimizationService } from './routeOptimizationService';

// Service-specific types
export type {
  OptimizationResult,
  OptimizationOptions,
} from './routeOptimizationService';
