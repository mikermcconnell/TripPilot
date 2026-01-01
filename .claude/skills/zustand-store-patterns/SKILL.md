---
name: zustand-store-patterns
description: Create and modify Zustand stores following TripPlanner conventions including persist middleware, Firebase integration, computed getters, and async actions. Use when creating new stores, adding store actions, or modifying state management.
---

# Zustand Store Patterns

This project uses Zustand v5 with specific patterns for state management.

## Store Structure

```typescript
// src/stores/exampleStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TripId } from '@/types';

interface ExampleState {
  // Data
  items: Item[];
  activeItem: Item | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  loadItems: () => Promise<void>;
  createItem: (input: CreateItemInput) => Promise<Item>;
  updateItem: (id: ItemId, updates: Partial<Item>) => Promise<void>;
  deleteItem: (id: ItemId) => Promise<void>;

  // Computed (functions that derive from state)
  getItemById: (id: ItemId) => Item | undefined;
  getFilteredItems: (filter: string) => Item[];
}
```

## Creating a Store

### Basic Store (No Persistence)

```typescript
export const useExampleStore = create<ExampleState>((set, get) => ({
  // Initial state
  items: [],
  activeItem: null,
  isLoading: false,
  error: null,

  // Async action with Firebase
  loadItems: async () => {
    set({ isLoading: true, error: null });

    try {
      const items = await exampleFirestoreService.getItems();
      set({ items, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load';
      set({ error: message, isLoading: false });
    }
  },

  // Create with optimistic update
  createItem: async (input) => {
    const tempId = nanoid() as ItemId;
    const newItem = { ...input, id: tempId };

    // Optimistic update
    set(state => ({ items: [...state.items, newItem] }));

    try {
      const id = await exampleFirestoreService.createItem(input);
      // Replace temp with real ID
      set(state => ({
        items: state.items.map(i => i.id === tempId ? { ...i, id } : i)
      }));
      return { ...newItem, id };
    } catch (error) {
      // Rollback
      set(state => ({
        items: state.items.filter(i => i.id !== tempId),
        error: 'Failed to create item'
      }));
      throw error;
    }
  },

  // Computed getter
  getItemById: (id) => {
    return get().items.find(item => item.id === id);
  },
}));
```

### Store with Persistence

```typescript
export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      activeTripId: null,
      activeTrip: null,
      isLoading: false,
      error: null,

      // ... actions
    }),
    {
      name: 'trip-store',
      // Only persist specific fields
      partialize: (state) => ({
        activeTripId: state.activeTripId,
      }),
    }
  )
);
```

## Action Patterns

### Update with Immutable State

```typescript
updateItem: async (id, updates) => {
  const item = get().getItemById(id);
  if (!item) return;

  // Optimistic update
  set(state => ({
    items: state.items.map(i =>
      i.id === id ? { ...i, ...updates } : i
    ),
    // Also update activeItem if it matches
    activeItem: state.activeItem?.id === id
      ? { ...state.activeItem, ...updates }
      : state.activeItem,
  }));

  try {
    await exampleFirestoreService.updateItem(id, updates);
  } catch (error) {
    // Rollback to original
    set(state => ({
      items: state.items.map(i => i.id === id ? item : i),
      error: 'Failed to update'
    }));
  }
},
```

### Delete with Confirmation State

```typescript
deleteItem: async (id) => {
  const item = get().getItemById(id);
  if (!item) return;

  // Remove from state
  set(state => ({
    items: state.items.filter(i => i.id !== id),
    activeItem: state.activeItem?.id === id ? null : state.activeItem,
  }));

  try {
    await exampleFirestoreService.deleteItem(id);
  } catch (error) {
    // Rollback - add back
    set(state => ({
      items: [...state.items, item],
      error: 'Failed to delete'
    }));
  }
},
```

### Complex Reorder Action

```typescript
reorderItems: async (sourceIndex, destinationIndex) => {
  const { items, activeItem } = get();
  if (!activeItem) return;

  // Use utility function for immutable reorder
  const reordered = reorderArray(items, sourceIndex, destinationIndex);

  set({ items: reordered });

  try {
    await exampleFirestoreService.updateItemOrder(activeItem.id, reordered);
  } catch (error) {
    set({ items, error: 'Failed to reorder' });
  }
},
```

## Subscribing to Real-Time Updates

```typescript
// In authStore or a dedicated subscription store
startTripListener: (userId: string) => {
  const unsubscribe = tripFirestoreService.subscribeToTrips(
    userId,
    (trips) => {
      set({ trips });
      // Refresh active trip if it was updated
      const { activeTripId } = get();
      if (activeTripId) {
        const activeTrip = trips.find(t => t.id === activeTripId);
        set({ activeTrip: activeTrip ?? null });
      }
    },
    (error) => set({ error: error.message })
  );

  set({ unsubscribe });
},

stopTripListener: () => {
  const { unsubscribe } = get();
  unsubscribe?.();
  set({ unsubscribe: null });
},
```

## Store Barrel Export

```typescript
// src/stores/index.ts
export { useTripStore } from './tripStore';
export { useAuthStore } from './authStore';
export { useUIStore } from './uiStore';
export { usePlannerStore } from './plannerStore';
```

## Accessing Store Outside React

```typescript
// For use in services or utilities
const { trips, activeTrip } = useTripStore.getState();
useTripStore.setState({ isLoading: true });
```

## Common Patterns in This Project

1. **Branded IDs**: Always use `TripId`, `ActivityId` types
2. **Optimistic updates**: Update UI first, then sync to Firebase
3. **Error rollback**: Restore previous state on failure
4. **Computed getters**: Use `get()` for derived data
5. **Selective persistence**: Only persist essential UI state
6. **Real-time sync**: Use Firestore listeners for multi-tab support
