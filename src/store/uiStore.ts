import { create } from "zustand";
import { devtools } from "zustand/middleware";

/**
 * uiStore — Global UI state
 *
 * Plain English:
 * Anything that needs to be "globally visible" from multiple
 * components but doesn't belong on the server. Examples:
 * - A toast notification triggered from a mutation callback
 * - Whether the filter panel is open on the shop page
 * - The currently active product filter selections
 *
 * Keep this store LEAN — if something is only used in one
 * component, use local useState instead.
 */

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export interface ProductFilters {
  category?: string;
  size?: string;
  condition?: string;
  sortBy: "newest" | "price_asc" | "price_desc";
}

interface UiStore {
  // Toast notifications (shown in the corner after mutations)
  toasts: Toast[];
  addToast: (message: string, type: Toast["type"]) => void;
  removeToast: (id: string) => void;

  // Shop page filter state
  isFilterOpen: boolean;
  filters: ProductFilters;
  toggleFilter: () => void;
  setFilter: (updates: Partial<ProductFilters>) => void;
  clearFilters: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const useUiStore = create<UiStore>()(
  devtools(
    (set) => ({
      toasts: [],

      addToast: (message, type) => {
        const id = Date.now().toString();
        set((state) => ({
          toasts: [...state.toasts, { id, message, type }],
        }));
        // Auto-dismiss after 3.5 seconds
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }));
        }, 3500);
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      isFilterOpen: false,
      filters: { sortBy: "newest" },

      toggleFilter: () =>
        set((state) => ({ isFilterOpen: !state.isFilterOpen })),

      setFilter: (updates) =>
        set((state) => ({
          filters: { ...state.filters, ...updates },
        })),

      clearFilters: () =>
        set({ filters: { sortBy: "newest" } }),

      searchQuery: "",
      setSearchQuery: (q) => set({ searchQuery: q }),
    }),
    { name: "uiStore" }
  )
);