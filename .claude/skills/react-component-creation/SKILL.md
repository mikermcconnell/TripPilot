---
name: react-component-creation
description: Create React components following TripPlanner structure including TypeScript props, Tailwind styling, lazy loading, and component hierarchy. Use when creating new components, modals, or UI features.
---

# React Component Creation

This project uses React 19 with TypeScript, Tailwind CSS, and specific organizational patterns.

## Component Hierarchy

```
src/components/
├── auth/           # Authentication components
├── chat/           # Chat/AI assistant
├── common/         # Reusable utilities (ErrorBoundary, LoadingSpinner)
├── features/       # Feature-specific components
│   ├── activity/   # Activity management
│   ├── day/        # Day management
│   ├── today/      # Today view
│   └── trips/      # Trip CRUD
├── layout/         # App structure (Header, Sidebar, AppShell)
├── maps/           # Google Maps integration
├── modals/         # Full-screen overlays
├── optimization/   # Route optimization
└── planner/        # Drag-and-drop planner
```

## Basic Component Template

```typescript
// src/components/features/trips/TripCard.tsx
import { memo } from 'react';
import type { Trip, TripId } from '@/types';

interface TripCardProps {
  trip: Trip;
  onSelect: (tripId: TripId) => void;
  onEdit?: (tripId: TripId) => void;
  className?: string;
}

export const TripCard = memo(function TripCard({
  trip,
  onSelect,
  onEdit,
  className = '',
}: TripCardProps) {
  const handleClick = () => onSelect(trip.id);

  return (
    <div
      className={`rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <h3 className="font-semibold text-gray-900">{trip.title}</h3>
      <p className="text-sm text-gray-500">{trip.destination.name}</p>

      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(trip.id);
          }}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          Edit
        </button>
      )}
    </div>
  );
});
```

## Component with Store Integration

```typescript
// src/components/features/trips/TripList.tsx
import { useTripStore } from '@/stores';
import { TripCard } from './TripCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';

export function TripList() {
  const { trips, isLoading, error, setActiveTrip } = useTripStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (trips.length === 0) {
    return <EmptyState message="No trips yet" />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {trips.map((trip) => (
        <TripCard
          key={trip.id}
          trip={trip}
          onSelect={setActiveTrip}
        />
      ))}
    </div>
  );
}
```

## Modal Component Pattern

```typescript
// src/components/modals/CreateTripModal.tsx
import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTripStore } from '@/stores';
import type { CreateTripInput } from '@/types';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTripModal({ isOpen, onClose }: CreateTripModalProps) {
  const { createTrip } = useTripStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateTripInput>({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
  });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createTrip(formData);
      onClose();
    } catch (error) {
      console.error('Failed to create trip:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, createTrip, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create New Trip</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* More fields... */}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## Lazy Loading Pattern

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Lazy load heavy components
const MapView = lazy(() => import('@/components/modals/MapView'));
const ChatAssistant = lazy(() => import('@/components/modals/ChatAssistant'));
const ImportModal = lazy(() => import('@/components/modals/ImportModal'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {showMap && <MapView />}
      {showChat && <ChatAssistant />}
      {showImport && <ImportModal />}
    </Suspense>
  );
}
```

## Common Component Patterns

### Icon Button

```typescript
<button
  onClick={handleClick}
  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
  title="Edit"
>
  <Edit className="w-4 h-4 text-gray-600" />
</button>
```

### Conditional Classes

```typescript
<div
  className={`
    p-4 rounded-lg border
    ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow'}
  `}
>
```

### Loading State

```typescript
{isLoading ? (
  <LoadingSpinner size="sm" />
) : (
  <span>{content}</span>
)}
```

## File Naming

- Components: `PascalCase.tsx` (e.g., `TripCard.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `usePlacesAutocomplete.ts`)
- Utilities: `camelCase.ts` (e.g., `plannerUtils.ts`)
- Types: `camelCase.ts` (e.g., `trip.ts`)

## Import Order

```typescript
// 1. React
import { useState, useEffect, useCallback, memo } from 'react';

// 2. Third-party libraries
import { format } from 'date-fns';
import { Map } from 'lucide-react';

// 3. Local stores
import { useTripStore, useUIStore } from '@/stores';

// 4. Local components
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// 5. Local utilities/services
import { formatDate } from '@/utils/dateUtils';

// 6. Types
import type { Trip, TripId } from '@/types';
```
