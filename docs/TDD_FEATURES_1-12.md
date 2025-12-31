# Technical Design Document: TripPilot Features 1-12

**Version:** 1.0
**Date:** December 30, 2024
**Author:** Principal Software Architect
**Target Implementer:** Junior Engineer (Claude 3.5 Sonnet)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Analysis](#2-current-architecture-analysis)
3. [Complete File Structure](#3-complete-file-structure)
4. [New Dependencies](#4-new-dependencies)
5. [Data Models & TypeScript Interfaces](#5-data-models--typescript-interfaces)
6. [Feature Specifications](#6-feature-specifications)
7. [Core Logic & Algorithms](#7-core-logic--algorithms)
8. [API Contracts](#8-api-contracts)
9. [Edge Cases & Error Handling](#9-edge-cases--error-handling)
10. [Implementation Steps](#10-implementation-steps)
11. [Testing Strategy](#11-testing-strategy)

---

## 1. Executive Summary

This TDD covers the implementation of 12 major features for TripPilot PWA:

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| 1 | Offline-First Architecture | Critical | High |
| 2 | Mobile-First Responsive Redesign | Critical | Medium |
| 3 | Quick Access "Today View" | High | Low |
| 4 | Activity Details & Booking Integration | High | Medium |
| 5 | Smart Notifications & Reminders | High | Medium |
| 6 | Multi-Trip Management | High | Medium |
| 7 | Export & Sharing | Medium | Low |
| 8 | Budget Tracking | Medium | Medium |
| 9 | Photo Journal Integration | Medium | Medium |
| 10 | Packing List Generator | Medium | Low |
| 11 | Local Recommendations Engine | Low | Medium |
| 12 | Transportation Booking Deep Links | Low | Low |

**Architectural Decision:** All features will be implemented using a **feature-based folder structure** with clear separation of concerns. State management will use **Zustand** (replacing scattered hooks) for predictable global state with built-in persistence.

---

## 2. Current Architecture Analysis

### Existing Tech Stack
- React 19.0.0 + TypeScript 5.7.2
- Vite 6.0.6 + vite-plugin-pwa 0.21.1
- Tailwind CSS 3.4.17
- @google/genai 1.0.1
- @vis.gl/react-google-maps 1.1.0
- lucide-react 0.469.0

### Current Data Flow
```
localStorage ──► useLocalStorage hook ──► useItinerary hook ──► Components
                                              │
                                              ▼
                                         useChat hook ──► Gemini API
```

### Identified Limitations
1. Single itinerary only (no multi-trip support)
2. No offline data layer (localStorage only)
3. Desktop-centric layout (480px fixed sidebar)
4. No activity details beyond basic fields
5. No notification system

---

## 3. Complete File Structure

```
src/
├── app/                              # NEW: App shell & routing
│   ├── App.tsx                       # MODIFIED: Main app with routing
│   ├── AppShell.tsx                  # NEW: Responsive shell wrapper
│   └── routes.tsx                    # NEW: Route definitions
│
├── components/
│   ├── common/                       # NEW: Shared components
│   │   ├── BottomNav.tsx             # NEW: Mobile bottom navigation
│   │   ├── Button.tsx                # NEW: Unified button component
│   │   ├── Card.tsx                  # NEW: Unified card component
│   │   ├── EmptyState.tsx            # NEW: Empty state placeholder
│   │   ├── LoadingSpinner.tsx        # NEW: Loading indicator
│   │   ├── Modal.tsx                 # NEW: Base modal component
│   │   ├── OfflineIndicator.tsx      # NEW: Connection status banner
│   │   ├── PullToRefresh.tsx         # NEW: Mobile pull-to-refresh
│   │   ├── SwipeableView.tsx         # NEW: Swipe gesture container
│   │   └── Toast.tsx                 # NEW: Toast notification
│   │
│   ├── layout/                       # NEW: Layout components
│   │   ├── Header.tsx                # MODIFIED: Responsive header
│   │   ├── Sidebar.tsx               # NEW: Collapsible sidebar
│   │   ├── MobileDrawer.tsx          # NEW: Mobile slide-out drawer
│   │   └── ViewSwitcher.tsx          # NEW: Extracted view tabs
│   │
│   ├── features/                     # NEW: Feature-specific components
│   │   ├── today/                    # Feature 3: Today View
│   │   │   ├── TodayView.tsx
│   │   │   ├── NextActivityCard.tsx
│   │   │   ├── CountdownTimer.tsx
│   │   │   └── DayProgress.tsx
│   │   │
│   │   ├── trips/                    # Feature 6: Multi-Trip
│   │   │   ├── TripList.tsx
│   │   │   ├── TripCard.tsx
│   │   │   ├── CreateTripModal.tsx
│   │   │   └── TripSwitcher.tsx
│   │   │
│   │   ├── activity/                 # Feature 4: Activity Details
│   │   │   ├── ActivityDetail.tsx
│   │   │   ├── ActivityEditModal.tsx
│   │   │   ├── BookingInfo.tsx
│   │   │   ├── DocumentAttachment.tsx
│   │   │   └── QuickActions.tsx
│   │   │
│   │   ├── budget/                   # Feature 8: Budget Tracking
│   │   │   ├── BudgetOverview.tsx
│   │   │   ├── ExpenseList.tsx
│   │   │   ├── AddExpenseModal.tsx
│   │   │   ├── CategoryBreakdown.tsx
│   │   │   └── CurrencyConverter.tsx
│   │   │
│   │   ├── packing/                  # Feature 10: Packing List
│   │   │   ├── PackingList.tsx
│   │   │   ├── PackingCategory.tsx
│   │   │   ├── PackingItem.tsx
│   │   │   └── GenerateListButton.tsx
│   │   │
│   │   ├── photos/                   # Feature 9: Photo Journal
│   │   │   ├── PhotoGallery.tsx
│   │   │   ├── PhotoUpload.tsx
│   │   │   ├── PhotoViewer.tsx
│   │   │   └── MemoryTimeline.tsx
│   │   │
│   │   ├── export/                   # Feature 7: Export & Sharing
│   │   │   ├── ExportModal.tsx
│   │   │   ├── ShareSheet.tsx
│   │   │   ├── PDFPreview.tsx
│   │   │   └── CalendarExport.tsx
│   │   │
│   │   ├── recommendations/          # Feature 11: Recommendations
│   │   │   ├── NearbyPanel.tsx
│   │   │   ├── RecommendationCard.tsx
│   │   │   └── PlaceDetails.tsx
│   │   │
│   │   └── transport/                # Feature 12: Transport Links
│   │       ├── TransportOptions.tsx
│   │       ├── RideShareButton.tsx
│   │       └── TransitDirections.tsx
│   │
│   └── modals/                       # EXISTING: Refactored
│       ├── ChatAssistant.tsx         # MODIFIED
│       ├── ImportModal.tsx           # EXISTING
│       ├── ItineraryView.tsx         # MODIFIED
│       ├── MapView.tsx               # MODIFIED
│       ├── TravelView.tsx            # MODIFIED
│       └── TripOverview.tsx          # MODIFIED
│
├── stores/                           # NEW: Zustand stores
│   ├── index.ts                      # Store exports
│   ├── tripStore.ts                  # Multi-trip state
│   ├── uiStore.ts                    # UI state (view, modals)
│   ├── offlineStore.ts               # Offline queue & sync
│   ├── budgetStore.ts                # Budget/expenses
│   ├── packingStore.ts               # Packing lists
│   ├── photoStore.ts                 # Photo metadata
│   └── notificationStore.ts          # Notifications
│
├── services/                         # MODIFIED: Service layer
│   ├── geminiService.ts              # EXISTING
│   ├── db/                           # NEW: IndexedDB layer
│   │   ├── index.ts                  # DB initialization
│   │   ├── tripRepository.ts         # Trip CRUD operations
│   │   ├── photoRepository.ts        # Photo blob storage
│   │   └── syncQueue.ts              # Offline action queue
│   │
│   ├── notifications/                # NEW: Feature 5
│   │   ├── notificationService.ts    # Push notification logic
│   │   ├── reminderScheduler.ts      # Scheduling engine
│   │   └── permissionManager.ts      # Permission handling
│   │
│   ├── export/                       # NEW: Feature 7
│   │   ├── pdfGenerator.ts           # PDF creation
│   │   ├── icsGenerator.ts           # Calendar export
│   │   └── shareService.ts           # Web Share API
│   │
│   ├── currency/                     # NEW: Feature 8
│   │   ├── currencyService.ts        # Exchange rate API
│   │   └── currencyCache.ts          # Rate caching
│   │
│   └── places/                       # NEW: Feature 11
│       ├── placesService.ts          # Google Places API
│       └── placesCache.ts            # Results caching
│
├── hooks/                            # MODIFIED: Custom hooks
│   ├── useItinerary.ts               # DEPRECATED → use tripStore
│   ├── useChat.ts                    # MODIFIED: uses tripStore
│   ├── useLocalStorage.ts            # DEPRECATED → use IndexedDB
│   ├── useOnlineStatus.ts            # NEW: Connection detection
│   ├── useGeolocation.ts             # NEW: Device location
│   ├── useSwipeGesture.ts            # NEW: Touch gestures
│   ├── useNotifications.ts           # NEW: Notification hook
│   ├── useMediaQuery.ts              # NEW: Responsive breakpoints
│   └── useTodayView.ts               # NEW: Today view logic
│
├── types/                            # MODIFIED: Type definitions
│   ├── index.ts                      # EXISTING
│   ├── itinerary.ts                  # MODIFIED: Extended
│   ├── chat.ts                       # EXISTING
│   ├── tools.ts                      # EXISTING
│   ├── trip.ts                       # NEW: Multi-trip types
│   ├── budget.ts                     # NEW: Budget types
│   ├── packing.ts                    # NEW: Packing types
│   ├── photo.ts                      # NEW: Photo types
│   ├── notification.ts               # NEW: Notification types
│   └── offline.ts                    # NEW: Sync queue types
│
├── utils/                            # MODIFIED: Utilities
│   ├── geo.ts                        # EXISTING
│   ├── date.ts                       # MODIFIED: Extended
│   ├── currency.ts                   # NEW: Currency formatting
│   ├── file.ts                       # NEW: File handling
│   ├── share.ts                      # NEW: Share utilities
│   ├── validation.ts                 # NEW: Input validation
│   └── id.ts                         # NEW: ID generation (nanoid)
│
├── constants/                        # MODIFIED: Constants
│   ├── defaults.ts                   # MODIFIED
│   ├── currencies.ts                 # NEW: Currency codes
│   ├── packingTemplates.ts           # NEW: Packing suggestions
│   └── categories.ts                 # NEW: Expense categories
│
├── styles/
│   ├── design-tokens.ts              # EXISTING
│   └── STYLE_GUIDE.md                # EXISTING
│
├── workers/                          # NEW: Web Workers
│   └── pdfWorker.ts                  # PDF generation worker
│
├── index.css                         # MODIFIED: Mobile styles
└── main.tsx                          # MODIFIED: SW & notifications
```

---

## 4. New Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "zustand": "^5.0.2",
    "idb": "^8.0.1",
    "nanoid": "^5.0.9",
    "date-fns": "^4.1.0",
    "date-fns-tz": "^3.2.0",
    "@react-pdf/renderer": "^4.1.5",
    "ics": "^3.8.1",
    "framer-motion": "^11.15.0",
    "use-gesture": "^10.3.1"
  },
  "devDependencies": {
    "@types/wicg-file-system-access": "^2023.10.5"
  }
}
```

**Dependency Justification:**
- `zustand@5.0.2`: Lightweight state management with persistence middleware
- `idb@8.0.1`: Promise-based IndexedDB wrapper (tiny, well-maintained)
- `nanoid@5.0.9`: Secure, URL-friendly unique ID generation
- `date-fns@4.1.0`: Modern date manipulation (tree-shakeable)
- `date-fns-tz@3.2.0`: Timezone support for travel dates
- `@react-pdf/renderer@4.1.5`: Client-side PDF generation
- `ics@3.8.1`: iCalendar file generation
- `framer-motion@11.15.0`: Gesture animations for mobile
- `use-gesture@10.3.1`: Touch gesture handling

---

## 5. Data Models & TypeScript Interfaces

### 5.1 Core Trip Types (Extended)

```typescript
// src/types/trip.ts

import { Itinerary, Activity, GeoCoordinates } from './itinerary';

/** Unique identifier type for type safety */
export type TripId = string & { readonly brand: unique symbol };
export type ActivityId = string & { readonly brand: unique symbol };
export type ExpenseId = string & { readonly brand: unique symbol };
export type PhotoId = string & { readonly brand: unique symbol };

/** Trip status for lifecycle management */
export type TripStatus = 'planning' | 'upcoming' | 'active' | 'completed' | 'archived';

/** Extended Trip model (replaces single Itinerary) */
export interface Trip {
  id: TripId;
  title: string;
  description?: string;
  coverImageUrl?: string;

  // Dates
  startDate: string;        // ISO 8601: YYYY-MM-DD
  endDate: string;          // ISO 8601: YYYY-MM-DD
  timezone: string;         // IANA timezone: 'America/New_York'

  // Location
  destination: {
    name: string;
    country: string;
    countryCode: string;    // ISO 3166-1 alpha-2
    coordinates: GeoCoordinates;
  };

  // Content
  itinerary: Itinerary;

  // Metadata
  status: TripStatus;
  createdAt: string;        // ISO 8601 datetime
  updatedAt: string;        // ISO 8601 datetime
  lastAccessedAt: string;   // For sorting by recency

  // Feature flags
  budgetEnabled: boolean;
  packingEnabled: boolean;
  photosEnabled: boolean;

  // Settings
  defaultCurrency: string;  // ISO 4217: 'USD', 'EUR'
}

/** Trip summary for list views (denormalized for performance) */
export interface TripSummary {
  id: TripId;
  title: string;
  destination: string;
  coverImageUrl?: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  daysCount: number;
  activitiesCount: number;
}

/** Create trip input */
export interface CreateTripInput {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  timezone?: string;
  defaultCurrency?: string;
}
```

### 5.2 Extended Activity Types

```typescript
// src/types/itinerary.ts (MODIFIED)

export interface Activity {
  id: ActivityId;
  time?: string;
  endTime?: string;           // NEW: Duration support
  description: string;
  location: LocationData;
  type: ActivityType;

  // NEW: Feature 4 - Activity Details
  details?: ActivityDetails;
}

/** Extended activity information */
export interface ActivityDetails {
  // Booking Information
  booking?: BookingInfo;

  // Contact
  phone?: string;
  website?: string;
  email?: string;

  // Notes
  notes?: string;

  // Attachments (stored as references, blobs in IndexedDB)
  attachments?: AttachmentRef[];

  // Cost tracking
  estimatedCost?: MoneyAmount;
  actualCost?: MoneyAmount;
  isPaid?: boolean;

  // Tags for filtering
  tags?: string[];
}

/** Booking confirmation details */
export interface BookingInfo {
  confirmationNumber?: string;
  provider?: string;          // 'Booking.com', 'Airbnb', etc.
  bookingUrl?: string;
  checkIn?: string;           // Time: 'HH:MM'
  checkOut?: string;
  guestCount?: number;
  roomType?: string;

  // For flights
  flightNumber?: string;
  airline?: string;
  terminal?: string;
  gate?: string;
  seatNumber?: string;
}

/** File attachment reference */
export interface AttachmentRef {
  id: string;
  filename: string;
  mimeType: string;
  size: number;               // bytes
  thumbnailUrl?: string;      // Base64 data URL for images
  createdAt: string;
}

/** Money with currency */
export interface MoneyAmount {
  amount: number;
  currency: string;           // ISO 4217
}
```

### 5.3 Budget Types

```typescript
// src/types/budget.ts

export type ExpenseCategory =
  | 'accommodation'
  | 'food'
  | 'transport'
  | 'activities'
  | 'shopping'
  | 'other';

export interface Expense {
  id: ExpenseId;
  tripId: TripId;
  activityId?: ActivityId;    // Optional link to activity

  description: string;
  category: ExpenseCategory;
  amount: MoneyAmount;

  // Conversion
  convertedAmount?: MoneyAmount;  // In trip's default currency
  exchangeRate?: number;

  // Metadata
  date: string;               // ISO date
  time?: string;
  location?: string;

  // Receipt
  receiptAttachmentId?: string;

  // Tracking
  isPaid: boolean;
  paymentMethod?: 'cash' | 'card' | 'other';

  createdAt: string;
  updatedAt: string;
}

export interface TripBudget {
  tripId: TripId;
  totalBudget?: MoneyAmount;
  expenses: Expense[];

  // Computed (stored for offline)
  totalSpent: MoneyAmount;
  remainingBudget?: MoneyAmount;

  // Per-category breakdown
  categoryTotals: Record<ExpenseCategory, number>;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
}
```

### 5.4 Packing List Types

```typescript
// src/types/packing.ts

export type PackingCategory =
  | 'clothing'
  | 'toiletries'
  | 'electronics'
  | 'documents'
  | 'medicine'
  | 'accessories'
  | 'other';

export interface PackingItem {
  id: string;
  tripId: TripId;

  name: string;
  category: PackingCategory;
  quantity: number;

  isPacked: boolean;
  isEssential: boolean;

  // For AI-generated items
  aiSuggested?: boolean;
  suggestionReason?: string;
}

export interface PackingList {
  tripId: TripId;
  items: PackingItem[];

  // Progress tracking
  totalItems: number;
  packedItems: number;

  // Generation metadata
  generatedAt?: string;
  generationPrompt?: string;
}

/** Input for AI packing list generation */
export interface PackingGenerationInput {
  destination: string;
  startDate: string;
  endDate: string;
  activities: string[];       // Activity types from itinerary
  weather?: WeatherForecast[];
  travelerPreferences?: {
    gender?: 'male' | 'female' | 'other';
    includeToiletries: boolean;
    includeMedicine: boolean;
    businessTrip: boolean;
  };
}

export interface WeatherForecast {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
}
```

### 5.5 Photo Types

```typescript
// src/types/photo.ts

export interface TripPhoto {
  id: PhotoId;
  tripId: TripId;
  activityId?: ActivityId;
  dayNumber?: number;

  // File info
  filename: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;

  // Storage
  blobKey: string;            // IndexedDB blob reference
  thumbnailBlobKey: string;

  // Metadata
  caption?: string;
  location?: GeoCoordinates;
  takenAt?: string;           // EXIF date or user-set

  createdAt: string;
  updatedAt: string;
}

export interface PhotoUploadInput {
  file: File;
  tripId: TripId;
  activityId?: ActivityId;
  caption?: string;
}
```

### 5.6 Notification Types

```typescript
// src/types/notification.ts

export type NotificationType =
  | 'departure_reminder'      // X hours before activity
  | 'checkin_reminder'        // Hotel/flight check-in
  | 'activity_start'          // Activity is starting
  | 'time_to_leave'           // Based on travel time
  | 'weather_alert'           // Weather warning
  | 'timezone_change';        // Timezone shift

export interface ScheduledNotification {
  id: string;
  tripId: TripId;
  activityId?: ActivityId;

  type: NotificationType;
  title: string;
  body: string;

  scheduledFor: string;       // ISO datetime
  timezone: string;

  // Delivery
  delivered: boolean;
  deliveredAt?: string;
  dismissed: boolean;

  // Action
  actionUrl?: string;         // Deep link into app
}

export interface NotificationPreferences {
  enabled: boolean;
  departureReminders: {
    enabled: boolean;
    hoursBeforeDefault: number;   // Default: 2
  };
  checkinReminders: {
    enabled: boolean;
    hoursBeforeDefault: number;   // Default: 24
  };
  timeToLeaveAlerts: {
    enabled: boolean;
    minutesBuffer: number;        // Default: 15
  };
  weatherAlerts: boolean;
  quietHours?: {
    enabled: boolean;
    start: string;                // 'HH:MM'
    end: string;
  };
}
```

### 5.7 Offline Sync Types

```typescript
// src/types/offline.ts

export type SyncAction =
  | 'create_trip'
  | 'update_trip'
  | 'delete_trip'
  | 'add_activity'
  | 'update_activity'
  | 'delete_activity'
  | 'add_expense'
  | 'update_expense'
  | 'delete_expense'
  | 'upload_photo';

export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed';

export interface SyncQueueItem {
  id: string;
  action: SyncAction;
  payload: unknown;

  status: SyncStatus;
  retryCount: number;
  maxRetries: number;

  createdAt: string;
  lastAttemptAt?: string;
  completedAt?: string;

  error?: string;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt?: string;
  pendingCount: number;
  failedCount: number;
}
```

---

## 6. Feature Specifications

### 6.1 Feature 1: Offline-First Architecture

**Goal:** Enable full app functionality without internet connectivity.

**IndexedDB Schema:**

```typescript
// src/services/db/index.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface TripPilotDB extends DBSchema {
  trips: {
    key: TripId;
    value: Trip;
    indexes: {
      'by-status': TripStatus;
      'by-start-date': string;
      'by-updated': string;
    };
  };

  expenses: {
    key: ExpenseId;
    value: Expense;
    indexes: {
      'by-trip': TripId;
      'by-date': string;
    };
  };

  photos: {
    key: PhotoId;
    value: TripPhoto;
    indexes: {
      'by-trip': TripId;
      'by-activity': ActivityId;
    };
  };

  photoBlobs: {
    key: string;              // blobKey
    value: Blob;
  };

  packingLists: {
    key: TripId;
    value: PackingList;
  };

  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': SyncStatus;
      'by-created': string;
    };
  };

  cache: {
    key: string;              // Cache key (e.g., 'exchange_rates')
    value: {
      data: unknown;
      expiresAt: string;
    };
  };
}

const DB_NAME = 'trippilot';
const DB_VERSION = 1;

export async function initDB(): Promise<IDBPDatabase<TripPilotDB>> {
  return openDB<TripPilotDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Trips store
      if (!db.objectStoreNames.contains('trips')) {
        const tripStore = db.createObjectStore('trips', { keyPath: 'id' });
        tripStore.createIndex('by-status', 'status');
        tripStore.createIndex('by-start-date', 'startDate');
        tripStore.createIndex('by-updated', 'updatedAt');
      }

      // Expenses store
      if (!db.objectStoreNames.contains('expenses')) {
        const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
        expenseStore.createIndex('by-trip', 'tripId');
        expenseStore.createIndex('by-date', 'date');
      }

      // Photos store
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('by-trip', 'tripId');
        photoStore.createIndex('by-activity', 'activityId');
      }

      // Photo blobs store
      if (!db.objectStoreNames.contains('photoBlobs')) {
        db.createObjectStore('photoBlobs');
      }

      // Packing lists store
      if (!db.objectStoreNames.contains('packingLists')) {
        db.createObjectStore('packingLists', { keyPath: 'tripId' });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('by-status', 'status');
        syncStore.createIndex('by-created', 'createdAt');
      }

      // Cache store
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache');
      }
    },
  });
}
```

**Sync Queue Logic:**

```typescript
// src/services/db/syncQueue.ts

export class SyncQueue {
  private db: IDBPDatabase<TripPilotDB>;
  private isProcessing = false;

  async enqueue(action: SyncAction, payload: unknown): Promise<string> {
    const item: SyncQueueItem = {
      id: nanoid(),
      action,
      payload,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    };

    await this.db.add('syncQueue', item);

    // Trigger processing if online
    if (navigator.onLine) {
      this.processQueue();
    }

    return item.id;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pending = await this.db.getAllFromIndex(
        'syncQueue',
        'by-status',
        'pending'
      );

      for (const item of pending) {
        await this.processItem(item);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    // Update status to syncing
    item.status = 'syncing';
    item.lastAttemptAt = new Date().toISOString();
    await this.db.put('syncQueue', item);

    try {
      // NOTE: When backend is implemented, this would call the API
      // For now, we just mark as completed (local-only)
      await this.executeAction(item);

      item.status = 'completed';
      item.completedAt = new Date().toISOString();
    } catch (error) {
      item.retryCount++;
      if (item.retryCount >= item.maxRetries) {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : 'Unknown error';
      } else {
        item.status = 'pending';
      }
    }

    await this.db.put('syncQueue', item);
  }

  private async executeAction(item: SyncQueueItem): Promise<void> {
    // Placeholder for future backend sync
    // Currently all data is local-only
    switch (item.action) {
      case 'create_trip':
      case 'update_trip':
      case 'delete_trip':
        // Future: POST/PUT/DELETE to /api/trips
        break;
      // ... etc
    }
  }
}
```

### 6.2 Feature 2: Mobile-First Responsive Redesign

**Breakpoint Strategy:**

```typescript
// src/hooks/useMediaQuery.ts

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
}

export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`
  );
}

export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
}
```

**App Shell Component:**

```tsx
// src/app/AppShell.tsx

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const viewMode = useUIStore(state => state.viewMode);

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen">
        {/* Mobile Header */}
        <Header
          onMenuClick={() => setIsSidebarOpen(true)}
          variant="mobile"
        />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>

        {/* Bottom Navigation */}
        <BottomNav />

        {/* Mobile Drawer */}
        <MobileDrawer
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>
    );
  }

  // Desktop/Tablet Layout
  return (
    <div className="flex h-screen">
      {/* Fixed Header */}
      <Header variant="desktop" />

      <div className="flex w-full pt-16">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
```

**Bottom Navigation Component:**

```tsx
// src/components/common/BottomNav.tsx

interface NavItem {
  id: ViewMode | 'trips' | 'today';
  icon: LucideIcon;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'today', icon: Sun, label: 'Today' },
  { id: 'day', icon: Calendar, label: 'Plan' },
  { id: 'overview', icon: Map, label: 'Overview' },
  { id: 'trips', icon: Briefcase, label: 'Trips' },
];

export function BottomNav() {
  const viewMode = useUIStore(state => state.viewMode);
  const setViewMode = useUIStore(state => state.setViewMode);
  const activeTrip = useTripStore(state => state.activeTrip);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 safe-area-bottom z-40">
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map(item => {
          const isActive = viewMode === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setViewMode(item.id)}
              className={`
                flex flex-col items-center justify-center w-full h-full
                transition-colors min-h-touch
                ${isActive
                  ? 'text-blue-500'
                  : 'text-slate-400 active:text-slate-600'}
              `}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-xs mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

### 6.3 Feature 3: Quick Access "Today View"

**Today View Logic Hook:**

```typescript
// src/hooks/useTodayView.ts

interface TodayViewData {
  currentDay: DayItinerary | null;
  nextActivity: Activity | null;
  upcomingActivities: Activity[];
  completedActivities: Activity[];
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  timeUntilNext: number | null;  // milliseconds
  isRestDay: boolean;
}

export function useTodayView(trip: Trip | null): TodayViewData {
  const [now, setNow] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (!trip) {
      return {
        currentDay: null,
        nextActivity: null,
        upcomingActivities: [],
        completedActivities: [],
        progress: { completed: 0, total: 0, percentage: 0 },
        timeUntilNext: null,
        isRestDay: false,
      };
    }

    // Find today's day in the itinerary
    const todayStr = formatInTimeZone(now, trip.timezone, 'yyyy-MM-dd');
    const currentDay = trip.itinerary.days.find(d => d.date === todayStr) || null;

    if (!currentDay) {
      return {
        currentDay: null,
        nextActivity: null,
        upcomingActivities: [],
        completedActivities: [],
        progress: { completed: 0, total: 0, percentage: 0 },
        timeUntilNext: null,
        isRestDay: false,
      };
    }

    // Parse activity times and categorize
    const nowTime = formatInTimeZone(now, trip.timezone, 'HH:mm');
    const sortedActivities = [...currentDay.activities].sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });

    const completedActivities: Activity[] = [];
    const upcomingActivities: Activity[] = [];

    for (const activity of sortedActivities) {
      const activityTime = parseTime(activity.time);
      const endTime = activity.endTime
        ? parseTime(activity.endTime)
        : addHours(activityTime, 1); // Default 1 hour duration

      if (isBefore(endTime, parseTime(nowTime))) {
        completedActivities.push(activity);
      } else {
        upcomingActivities.push(activity);
      }
    }

    const nextActivity = upcomingActivities[0] || null;

    // Calculate time until next activity
    let timeUntilNext: number | null = null;
    if (nextActivity?.time) {
      const nextTime = parseTime(nextActivity.time);
      const nowParsed = parseTime(nowTime);
      timeUntilNext = differenceInMilliseconds(nextTime, nowParsed);
      if (timeUntilNext < 0) timeUntilNext = 0;
    }

    const total = sortedActivities.length;
    const completed = completedActivities.length;

    return {
      currentDay,
      nextActivity,
      upcomingActivities,
      completedActivities,
      progress: {
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      timeUntilNext,
      isRestDay: total === 0,
    };
  }, [trip, now]);
}

// Helper to parse "HH:MM" or "HH:MM AM/PM" to Date
function parseTime(time: string | undefined): Date {
  if (!time) return new Date();
  // Implementation handles both 24h and 12h formats
  // ...
}
```

**Today View Component:**

```tsx
// src/components/features/today/TodayView.tsx

export function TodayView() {
  const activeTrip = useTripStore(state => state.activeTrip);
  const todayData = useTodayView(activeTrip);

  if (!activeTrip) {
    return <EmptyState message="No active trip" action="Create Trip" />;
  }

  if (!todayData.currentDay) {
    return (
      <div className="p-6">
        <h2 className="section-header mb-4">
          <Sun className="w-5 h-5 text-amber-500" />
          Today
        </h2>
        <Card className="p-6 text-center">
          <p className="text-slate-500">
            No activities scheduled for today.
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Your trip runs from {formatDate(activeTrip.startDate)} to {formatDate(activeTrip.endDate)}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 pb-24">
      {/* Day Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">
            Day {todayData.currentDay.dayNumber}
          </h2>
          <p className="text-sm font-bold text-slate-400">
            {formatDate(todayData.currentDay.date, 'EEEE, MMMM d')}
          </p>
        </div>
        <DayProgress {...todayData.progress} />
      </div>

      {/* What's Next Card */}
      {todayData.nextActivity && (
        <NextActivityCard
          activity={todayData.nextActivity}
          timeUntil={todayData.timeUntilNext}
        />
      )}

      {/* Upcoming Activities */}
      {todayData.upcomingActivities.length > 1 && (
        <section className="mt-6">
          <h3 className="section-header mb-3">
            Coming Up
          </h3>
          <div className="space-y-3">
            {todayData.upcomingActivities.slice(1).map(activity => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                variant="compact"
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Activities */}
      {todayData.completedActivities.length > 0 && (
        <section className="mt-6">
          <h3 className="section-header mb-3 text-slate-400">
            <Check className="w-4 h-4" />
            Completed
          </h3>
          <div className="space-y-2 opacity-60">
            {todayData.completedActivities.map(activity => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                variant="completed"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

### 6.4 Feature 5: Smart Notifications

**Notification Service:**

```typescript
// src/services/notifications/notificationService.ts

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result === 'granted';
    }

    return false;
  }

  async scheduleNotification(notification: ScheduledNotification): Promise<void> {
    // Store in IndexedDB for persistence
    const db = await getDB();
    await db.add('notifications', notification);

    // Schedule with service worker if available
    if ('serviceWorker' in navigator && 'showTrigger' in Notification.prototype) {
      // Use Notification Triggers API (Chrome only)
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(notification.title, {
        body: notification.body,
        tag: notification.id,
        data: { url: notification.actionUrl },
        showTrigger: new TimestampTrigger(new Date(notification.scheduledFor).getTime()),
      });
    } else {
      // Fallback: Use setTimeout for active session
      const delay = new Date(notification.scheduledFor).getTime() - Date.now();
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Within 24 hours
        setTimeout(() => this.showNotification(notification), delay);
      }
    }
  }

  private showNotification(notification: ScheduledNotification): void {
    if (this.permission !== 'granted') return;

    new Notification(notification.title, {
      body: notification.body,
      icon: '/icons/icon-192.png',
      tag: notification.id,
      data: { url: notification.actionUrl },
    });
  }

  async scheduleActivityReminders(trip: Trip): Promise<void> {
    const preferences = await this.getPreferences();
    if (!preferences.enabled) return;

    for (const day of trip.itinerary.days) {
      for (const activity of day.activities) {
        if (!activity.time) continue;

        // Departure reminder
        if (preferences.departureReminders.enabled) {
          const reminderTime = subHours(
            parseActivityDateTime(day.date, activity.time, trip.timezone),
            preferences.departureReminders.hoursBeforeDefault
          );

          if (isAfter(reminderTime, new Date())) {
            await this.scheduleNotification({
              id: `departure-${activity.id}`,
              tripId: trip.id,
              activityId: activity.id,
              type: 'departure_reminder',
              title: 'Upcoming Activity',
              body: `${activity.description} starts in ${preferences.departureReminders.hoursBeforeDefault} hours`,
              scheduledFor: reminderTime.toISOString(),
              timezone: trip.timezone,
              delivered: false,
              dismissed: false,
              actionUrl: `/trips/${trip.id}/day/${day.id}?activity=${activity.id}`,
            });
          }
        }

        // Check-in reminders for lodging
        if (
          activity.type === 'lodging' &&
          activity.details?.booking?.checkIn &&
          preferences.checkinReminders.enabled
        ) {
          // ... similar scheduling logic
        }
      }
    }
  }
}
```

### 6.5 Feature 7: Export & Sharing

**PDF Generator:**

```typescript
// src/services/export/pdfGenerator.ts

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  dayHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  activity: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  activityTime: {
    width: 60,
    fontSize: 10,
    color: '#64748b',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  activityLocation: {
    fontSize: 10,
    color: '#64748b',
  },
  bookingInfo: {
    fontSize: 9,
    color: '#3b82f6',
    marginTop: 2,
  },
});

interface PDFGeneratorOptions {
  includeBookingInfo: boolean;
  includeNotes: boolean;
  includeBudget: boolean;
}

export async function generateTripPDF(
  trip: Trip,
  options: PDFGeneratorOptions = {
    includeBookingInfo: true,
    includeNotes: true,
    includeBudget: false,
  }
): Promise<Blob> {
  const TripDocument = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Title */}
        <Text style={styles.title}>{trip.title}</Text>
        <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
          {formatDate(trip.startDate)} - {formatDate(trip.endDate)} • {trip.destination.name}
        </Text>

        {/* Days */}
        {trip.itinerary.days.map(day => (
          <View key={day.id}>
            <Text style={styles.dayHeader}>
              Day {day.dayNumber} - {formatDate(day.date, 'EEEE, MMMM d')}
            </Text>

            {day.activities.map(activity => (
              <View key={activity.id} style={styles.activity}>
                <Text style={styles.activityTime}>
                  {activity.time || '--:--'}
                </Text>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>
                    {activity.description}
                  </Text>
                  <Text style={styles.activityLocation}>
                    {activity.location.name}
                    {activity.location.address && ` • ${activity.location.address}`}
                  </Text>

                  {options.includeBookingInfo && activity.details?.booking?.confirmationNumber && (
                    <Text style={styles.bookingInfo}>
                      Confirmation: {activity.details.booking.confirmationNumber}
                    </Text>
                  )}

                  {options.includeNotes && activity.details?.notes && (
                    <Text style={{ fontSize: 9, marginTop: 2 }}>
                      Note: {activity.details.notes}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );

  return await pdf(<TripDocument />).toBlob();
}
```

**ICS Calendar Export:**

```typescript
// src/services/export/icsGenerator.ts

import { createEvents, EventAttributes } from 'ics';

export async function generateICS(trip: Trip): Promise<string> {
  const events: EventAttributes[] = [];

  for (const day of trip.itinerary.days) {
    for (const activity of day.activities) {
      const startDate = parseActivityDateTime(day.date, activity.time, trip.timezone);
      const endDate = activity.endTime
        ? parseActivityDateTime(day.date, activity.endTime, trip.timezone)
        : addHours(startDate, 1);

      events.push({
        title: activity.description,
        description: buildDescription(activity),
        location: activity.location.name +
          (activity.location.address ? `, ${activity.location.address}` : ''),
        geo: activity.location.coordinates
          ? { lat: activity.location.coordinates.lat, lon: activity.location.coordinates.lng }
          : undefined,
        start: [
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          startDate.getDate(),
          startDate.getHours(),
          startDate.getMinutes(),
        ],
        end: [
          endDate.getFullYear(),
          endDate.getMonth() + 1,
          endDate.getDate(),
          endDate.getHours(),
          endDate.getMinutes(),
        ],
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
        uid: `${activity.id}@trippilot.app`,
      });
    }
  }

  return new Promise((resolve, reject) => {
    createEvents(events, (error, value) => {
      if (error) reject(error);
      else resolve(value);
    });
  });
}

function buildDescription(activity: Activity): string {
  const parts: string[] = [];

  if (activity.details?.booking?.confirmationNumber) {
    parts.push(`Confirmation: ${activity.details.booking.confirmationNumber}`);
  }
  if (activity.details?.phone) {
    parts.push(`Phone: ${activity.details.phone}`);
  }
  if (activity.details?.notes) {
    parts.push(`Notes: ${activity.details.notes}`);
  }

  return parts.join('\n');
}
```

---

## 7. Core Logic & Algorithms

### 7.1 Trip Status Auto-Update Algorithm

```typescript
/**
 * Determines trip status based on current date and trip dates.
 * Called on app load and daily at midnight.
 */
function computeTripStatus(trip: Trip, now: Date = new Date()): TripStatus {
  // Manual override check
  if (trip.status === 'archived') return 'archived';

  const today = startOfDay(now);
  const startDate = parseISO(trip.startDate);
  const endDate = parseISO(trip.endDate);

  // Past trip
  if (isAfter(today, endDate)) {
    return 'completed';
  }

  // Current trip
  if (
    (isEqual(today, startDate) || isAfter(today, startDate)) &&
    (isEqual(today, endDate) || isBefore(today, endDate))
  ) {
    return 'active';
  }

  // Future trip within 7 days
  const daysUntilStart = differenceInDays(startDate, today);
  if (daysUntilStart <= 7 && daysUntilStart > 0) {
    return 'upcoming';
  }

  // Default: still planning
  return 'planning';
}

/**
 * Batch update all trip statuses.
 * Run on app init and schedule for midnight.
 */
async function updateAllTripStatuses(): Promise<void> {
  const db = await getDB();
  const trips = await db.getAll('trips');
  const now = new Date();

  const tx = db.transaction('trips', 'readwrite');

  for (const trip of trips) {
    const newStatus = computeTripStatus(trip, now);
    if (newStatus !== trip.status) {
      trip.status = newStatus;
      trip.updatedAt = now.toISOString();
      await tx.store.put(trip);
    }
  }

  await tx.done;
}
```

### 7.2 Budget Calculation with Currency Conversion

```typescript
interface BudgetSummary {
  totalSpent: MoneyAmount;
  byCategory: Record<ExpenseCategory, MoneyAmount>;
  byCurrency: Record<string, number>;
  dailyAverage: number;
  projectedTotal: number;
}

async function calculateBudgetSummary(
  tripId: TripId,
  defaultCurrency: string
): Promise<BudgetSummary> {
  const db = await getDB();
  const expenses = await db.getAllFromIndex('expenses', 'by-trip', tripId);

  // Get exchange rates (cached)
  const rates = await getCachedExchangeRates(defaultCurrency);

  const byCategory: Record<ExpenseCategory, number> = {
    accommodation: 0,
    food: 0,
    transport: 0,
    activities: 0,
    shopping: 0,
    other: 0,
  };

  const byCurrency: Record<string, number> = {};
  let totalInDefault = 0;

  for (const expense of expenses) {
    const { amount, currency } = expense.amount;

    // Track original currencies
    byCurrency[currency] = (byCurrency[currency] || 0) + amount;

    // Convert to default currency
    const converted = currency === defaultCurrency
      ? amount
      : amount * (rates[currency] || 1);

    totalInDefault += converted;
    byCategory[expense.category] += converted;
  }

  // Calculate daily average
  const tripDays = /* calculate from trip dates */;
  const elapsedDays = /* days since trip start */;
  const dailyAverage = elapsedDays > 0 ? totalInDefault / elapsedDays : 0;

  // Project total (if trip ongoing)
  const projectedTotal = dailyAverage * tripDays;

  return {
    totalSpent: { amount: totalInDefault, currency: defaultCurrency },
    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, { amount: v, currency: defaultCurrency }])
    ) as Record<ExpenseCategory, MoneyAmount>,
    byCurrency,
    dailyAverage,
    projectedTotal,
  };
}
```

### 7.3 AI Packing List Generation

```typescript
/**
 * Generate packing list using Gemini AI based on trip details.
 */
async function generatePackingList(input: PackingGenerationInput): Promise<PackingItem[]> {
  const prompt = buildPackingPrompt(input);

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: {
              type: Type.STRING,
              enum: ['clothing', 'toiletries', 'electronics', 'documents', 'medicine', 'accessories', 'other']
            },
            quantity: { type: Type.NUMBER },
            isEssential: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
          },
          required: ['name', 'category', 'quantity', 'isEssential'],
        },
      },
    },
  });

  const items = JSON.parse(response.text || '[]');

  return items.map((item: any) => ({
    id: nanoid(),
    tripId: input.tripId,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    isPacked: false,
    isEssential: item.isEssential,
    aiSuggested: true,
    suggestionReason: item.reason,
  }));
}

function buildPackingPrompt(input: PackingGenerationInput): string {
  const duration = differenceInDays(parseISO(input.endDate), parseISO(input.startDate)) + 1;
  const activityTypes = [...new Set(input.activities)].join(', ');

  return `Generate a comprehensive packing list for a ${duration}-day trip to ${input.destination}.

Trip Details:
- Duration: ${duration} days
- Activities planned: ${activityTypes}
${input.weather ? `- Weather forecast: ${input.weather.map(w => `${w.date}: ${w.tempLow}-${w.tempHigh}°, ${w.condition}`).join('; ')}` : ''}
${input.travelerPreferences?.businessTrip ? '- This is a business trip' : ''}

Requirements:
- Include essential items (documents, chargers, etc.)
- Consider the weather and pack appropriate clothing
- Include activity-specific items
- Be practical - suggest reasonable quantities
${input.travelerPreferences?.includeToiletries ? '- Include toiletries' : '- Exclude toiletries (user will buy locally)'}
${input.travelerPreferences?.includeMedicine ? '- Include basic medicine/first-aid' : ''}

Return a JSON array of items with name, category, quantity, isEssential (boolean), and reason (why this item is suggested).`;
}
```

---

## 8. API Contracts

### 8.1 Zustand Store Contracts

```typescript
// src/stores/tripStore.ts

interface TripState {
  // Data
  trips: Trip[];
  activeTrip: Trip | null;
  activeTripId: TripId | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTrips: () => Promise<void>;
  setActiveTrip: (tripId: TripId) => Promise<void>;
  createTrip: (input: CreateTripInput) => Promise<Trip>;
  updateTrip: (tripId: TripId, updates: Partial<Trip>) => Promise<void>;
  deleteTrip: (tripId: TripId) => Promise<void>;
  archiveTrip: (tripId: TripId) => Promise<void>;

  // Itinerary actions
  addActivity: (dayNumber: number, activity: Omit<Activity, 'id'>) => Promise<void>;
  updateActivity: (dayId: string, activityId: string, updates: Partial<Activity>) => Promise<void>;
  deleteActivity: (dayId: string, activityId: string) => Promise<void>;
  replaceItinerary: (itinerary: Itinerary) => Promise<void>;

  // Computed
  getTripSummaries: () => TripSummary[];
  getActiveTripDays: () => DayItinerary[];
}

// src/stores/uiStore.ts

type ExtendedViewMode = ViewMode | 'today' | 'trips' | 'budget' | 'packing' | 'photos';

interface UIState {
  // View
  viewMode: ExtendedViewMode;
  setViewMode: (mode: ExtendedViewMode) => void;

  // Sidebar
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Modals
  activeModal: string | null;
  modalData: unknown;
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;

  // Selection
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  setHoveredActivity: (id: string | null) => void;
  setSelectedActivity: (id: string | null) => void;

  // Day selection
  activeDayId: string | null;
  setActiveDayId: (id: string | null) => void;
}

// src/stores/offlineStore.ts

interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: number;
  lastSyncAt: string | null;

  // Internal
  setOnline: (online: boolean) => void;

  // Sync actions
  enqueueAction: (action: SyncAction, payload: unknown) => Promise<void>;
  processQueue: () => Promise<void>;
  clearCompletedActions: () => Promise<void>;
}

// src/stores/budgetStore.ts

interface BudgetState {
  expenses: Record<TripId, Expense[]>;
  exchangeRates: Record<string, number>;
  ratesLastUpdated: string | null;

  // Actions
  loadExpenses: (tripId: TripId) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Expense>;
  updateExpense: (expenseId: ExpenseId, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (expenseId: ExpenseId) => Promise<void>;

  // Exchange rates
  refreshExchangeRates: (baseCurrency: string) => Promise<void>;
  convertAmount: (amount: number, from: string, to: string) => number;

  // Computed
  getTripBudgetSummary: (tripId: TripId) => BudgetSummary;
}
```

### 8.2 Service Function Signatures

```typescript
// Database Services
// src/services/db/tripRepository.ts

export interface TripRepository {
  getAll(): Promise<Trip[]>;
  getById(id: TripId): Promise<Trip | undefined>;
  getByStatus(status: TripStatus): Promise<Trip[]>;
  create(trip: Trip): Promise<void>;
  update(id: TripId, updates: Partial<Trip>): Promise<void>;
  delete(id: TripId): Promise<void>;
  search(query: string): Promise<Trip[]>;
}

// src/services/db/photoRepository.ts

export interface PhotoRepository {
  getByTrip(tripId: TripId): Promise<TripPhoto[]>;
  getByActivity(activityId: ActivityId): Promise<TripPhoto[]>;
  save(photo: TripPhoto, blob: Blob, thumbnail: Blob): Promise<void>;
  delete(photoId: PhotoId): Promise<void>;
  getBlob(blobKey: string): Promise<Blob | undefined>;
  getThumbnail(photoId: PhotoId): Promise<Blob | undefined>;
}

// Export Services
// src/services/export/pdfGenerator.ts

export function generateTripPDF(
  trip: Trip,
  options?: PDFGeneratorOptions
): Promise<Blob>;

// src/services/export/icsGenerator.ts

export function generateICS(trip: Trip): Promise<string>;

// src/services/export/shareService.ts

export interface ShareService {
  canShare(): boolean;
  shareTrip(trip: Trip): Promise<void>;
  shareAsText(trip: Trip): Promise<void>;
  shareAsPDF(trip: Trip): Promise<void>;
  copyShareLink(tripId: TripId): Promise<string>;
}

// Notification Services
// src/services/notifications/notificationService.ts

export interface NotificationService {
  requestPermission(): Promise<boolean>;
  hasPermission(): boolean;
  scheduleNotification(notification: ScheduledNotification): Promise<void>;
  cancelNotification(notificationId: string): Promise<void>;
  scheduleActivityReminders(trip: Trip): Promise<void>;
  cancelTripReminders(tripId: TripId): Promise<void>;
  getPreferences(): Promise<NotificationPreferences>;
  updatePreferences(prefs: Partial<NotificationPreferences>): Promise<void>;
}

// Currency Services
// src/services/currency/currencyService.ts

export interface CurrencyService {
  getExchangeRates(baseCurrency: string): Promise<Record<string, number>>;
  convert(amount: number, from: string, to: string): Promise<number>;
  formatMoney(amount: MoneyAmount, locale?: string): string;
}
```

### 8.3 Component Props Contracts

```typescript
// Common Components
// src/components/common/Button.tsx

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onClick?: () => void;
  children: React.ReactNode;
}

// src/components/common/Card.tsx

interface CardProps {
  variant?: 'default' | 'interactive' | 'active';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

// src/components/common/Modal.tsx

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// Feature Components
// src/components/features/today/NextActivityCard.tsx

interface NextActivityCardProps {
  activity: Activity;
  timeUntil: number | null;  // ms until start
  onNavigate?: () => void;
  onViewDetails?: () => void;
}

// src/components/features/trips/TripCard.tsx

interface TripCardProps {
  trip: TripSummary;
  isActive?: boolean;
  onSelect?: (tripId: TripId) => void;
  onEdit?: (tripId: TripId) => void;
  onDelete?: (tripId: TripId) => void;
}

// src/components/features/activity/ActivityDetail.tsx

interface ActivityDetailProps {
  activity: Activity;
  dayId: string;
  onUpdate: (updates: Partial<Activity>) => void;
  onDelete: () => void;
  onAddExpense?: () => void;
  onAddPhoto?: () => void;
}

// src/components/features/budget/AddExpenseModal.tsx

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: TripId;
  activityId?: ActivityId;
  defaultCategory?: ExpenseCategory;
  onSuccess?: (expense: Expense) => void;
}

// src/components/features/export/ExportModal.tsx

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
}
```

---

## 9. Edge Cases & Error Handling

### 9.1 Critical Edge Cases

| # | Scenario | Handling Strategy |
|---|----------|-------------------|
| 1 | **Offline during trip creation** | Queue creation in syncQueue, assign temporary local ID, sync when online |
| 2 | **Timezone changes during trip** | Store all times in UTC internally, display in trip's configured timezone |
| 3 | **IndexedDB quota exceeded** | Detect QuotaExceededError, prompt user to delete old photos/trips, implement LRU cleanup |
| 4 | **Activity without time** | Sort timeless activities to end of day, exclude from "Today View" countdown |
| 5 | **Currency API failure** | Fall back to cached rates (up to 7 days old), show warning, allow manual entry |
| 6 | **Photo upload >10MB** | Compress client-side before storage, warn user if still too large |
| 7 | **Trip spans year boundary** | Handle date comparisons carefully, don't assume same year |
| 8 | **PWA installed but no SW** | Detect gracefully, disable offline features with user message |
| 9 | **Notification permission denied** | Store preference, don't re-ask, provide Settings link |
| 10 | **Empty itinerary export** | Show warning, generate minimal PDF with trip info only |
| 11 | **Concurrent edits (future)** | Last-write-wins for MVP, add conflict resolution later |
| 12 | **Browser doesn't support Web Share** | Fall back to copy-to-clipboard with toast |

### 9.2 Error Handling Patterns

```typescript
// src/utils/errorHandling.ts

export class TripPilotError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'TripPilotError';
  }
}

export const ErrorCodes = {
  DB_INIT_FAILED: 'DB_INIT_FAILED',
  DB_QUOTA_EXCEEDED: 'DB_QUOTA_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_DATA: 'INVALID_DATA',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  EXPORT_FAILED: 'EXPORT_FAILED',
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
} as const;

export function handleError(error: unknown): void {
  if (error instanceof TripPilotError) {
    if (error.recoverable) {
      // Show toast with userMessage
      showToast({
        type: 'error',
        message: error.userMessage || 'Something went wrong',
        action: error.code === ErrorCodes.NETWORK_ERROR
          ? { label: 'Retry', onClick: () => window.location.reload() }
          : undefined,
      });
    } else {
      // Show error modal for critical errors
      showErrorModal({
        title: 'Error',
        message: error.userMessage || error.message,
        details: error.code,
      });
    }
  } else {
    // Unknown error - log and show generic message
    console.error('Unexpected error:', error);
    showToast({
      type: 'error',
      message: 'An unexpected error occurred',
    });
  }
}

// Usage in async functions
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleError(
      error instanceof TripPilotError
        ? error
        : new TripPilotError(
            error instanceof Error ? error.message : 'Unknown error',
            'UNKNOWN',
            true,
            errorMessage
          )
    );
    return null;
  }
}
```

### 9.3 Validation Functions

```typescript
// src/utils/validation.ts

export function validateTrip(input: CreateTripInput): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input.title?.trim()) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (input.title.length > 100) {
    errors.push({ field: 'title', message: 'Title must be under 100 characters' });
  }

  if (!input.destination?.trim()) {
    errors.push({ field: 'destination', message: 'Destination is required' });
  }

  if (!input.startDate) {
    errors.push({ field: 'startDate', message: 'Start date is required' });
  }

  if (!input.endDate) {
    errors.push({ field: 'endDate', message: 'End date is required' });
  }

  if (input.startDate && input.endDate) {
    const start = parseISO(input.startDate);
    const end = parseISO(input.endDate);

    if (isAfter(start, end)) {
      errors.push({ field: 'endDate', message: 'End date must be after start date' });
    }

    const duration = differenceInDays(end, start);
    if (duration > 365) {
      errors.push({ field: 'endDate', message: 'Trip cannot exceed 365 days' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateExpense(input: Partial<Expense>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input.description?.trim()) {
    errors.push({ field: 'description', message: 'Description is required' });
  }

  if (input.amount === undefined || input.amount.amount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be greater than 0' });
  }

  if (input.amount?.amount > 1000000) {
    errors.push({ field: 'amount', message: 'Amount seems too large. Please verify.' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## 10. Implementation Steps

### Phase 1: Foundation (Features 1, 2) - Priority: Critical

#### Step 1.1: Install Dependencies
```bash
npm install zustand@5.0.2 idb@8.0.1 nanoid@5.0.9 date-fns@4.1.0 date-fns-tz@3.2.0 framer-motion@11.15.0 @use-gesture/react@10.3.1
npm install -D @types/wicg-file-system-access
```

#### Step 1.2: Create Type Definitions
1. Create `src/types/trip.ts` with TripId, Trip, TripSummary, CreateTripInput
2. Create `src/types/offline.ts` with SyncAction, SyncQueueItem, SyncState
3. Modify `src/types/itinerary.ts` to add ActivityDetails, BookingInfo
4. Create `src/types/index.ts` to re-export all types

#### Step 1.3: Implement IndexedDB Layer
1. Create `src/services/db/index.ts` with initDB function
2. Create `src/services/db/tripRepository.ts` with CRUD operations
3. Create `src/services/db/syncQueue.ts` with offline queue logic
4. Test: Verify DB creates successfully, can store/retrieve trips

#### Step 1.4: Implement Zustand Stores
1. Create `src/stores/tripStore.ts` - migrate from useItinerary hook
2. Create `src/stores/uiStore.ts` - extract UI state from App.tsx
3. Create `src/stores/offlineStore.ts` - online status + sync queue
4. Create `src/stores/index.ts` - export all stores
5. Test: Verify state persists across page refresh

#### Step 1.5: Create Responsive Hooks
1. Create `src/hooks/useMediaQuery.ts`
2. Create `src/hooks/useOnlineStatus.ts`
3. Create `src/hooks/useSwipeGesture.ts`

#### Step 1.6: Build Layout Components
1. Create `src/components/layout/Header.tsx` (responsive version)
2. Create `src/components/layout/Sidebar.tsx`
3. Create `src/components/layout/MobileDrawer.tsx`
4. Create `src/components/common/BottomNav.tsx`
5. Create `src/app/AppShell.tsx` combining all layouts

#### Step 1.7: Update App Entry Point
1. Modify `src/main.tsx` to initialize DB on startup
2. Modify `src/App.tsx` to use new AppShell
3. Add online/offline event listeners
4. Test: Verify layout switches at breakpoints

### Phase 2: Core Features (Features 3, 4, 6) - Priority: High

#### Step 2.1: Implement Today View (Feature 3)
1. Create `src/hooks/useTodayView.ts`
2. Create `src/components/features/today/TodayView.tsx`
3. Create `src/components/features/today/NextActivityCard.tsx`
4. Create `src/components/features/today/CountdownTimer.tsx`
5. Create `src/components/features/today/DayProgress.tsx`
6. Add "Today" to view switcher and bottom nav
7. Test: Verify correct day detection, countdown works

#### Step 2.2: Implement Activity Details (Feature 4)
1. Create `src/components/features/activity/ActivityDetail.tsx`
2. Create `src/components/features/activity/ActivityEditModal.tsx`
3. Create `src/components/features/activity/BookingInfo.tsx`
4. Create `src/components/features/activity/QuickActions.tsx`
5. Modify `ItineraryView.tsx` to open details on click
6. Test: Verify booking info saves/loads correctly

#### Step 2.3: Implement Multi-Trip (Feature 6)
1. Create `src/components/features/trips/TripList.tsx`
2. Create `src/components/features/trips/TripCard.tsx`
3. Create `src/components/features/trips/CreateTripModal.tsx`
4. Create `src/components/features/trips/TripSwitcher.tsx`
5. Update stores to handle multiple trips
6. Migrate existing localStorage itinerary to IndexedDB trip
7. Test: Create 3+ trips, switch between them, verify data isolation

### Phase 3: Engagement Features (Features 5, 7, 8) - Priority: Medium

#### Step 3.1: Implement Notifications (Feature 5)
1. Create `src/types/notification.ts`
2. Create `src/services/notifications/notificationService.ts`
3. Create `src/services/notifications/reminderScheduler.ts`
4. Create `src/stores/notificationStore.ts`
5. Create notification settings UI
6. Add permission request on first trip creation
7. Test: Schedule notification, verify it fires

#### Step 3.2: Implement Export & Sharing (Feature 7)
1. Install: `npm install @react-pdf/renderer@4.1.5 ics@3.8.1`
2. Create `src/services/export/pdfGenerator.ts`
3. Create `src/services/export/icsGenerator.ts`
4. Create `src/services/export/shareService.ts`
5. Create `src/components/features/export/ExportModal.tsx`
6. Create `src/components/features/export/ShareSheet.tsx`
7. Test: Generate PDF, export ICS, share works

#### Step 3.3: Implement Budget Tracking (Feature 8)
1. Create `src/types/budget.ts`
2. Create `src/services/currency/currencyService.ts`
3. Create `src/stores/budgetStore.ts`
4. Create `src/components/features/budget/BudgetOverview.tsx`
5. Create `src/components/features/budget/ExpenseList.tsx`
6. Create `src/components/features/budget/AddExpenseModal.tsx`
7. Create `src/components/features/budget/CategoryBreakdown.tsx`
8. Test: Add expenses, verify totals, test currency conversion

### Phase 4: Enhancement Features (Features 9, 10, 11, 12) - Priority: Lower

#### Step 4.1: Implement Photo Journal (Feature 9)
1. Create `src/types/photo.ts`
2. Create `src/services/db/photoRepository.ts`
3. Create `src/stores/photoStore.ts`
4. Create `src/components/features/photos/PhotoGallery.tsx`
5. Create `src/components/features/photos/PhotoUpload.tsx`
6. Create `src/components/features/photos/PhotoViewer.tsx`
7. Implement thumbnail generation
8. Test: Upload photos, view gallery, delete photos

#### Step 4.2: Implement Packing List (Feature 10)
1. Create `src/types/packing.ts`
2. Create `src/constants/packingTemplates.ts`
3. Create `src/stores/packingStore.ts`
4. Create AI generation logic in geminiService.ts
5. Create `src/components/features/packing/PackingList.tsx`
6. Create `src/components/features/packing/PackingItem.tsx`
7. Create `src/components/features/packing/GenerateListButton.tsx`
8. Test: Generate list, check items, persistence works

#### Step 4.3: Implement Recommendations (Feature 11)
1. Create `src/services/places/placesService.ts`
2. Create `src/services/places/placesCache.ts`
3. Create `src/components/features/recommendations/NearbyPanel.tsx`
4. Create `src/components/features/recommendations/RecommendationCard.tsx`
5. Integrate with Google Places API
6. Test: Shows nearby places, handles no results

#### Step 4.4: Implement Transport Links (Feature 12)
1. Create `src/components/features/transport/TransportOptions.tsx`
2. Create `src/components/features/transport/RideShareButton.tsx`
3. Implement deep link generation for Uber, Lyft, Google Maps
4. Add transit directions display
5. Test: Deep links open correctly on mobile

### Phase 5: Polish & Testing

#### Step 5.1: Performance Optimization
1. Add React.lazy() for feature components
2. Implement virtual scrolling for long lists
3. Add skeleton loading states
4. Optimize re-renders with useMemo/useCallback

#### Step 5.2: Accessibility
1. Add ARIA labels to all interactive elements
2. Ensure keyboard navigation works
3. Test with screen reader
4. Verify color contrast

#### Step 5.3: Error Handling
1. Add error boundaries
2. Implement offline fallback UI
3. Add toast notifications for actions
4. Test all error scenarios

---

## 11. Testing Strategy

### Unit Tests (Jest + React Testing Library)

```typescript
// Example: src/stores/__tests__/tripStore.test.ts

describe('tripStore', () => {
  beforeEach(async () => {
    // Clear IndexedDB
    await clearTestDB();
  });

  it('should create a new trip', async () => {
    const { createTrip, trips } = useTripStore.getState();

    const trip = await createTrip({
      title: 'Test Trip',
      destination: 'Paris',
      startDate: '2025-06-01',
      endDate: '2025-06-07',
    });

    expect(trip.id).toBeDefined();
    expect(trip.title).toBe('Test Trip');
    expect(useTripStore.getState().trips).toHaveLength(1);
  });

  it('should compute correct trip status', () => {
    const today = new Date('2025-06-05');

    expect(computeTripStatus({
      startDate: '2025-06-01',
      endDate: '2025-06-07',
      status: 'planning'
    }, today)).toBe('active');

    expect(computeTripStatus({
      startDate: '2025-06-10',
      endDate: '2025-06-17',
      status: 'planning'
    }, today)).toBe('upcoming');
  });
});
```

### Integration Tests

```typescript
// Example: src/features/today/__tests__/TodayView.integration.test.tsx

describe('TodayView Integration', () => {
  it('should show next activity with countdown', async () => {
    // Setup: Create trip with today's activities
    const trip = createMockTrip({
      startDate: format(new Date(), 'yyyy-MM-dd'),
      activities: [
        { time: '10:00', description: 'Breakfast' },
        { time: '14:00', description: 'Museum Visit' },
      ],
    });

    // Mock current time to 09:30
    jest.setSystemTime(new Date().setHours(9, 30));

    render(<TodayView />, {
      wrapper: ({ children }) => (
        <TestProviders trip={trip}>{children}</TestProviders>
      ),
    });

    expect(screen.getByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText(/30 min/)).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)

```typescript
// Example: e2e/trips.spec.ts

test.describe('Trip Management', () => {
  test('should create a new trip and add activities', async ({ page }) => {
    await page.goto('/');

    // Open create trip modal
    await page.click('[data-testid="create-trip-button"]');

    // Fill form
    await page.fill('[name="title"]', 'Summer Vacation');
    await page.fill('[name="destination"]', 'Barcelona, Spain');
    await page.fill('[name="startDate"]', '2025-07-01');
    await page.fill('[name="endDate"]', '2025-07-07');

    // Submit
    await page.click('[data-testid="create-trip-submit"]');

    // Verify trip created
    await expect(page.getByText('Summer Vacation')).toBeVisible();

    // Add activity via chat
    await page.click('[data-testid="chat-button"]');
    await page.fill('[data-testid="chat-input"]', 'Add breakfast at La Boqueria on day 1 at 9am');
    await page.press('[data-testid="chat-input"]', 'Enter');

    // Wait for AI response and confirm
    await page.click('[data-testid="confirm-activity"]');

    // Verify activity added
    await expect(page.getByText('La Boqueria')).toBeVisible();
  });
});
```

---

## Appendix A: Migration Script

For existing users with localStorage data:

```typescript
// src/utils/migration.ts

export async function migrateFromLocalStorage(): Promise<void> {
  const LEGACY_KEY = 'trippilot_itinerary';

  try {
    const legacyData = localStorage.getItem(LEGACY_KEY);
    if (!legacyData) return;

    const itinerary: Itinerary = JSON.parse(legacyData);

    // Create trip from legacy itinerary
    const trip: Trip = {
      id: nanoid() as TripId,
      title: itinerary.title || 'My Trip',
      description: '',
      startDate: itinerary.days[0]?.date || format(new Date(), 'yyyy-MM-dd'),
      endDate: itinerary.days[itinerary.days.length - 1]?.date || format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      destination: {
        name: extractDestination(itinerary),
        country: '',
        countryCode: '',
        coordinates: findCenterCoordinates(itinerary),
      },
      itinerary,
      status: 'planning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      budgetEnabled: false,
      packingEnabled: false,
      photosEnabled: false,
      defaultCurrency: 'USD',
    };

    // Save to IndexedDB
    const db = await initDB();
    await db.add('trips', trip);

    // Mark migration complete (don't delete legacy data yet)
    localStorage.setItem('trippilot_migrated', 'true');

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    // Don't throw - app should still work with fresh DB
  }
}

function extractDestination(itinerary: Itinerary): string {
  // Try to find most common location city
  const locations = itinerary.days
    .flatMap(d => d.activities)
    .map(a => a.location.name)
    .filter(Boolean);

  // Simple heuristic: return first location or title
  return locations[0]?.split(',')[0] || itinerary.title || 'Unknown';
}

function findCenterCoordinates(itinerary: Itinerary): GeoCoordinates {
  const coords = itinerary.days
    .flatMap(d => d.activities)
    .map(a => a.location.coordinates)
    .filter((c): c is GeoCoordinates => c !== undefined && c.lat !== 0);

  if (coords.length === 0) {
    return { lat: 0, lng: 0 };
  }

  const lat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
  const lng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;

  return { lat, lng };
}
```

---

## Appendix B: Environment Variables

Update `.env.local`:

```env
# Existing
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GOOGLE_MAPS_API_KEY=your_maps_api_key

# New for Features 8 & 11
VITE_EXCHANGE_RATE_API_KEY=your_exchangerate_api_key
VITE_GOOGLE_PLACES_API_KEY=your_places_api_key
```

---

**END OF TECHNICAL DESIGN DOCUMENT**

*This document should be used as the primary reference for implementation. Any deviations should be documented and justified.*
