---
name: branded-types-usage
description: Use TripId, ActivityId, and other branded types correctly to prevent ID mixing bugs. Use when creating functions that accept IDs, working with database operations, or defining new ID types.
---

# Branded Types Usage

This project uses branded types to prevent accidentally mixing different ID types at compile time.

## Defined Branded Types

```typescript
// src/types/trip.ts

// Trip-related IDs
export type TripId = string & { readonly __brand: 'TripId' };
export type ActivityId = string & { readonly __brand: 'ActivityId' };
export type ExpenseId = string & { readonly __brand: 'ExpenseId' };
export type PhotoId = string & { readonly __brand: 'PhotoId' };
```

## Why Branded Types?

```typescript
// Without branded types - BUG COMPILES!
function deleteTrip(tripId: string): void { /* ... */ }
function deleteActivity(activityId: string): void { /* ... */ }

const actId = 'activity-123';
deleteTrip(actId); // Oops! Wrong function, but no error

// With branded types - BUG CAUGHT AT COMPILE TIME
function deleteTrip(tripId: TripId): void { /* ... */ }
function deleteActivity(activityId: ActivityId): void { /* ... */ }

const actId = 'activity-123' as ActivityId;
deleteTrip(actId); // Error: ActivityId not assignable to TripId
```

## Creating IDs

### Using nanoid (Most Common)

```typescript
import { nanoid } from 'nanoid';
import type { TripId, ActivityId } from '@/types';

// Create new IDs
const tripId = nanoid() as TripId;
const activityId = nanoid() as ActivityId;
```

### From Firestore Document ID

```typescript
// When reading from Firestore
const docRef = await addDoc(collection(db, 'trips'), data);
const tripId = docRef.id as TripId;

// When converting existing docs
function docToTrip(doc: DocumentSnapshot): Trip {
  return {
    ...doc.data(),
    id: doc.id as TripId,
  } as Trip;
}
```

### From URL/Route Parameters

```typescript
// In route handlers or components
function TripDetails() {
  const { tripId } = useParams<{ tripId: string }>();

  // Assert the type when using
  const typedTripId = tripId as TripId;

  const trip = useTripStore(state =>
    state.trips.find(t => t.id === typedTripId)
  );
}
```

## Function Parameters

### Always Use Branded Types

```typescript
// ✅ Correct - prevents wrong ID type
async function getTrip(tripId: TripId): Promise<Trip | null> {
  const docRef = doc(db, 'trips', tripId);
  // ...
}

async function getActivity(
  tripId: TripId,
  activityId: ActivityId
): Promise<Activity | null> {
  // Both IDs are type-safe
}

// ❌ Wrong - allows any string
async function getTrip(tripId: string): Promise<Trip | null> { }
```

### In Store Actions

```typescript
interface TripState {
  // Use branded types in signatures
  setActiveTrip: (tripId: TripId) => Promise<void>;
  deleteTrip: (tripId: TripId) => Promise<void>;
  updateActivity: (
    dayId: string,
    activityId: ActivityId,
    updates: Partial<Activity>
  ) => Promise<void>;
}
```

## Type Definitions

### Interface Properties

```typescript
interface Trip {
  id: TripId;  // Not string!
  userId: string;  // User IDs from Firebase Auth are regular strings
  title: string;
  // ...
}

interface Activity {
  id: ActivityId;  // Not string!
  tripId?: TripId;  // Optional reference to parent
  // ...
}
```

### Array Types

```typescript
// Array of IDs
const selectedTripIds: TripId[] = [];

// Map keyed by ID
const tripCache = new Map<TripId, Trip>();

// Record type
type TripsByStatus = Record<TripStatus, TripId[]>;
```

## Creating New Branded Types

When adding a new entity type:

```typescript
// 1. Define the branded type
export type DayId = string & { readonly __brand: 'DayId' };

// 2. Use in interface
interface DayItinerary {
  id: DayId;
  tripId: TripId;
  dayNumber: number;
  // ...
}

// 3. Create IDs with assertion
const dayId = nanoid() as DayId;

// 4. Use in function signatures
function updateDay(dayId: DayId, updates: Partial<DayItinerary>): void;
```

## Common Mistakes to Avoid

### Don't Use Plain Strings

```typescript
// ❌ Wrong
const trips = await getTripsByUser(userId);
const trip = trips.find(t => t.id === 'some-id');

// ✅ Correct
const trip = trips.find(t => t.id === ('some-id' as TripId));
// Or better, get the ID from a typed source
```

### Don't Mix ID Types

```typescript
// ❌ This should error
function deleteItem(id: TripId | ActivityId) {
  // Can't tell which collection to delete from!
}

// ✅ Use overloads or separate functions
function deleteTrip(tripId: TripId): void;
function deleteActivity(activityId: ActivityId): void;
```

### Cast at Boundaries Only

```typescript
// ✅ Cast once at the boundary (API, URL, user input)
const tripId = params.tripId as TripId;

// Then pass the typed value through your code
await loadTripDetails(tripId);  // No cast needed
await setActiveTrip(tripId);     // No cast needed
```

## Runtime Considerations

Branded types are erased at runtime - they're purely for compile-time safety:

```typescript
const tripId = 'trip-123' as TripId;
typeof tripId === 'string'; // true at runtime

// They're still just strings in JSON
JSON.stringify({ id: tripId }); // {"id":"trip-123"}
```
