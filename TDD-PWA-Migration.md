# Technical Design Document: TripPilot PWA Migration

**Version:** 1.0
**Date:** 2025-12-30
**Author:** Principal Software Architect
**Target Implementer:** Junior Engineer (Claude 3.5 Sonnet)

---

## 1. Executive Summary

This document outlines the migration of TripPilot from a Google AI Studio prototype to a production-ready Progressive Web App (PWA). The application is an AI-powered travel itinerary planner with Google Maps integration and Gemini AI chat capabilities.

---

## 2. Current Architecture Assessment

### 2.1 Tech Stack
| Layer | Current | Issue |
|-------|---------|-------|
| Framework | React 19.2.0 + TypeScript 5.8.2 | Good - keep |
| Bundler | Vite 6.2.0 | Good - keep |
| CSS | Tailwind via CDN `<script>` tag | **Critical** - No tree-shaking, no purging |
| Dependencies | AI Studio CDN via importmaps | **Critical** - Non-production pattern |
| AI Service | @google/genai 1.30.0 | Good - keep |
| Maps | @vis.gl/react-google-maps 1.1.0 | Good - keep |
| Icons | lucide-react 0.555.0 | Good - keep |
| PWA | None | **Critical** - Missing entirely |

### 2.2 File Structure (Current)
```
TripPlanner/
├── .env.local              # API keys
├── App.tsx                 # Main app (422 lines - needs splitting)
├── index.html              # Contains CDN imports + inline styles
├── index.tsx               # Entry point
├── types.ts                # Type definitions + Gemini tool schemas
├── vite.config.ts          # Basic config
├── tsconfig.json           # Minimal config
├── package.json            # Missing devDependencies
├── components/
│   ├── ChatAssistant.tsx   # AI chat UI (232 lines)
│   ├── ImportModal.tsx     # Import functionality
│   ├── ItineraryView.tsx   # Day-by-day view
│   ├── MapView.tsx         # Google Maps (486 lines - largest)
│   ├── TravelView.tsx      # Travel logistics view
│   └── TripOverview.tsx    # Trip summary view
└── services/
    └── geminiService.ts    # Gemini AI integration
```

### 2.3 Critical Security Issue (RESOLVED)
**MapView.tsx:7** previously contained a hardcoded Google Maps API key.
This has been moved to environment variables (`VITE_GOOGLE_MAPS_API_KEY`).

---

## 3. Target File Structure (Post-Migration)

```
TripPlanner/
├── public/
│   ├── manifest.json           # NEW: PWA manifest
│   ├── sw.js                   # NEW: Service worker (generated)
│   ├── icons/                  # NEW: PWA icons
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── apple-touch-icon.png
│   └── robots.txt              # NEW
├── src/
│   ├── main.tsx                # Entry point (renamed from index.tsx)
│   ├── App.tsx                 # Main app container
│   ├── index.css               # Global styles + Tailwind directives
│   ├── components/
│   │   ├── layout/
│   │   │   └── Header.tsx      # NEW: Extracted from App.tsx
│   │   ├── chat/
│   │   │   ├── ChatAssistant.tsx
│   │   │   ├── ChatMessage.tsx # NEW: Extracted component
│   │   │   └── SourceLink.tsx  # NEW: Extracted component
│   │   ├── itinerary/
│   │   │   ├── ItineraryView.tsx
│   │   │   ├── ActivityCard.tsx # NEW: Extracted component
│   │   │   └── DayCard.tsx      # NEW: Extracted component
│   │   ├── map/
│   │   │   ├── MapView.tsx
│   │   │   ├── MapMarker.tsx   # NEW: Extracted component
│   │   │   └── DirectionsLayer.tsx # NEW: Extracted component
│   │   ├── travel/
│   │   │   ├── TravelView.tsx
│   │   │   └── TravelLeg.tsx   # NEW: Extracted component
│   │   ├── overview/
│   │   │   └── TripOverview.tsx
│   │   └── modals/
│   │       └── ImportModal.tsx
│   ├── hooks/
│   │   ├── useItinerary.ts     # NEW: State management hook
│   │   ├── useChat.ts          # NEW: Chat state hook
│   │   └── useLocalStorage.ts  # NEW: Persistence hook
│   ├── services/
│   │   └── geminiService.ts
│   ├── types/
│   │   ├── index.ts            # Type exports
│   │   ├── itinerary.ts        # Itinerary types
│   │   ├── chat.ts             # Chat types
│   │   └── tools.ts            # Gemini tool schemas
│   ├── utils/
│   │   ├── geo.ts              # NEW: Distance calculations
│   │   └── date.ts             # NEW: Date formatting
│   └── constants/
│       └── defaults.ts         # NEW: Default itinerary, etc.
├── index.html                  # Minimal, clean HTML
├── .env.local                  # Local secrets
├── .env.example                # NEW: Template for required env vars
├── package.json                # Updated dependencies
├── tsconfig.json               # Stricter config
├── vite.config.ts              # PWA plugin config
├── tailwind.config.js          # NEW: Tailwind configuration
├── postcss.config.js           # NEW: PostCSS configuration
└── README.md                   # Updated documentation
```

---

## 4. Data Models / TypeScript Interfaces

### 4.1 Core Types (src/types/itinerary.ts)

```typescript
// Coordinates
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

// Location with optional coordinates
export interface LocationData {
  name: string;
  coordinates?: GeoCoordinates;
  address?: string;
}

// Activity types - union type for strict typing
export type ActivityType = 'food' | 'lodging' | 'activity' | 'travel';

// Single activity within a day
export interface Activity {
  id: string;
  time?: string;           // Format: "HH:MM AM/PM"
  description: string;
  location: LocationData;
  type: ActivityType;
}

// Single day's itinerary
export interface DayItinerary {
  id: string;
  dayNumber: number;       // 1-indexed
  date: string;            // ISO format: YYYY-MM-DD
  activities: Activity[];
}

// Complete trip itinerary
export interface Itinerary {
  title: string;
  days: DayItinerary[];
}

// View modes for the application
export type ViewMode = 'overview' | 'day' | 'travel';

// Travel leg for route rendering
export interface TravelLeg {
  startId: string;
  endId: string;
}
```

### 4.2 Chat Types (src/types/chat.ts)

```typescript
// Grounding sources from Gemini
export interface GroundingChunk {
  web?: { uri?: string; title?: string };
  maps?: { uri?: string; title?: string };
}

// Pending action types
export type PendingActionType = 'add_activity' | 'replace_itinerary';
export type PendingActionStatus = 'pending' | 'confirmed' | 'cancelled';

// Pending action data structure
export interface PendingActionData {
  dayNumber?: number;
  activity?: Omit<Activity, 'id'>;
  itinerary?: Itinerary;
}

// Pending action attached to chat messages
export interface PendingAction {
  type: PendingActionType;
  data: PendingActionData;
  status: PendingActionStatus;
}

// Chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  pendingAction?: PendingAction;
  groundingChunks?: GroundingChunk[];
  timestamp?: number;      // NEW: For message ordering
}

// Chat history format for Gemini API
export interface GeminiHistoryEntry {
  role: string;
  parts: { text?: string }[];
}
```

### 4.3 Utility Types (src/types/index.ts)

```typescript
// Re-export all types
export * from './itinerary';
export * from './chat';
export * from './tools';

// Component prop helpers
export type WithChildren<T = {}> = T & { children?: React.ReactNode };
export type Nullable<T> = T | null;
```

---

## 5. API Contracts / Function Signatures

### 5.1 Custom Hooks

#### useItinerary.ts
```typescript
interface UseItineraryReturn {
  itinerary: Itinerary;
  activeDayId: string | null;
  setActiveDayId: (id: string | null) => void;
  addActivity: (dayNumber: number, activity: Omit<Activity, 'id'>) => void;
  deleteActivity: (dayId: string, activityId: string) => void;
  replaceItinerary: (newItinerary: Itinerary) => void;
  resetToDefault: () => void;
}

export function useItinerary(storageKey?: string): UseItineraryReturn;
```

#### useChat.ts
```typescript
interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  confirmAction: (messageId: string, action: PendingAction) => void;
  cancelAction: (messageId: string) => void;
  clearHistory: () => void;
}

export function useChat(
  itinerary: Itinerary,
  onItineraryChange: (itinerary: Itinerary) => void,
  onActivityAdd: (dayNumber: number, activity: Omit<Activity, 'id'>) => void
): UseChatReturn;
```

#### useLocalStorage.ts
```typescript
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void];
```

### 5.2 Service Functions

#### geminiService.ts (Updated Signatures)
```typescript
// Parse raw text into itinerary structure
export async function parseItineraryText(
  text: string
): Promise<Itinerary | null>;

// Get AI chat response with function calling
export async function getChatResponse(
  history: GeminiHistoryEntry[],
  message: string,
  currentItinerary: Itinerary
): Promise<{
  text: string | null;
  functionCalls: Array<{ name: string; args: Record<string, unknown> }> | null;
  groundingChunks?: GroundingChunk[];
}>;
```

### 5.3 Utility Functions

#### geo.ts
```typescript
// Calculate distance between two coordinates (Haversine formula)
export function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number;

// Get recommended travel mode based on distance
export function getRecommendedMode(
  distanceKm: number
): 'walking' | 'transit' | 'driving';

// Estimate travel time based on mode and distance
export function estimateTime(
  distanceKm: number,
  mode: 'walking' | 'transit' | 'driving'
): string;
```

#### date.ts
```typescript
// Format date for display
export function formatDisplayDate(
  isoDate: string,
  options?: Intl.DateTimeFormatOptions
): string;

// Generate date string for day offset from today
export function getDateOffset(daysFromToday: number): string;
```

---

## 6. Core Logic / Pseudocode

### 6.1 PWA Service Worker Registration (Critical)

**Location:** `src/main.tsx`

```typescript
// Pseudocode for service worker registration
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration.scope);
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}
```

### 6.2 Itinerary Persistence Logic (useItinerary hook)

```typescript
// Pseudocode for persistence with debounce
function useItinerary(storageKey = 'trippilot_itinerary') {
  // 1. Initialize state from localStorage OR default
  const [itinerary, setItinerary] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { return JSON.parse(saved); }
      catch { return DEFAULT_ITINERARY; }
    }
    return DEFAULT_ITINERARY;
  });

  // 2. Persist changes with 500ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(itinerary));
    }, 500);
    return () => clearTimeout(timer);
  }, [itinerary, storageKey]);

  // 3. Return memoized action handlers
  return useMemo(() => ({
    itinerary,
    addActivity: (dayNumber, activity) => { /* ... */ },
    deleteActivity: (dayId, activityId) => { /* ... */ },
    replaceItinerary: (newItinerary) => { /* ... */ },
  }), [itinerary]);
}
```

### 6.3 Responsive Breakpoint Logic

**Key Decision:** Use Tailwind's default breakpoints with custom adjustments.

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column, chat as overlay |
| Tablet | 768px - 1024px | Side panel + map |
| Desktop | > 1024px | Full layout with wider panels |

```css
/* Critical CSS patterns for mobile-first */
.sidebar {
  @apply w-full md:w-[400px] lg:w-[480px];
}

.chat-container {
  /* Mobile: Bottom sheet */
  @apply fixed inset-x-0 bottom-0 h-[70vh] md:h-auto;
  /* Desktop: Fixed position */
  @apply md:fixed md:bottom-6 md:right-6 md:w-[400px] md:h-[600px];
}
```

### 6.4 Map Bounds Calculation

```typescript
// Pseudocode for fitting map to displayed activities
function fitMapToBounds(map, coordinates) {
  if (coordinates.length === 0) return;

  const bounds = new google.maps.LatLngBounds();
  coordinates.forEach(coord => bounds.extend(coord));

  map.fitBounds(bounds, { padding: 50 });

  // Prevent over-zoom on single point
  google.maps.event.addListenerOnce(map, 'idle', () => {
    if (map.getZoom() > 16) map.setZoom(16);
  });
}
```

---

## 7. Package.json Updates (Exact Versions)

```json
{
  "name": "trippilot",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@google/genai": "^1.0.1",
    "@vis.gl/react-google-maps": "^1.1.0",
    "lucide-react": "^0.469.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.7.2",
    "vite": "^6.0.6",
    "vite-plugin-pwa": "^0.21.1",
    "workbox-window": "^7.3.0"
  }
}
```

**Architectural Decision:** Using Tailwind CSS 3.x instead of 4.x for stability with the PWA plugin and broader ecosystem support. React 19 is kept as it's stable and the code already targets it.

---

## 8. Configuration Files

### 8.1 vite.config.ts

```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'robots.txt'],
        manifest: {
          name: 'TripPilot - AI Travel Planner',
          short_name: 'TripPilot',
          description: 'AI-powered travel itinerary planning',
          theme_color: '#3b82f6',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-maps-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_MAPS_API_KEY': JSON.stringify(env.GOOGLE_MAPS_API_KEY)
    },
    server: {
      port: 3000,
      host: true
    },
    build: {
      target: 'esnext',
      sourcemap: true
    }
  };
});
```

### 8.2 tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      animation: {
        'in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
```

### 8.3 postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 8.4 tsconfig.json (Stricter)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["node", "vite/client"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 8.5 .env.example

```bash
# Gemini AI API Key (required)
# Get from: https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Google Maps API Key (required for map features)
# Get from: https://console.cloud.google.com/google/maps-apis
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

---

## 9. Edge Cases & Pitfalls

### 9.1 Offline Mode / Service Worker

**Problem:** User opens app while offline after initial install.

**Solution:**
- Service worker caches all static assets
- Show offline indicator in UI when `navigator.onLine === false`
- Disable AI chat features gracefully with message: "You're offline. Your saved itinerary is available."
- Store pending actions in IndexedDB for sync when online

```typescript
// Add to App.tsx
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

### 9.2 Google Maps API Key Restrictions

**Problem:** API key exposed in client-side code can be abused.

**Solution:**
1. Configure API key restrictions in Google Cloud Console:
   - HTTP referrer restrictions: `localhost:*`, `yourdomain.com/*`
   - API restrictions: Enable only Maps JavaScript API, Places API, Directions API
2. Use environment variables (never hardcode)
3. Implement usage quotas and billing alerts

### 9.3 Large Itineraries (30+ days)

**Problem:** Rendering 30 days with 3+ activities each causes performance issues.

**Solution:**
- Virtualize the day list using windowing (react-window or manual)
- Lazy load activities per day
- Debounce map marker updates

```typescript
// Lazy day rendering pattern
const visibleDays = useMemo(() => {
  const start = Math.max(0, activeDayIndex - 2);
  const end = Math.min(days.length, activeDayIndex + 5);
  return days.slice(start, end);
}, [days, activeDayIndex]);
```

### 9.4 Gemini API Rate Limits

**Problem:** Free tier has request limits; rapid chatting can hit them.

**Solution:**
- Implement client-side throttling (max 1 request per 2 seconds)
- Show "Please wait..." during cooldown
- Cache recent responses to avoid duplicate calls

### 9.5 LocalStorage Quota

**Problem:** LocalStorage has ~5MB limit; large itineraries + chat history can exceed this.

**Solution:**
- Compress data before storing (`JSON.stringify` + LZ compression)
- Limit chat history to last 50 messages
- Implement "Export Itinerary" feature for backup

---

## 10. Implementation Steps (Sequential)

### Phase 1: Project Structure Setup (Steps 1-6)

1. **Create new directory structure**
   - Create `src/` directory
   - Create subdirectories: `components/`, `hooks/`, `services/`, `types/`, `utils/`, `constants/`
   - Create `public/icons/` directory

2. **Move and rename files**
   - Move `index.tsx` to `src/main.tsx`
   - Move `App.tsx` to `src/App.tsx`
   - Move `types.ts` to `src/types/` and split into separate files
   - Move `services/geminiService.ts` to `src/services/`
   - Move all components to `src/components/` with new subdirectory structure

3. **Update package.json**
   - Replace contents with the new package.json from Section 7
   - Run `npm install` to install all dependencies

4. **Create configuration files**
   - Create `tailwind.config.js` (Section 8.2)
   - Create `postcss.config.js` (Section 8.3)
   - Update `tsconfig.json` (Section 8.4)
   - Update `vite.config.ts` (Section 8.1)

5. **Create environment template**
   - Create `.env.example` (Section 8.5)
   - Update `.env.local` to include `GOOGLE_MAPS_API_KEY`

6. **Update index.html**
   - Remove importmap script block
   - Remove Tailwind CDN script tag
   - Remove inline styles (move to CSS)
   - Update script src to `/src/main.tsx`
   - Add PWA meta tags

### Phase 2: CSS Migration (Steps 7-8)

7. **Create global CSS file**
   - Create `src/index.css`
   - Add Tailwind directives: `@tailwind base; @tailwind components; @tailwind utilities;`
   - Move custom scrollbar styles from index.html
   - Move `.btn-press` animation styles
   - Add Nunito font import via `@import`

8. **Import CSS in main.tsx**
   - Add `import './index.css'` at top of main.tsx

### Phase 3: Type System Refactor (Steps 9-11)

9. **Split types.ts into modules**
   - Create `src/types/itinerary.ts` with itinerary-related types
   - Create `src/types/chat.ts` with chat-related types
   - Create `src/types/tools.ts` with Gemini tool schemas
   - Create `src/types/index.ts` with re-exports

10. **Update all imports**
    - Search and replace `from '../types'` with `from '@/types'`
    - Search and replace `from './types'` with `from '@/types'`

11. **Add strict null checks**
    - Fix any TypeScript errors that arise from stricter config

### Phase 4: Security Fixes (Step 12)

12. **Remove hardcoded API key**
    - In `src/components/map/MapView.tsx`, remove line: `const HARDCODED_KEY = "..."`
    - Update to use only: `const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY`
    - Update vite.config.ts to use `VITE_` prefix for client-exposed env vars

### Phase 5: Utility Extraction (Steps 13-14)

13. **Create geo utilities**
    - Create `src/utils/geo.ts`
    - Extract `getDistanceKm`, `getRecommendedMode`, `estimateTime` from TravelView.tsx
    - Export from utils and import in components

14. **Create date utilities**
    - Create `src/utils/date.ts`
    - Add `formatDisplayDate` and `getDateOffset` functions
    - Update components to use these utilities

### Phase 6: Custom Hooks (Steps 15-17)

15. **Create useLocalStorage hook**
    - Create `src/hooks/useLocalStorage.ts`
    - Implement generic localStorage persistence with error handling

16. **Create useItinerary hook**
    - Create `src/hooks/useItinerary.ts`
    - Extract state and actions from App.tsx
    - Use useLocalStorage internally

17. **Create useChat hook**
    - Create `src/hooks/useChat.ts`
    - Extract chat state and Gemini interaction from App.tsx
    - Include loading state and action handlers

### Phase 7: Component Extraction (Steps 18-21)

18. **Extract Header component**
    - Create `src/components/layout/Header.tsx`
    - Extract header JSX from App.tsx (lines 327-379)
    - Pass view mode state as props

19. **Extract ChatMessage component**
    - Create `src/components/chat/ChatMessage.tsx`
    - Extract message rendering logic from ChatAssistant.tsx
    - Create `src/components/chat/SourceLink.tsx` for grounding links

20. **Extract ActivityCard component**
    - Create `src/components/itinerary/ActivityCard.tsx`
    - Extract activity item rendering from ItineraryView.tsx

21. **Extract TravelLeg component**
    - Create `src/components/travel/TravelLeg.tsx`
    - Extract travel card rendering from TravelView.tsx

### Phase 8: PWA Setup (Steps 22-25)

22. **Create PWA icons**
    - Create `public/icons/icon-192.png` (192x192 blue plane icon)
    - Create `public/icons/icon-512.png` (512x512 version)
    - Create `public/icons/apple-touch-icon.png` (180x180)

23. **Add PWA meta tags to index.html**
    ```html
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
    <meta name="theme-color" content="#3b82f6">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    ```

24. **Test PWA manifest**
    - Run `npm run build`
    - Run `npm run preview`
    - Check Chrome DevTools > Application > Manifest

25. **Create robots.txt**
    - Create `public/robots.txt`
    ```
    User-agent: *
    Allow: /
    ```

### Phase 9: Mobile Responsiveness (Steps 26-28)

26. **Update ChatAssistant for mobile**
    - Make chat panel full-width on mobile with bottom-sheet pattern
    - Add swipe-to-dismiss gesture support
    - Reduce padding on mobile

27. **Update Header for mobile**
    - Stack navigation buttons on smaller screens
    - Use icon-only mode below 640px

28. **Update ItineraryView for mobile**
    - Full-width cards on mobile
    - Larger touch targets (min 44x44px)
    - Adjust font sizes

### Phase 10: Testing & Validation (Steps 29-31)

29. **Test build process**
    - Run `npm run build` - fix any errors
    - Run `npm run preview` - test production build
    - Check bundle size (target < 500KB gzipped)

30. **Test PWA installation**
    - Test "Add to Home Screen" on iOS Safari
    - Test "Install App" on Android Chrome
    - Verify offline functionality

31. **Test responsive design**
    - Test on iPhone SE (375px width)
    - Test on iPad (768px width)
    - Test on desktop (1440px width)
    - Verify touch interactions work correctly

---

## 11. Success Criteria

The migration is complete when:

- [ ] `npm run dev` starts without errors
- [ ] `npm run build` completes without TypeScript errors
- [ ] No hardcoded API keys in source code
- [ ] PWA is installable on mobile devices
- [ ] Offline mode shows saved itinerary
- [ ] Lighthouse PWA score > 90
- [ ] Lighthouse Performance score > 80
- [ ] All existing features work (chat, map, import, views)
- [ ] Mobile touch interactions are smooth
- [ ] No console errors in production build

---

## Appendix A: Import Path Mapping

| Old Import | New Import |
|------------|------------|
| `from './types'` | `from '@/types'` |
| `from '../types'` | `from '@/types'` |
| `from './services/geminiService'` | `from '@/services/geminiService'` |
| `from '../services/geminiService'` | `from '@/services/geminiService'` |
| `from './components/X'` | `from '@/components/[category]/X'` |

---

## Appendix B: Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Google Maps Platform API key |

**Note:** Vite requires `VITE_` prefix for client-exposed environment variables.

---

*End of Technical Design Document*
