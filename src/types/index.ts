// Re-export all types
export * from './itinerary';
export * from './chat';
export * from './tools';
export * from './trip';
export * from './budget';
export * from './packing';
export * from './photo';
export * from './notification';
export * from './country';

// Component prop helpers
export type WithChildren<T = {}> = T & { children?: React.ReactNode };
export type Nullable<T> = T | null;
