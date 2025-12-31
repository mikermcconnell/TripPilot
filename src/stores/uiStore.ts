import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode } from '@/types';

/**
 * Extended view modes including new features
 */
export type ExtendedViewMode = ViewMode | 'today' | 'country' | 'trips' | 'budget' | 'packing' | 'photos' | 'planner';

interface UIState {
  // View
  viewMode: ExtendedViewMode;
  setViewMode: (mode: ExtendedViewMode) => void;

  // Per-trip view persistence
  tripViewModes: Record<string, ExtendedViewMode>;
  setTripViewMode: (tripId: string, mode: ExtendedViewMode) => void;
  getTripViewMode: (tripId: string) => ExtendedViewMode | null;

  // Sidebar
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Modals
  activeModal: string | null;
  modalData: unknown;
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;

  // Selection states
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  setHoveredActivity: (id: string | null) => void;
  setSelectedActivity: (id: string | null) => void;

  // Day selection
  activeDayId: string | null;
  setActiveDayId: (id: string | null) => void;

  // Hover states for other views
  hoveredDayId: string | null;
  setHoveredDayId: (id: string | null) => void;

  // Travel view
  hoveredLeg: { startId: string; endId: string } | null;
  setHoveredLeg: (leg: { startId: string; endId: string } | null) => void;

  // Global chat state
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      viewMode: 'today',
      tripViewModes: {},
      isSidebarOpen: false,
      activeModal: null,
      modalData: null,
      hoveredActivityId: null,
      selectedActivityId: null,
      activeDayId: null,
      hoveredDayId: null,
      hoveredLeg: null,
      isChatOpen: false,

      // View actions
      setViewMode: (mode) => set({ viewMode: mode }),

      // Per-trip view persistence
      setTripViewMode: (tripId, mode) => set((state) => ({
        tripViewModes: { ...state.tripViewModes, [tripId]: mode }
      })),
      getTripViewMode: (tripId) => get().tripViewModes[tripId] || null,

      // Sidebar actions
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      // Modal actions
      openModal: (modalId, data) => set({ activeModal: modalId, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      // Selection actions
      setHoveredActivity: (id) => set({ hoveredActivityId: id }),
      setSelectedActivity: (id) => set({ selectedActivityId: id }),
      setActiveDayId: (id) => set({ activeDayId: id }),
      setHoveredDayId: (id) => set({ hoveredDayId: id }),
      setHoveredLeg: (leg) => set({ hoveredLeg: leg }),

      // Global chat actions
      openChat: () => set({ isChatOpen: true }),
      closeChat: () => set({ isChatOpen: false }),
      toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
    }),
    {
      name: 'trippilot-ui',
      partialize: (state) => ({
        viewMode: state.viewMode,
        tripViewModes: state.tripViewModes,
        isChatOpen: state.isChatOpen,
      }),
    }
  )
);
