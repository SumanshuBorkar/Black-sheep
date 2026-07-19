import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Id } from "../../convex/_generated/dataModel";

export type OutfitSlotCategory =
  | "headwear"
  | "outerwear"
  | "top"
  | "bottom"
  | "footwear"
  | "accessory";

export const OUTFIT_SLOT_ORDER: OutfitSlotCategory[] = [
  "headwear",
  "outerwear",
  "top",
  "bottom",
  "footwear",
];

interface SlotState {
  productId: Id<"products"> | null;
  currentIndex: number;  // Position in the carousel for this slot
}

interface OutfitBuilderStore {
  // Size lock — set once at session start, never changes mid-session
  selectedSize: string | null;
  isSizeLocked: boolean;

  // One entry per slot category
  slots: Record<OutfitSlotCategory, SlotState>;

  // UI state
  mode: "browse" | "wardrobe";
  activeSlot: OutfitSlotCategory | null;
  isSaving: boolean;

  // Convex outfit ID (set after first save to Convex)
  outfitId: Id<"outfit_builds"> | null;

  // Actions
  lockSize: (size: string) => void;
  setSlotProduct: (category: OutfitSlotCategory, productId: Id<"products"> | null) => void;
  setSlotIndex: (category: OutfitSlotCategory, index: number) => void;
  setActiveSlot: (category: OutfitSlotCategory | null) => void;
  setMode: (mode: "browse" | "wardrobe") => void;
  setOutfitId: (id: Id<"outfit_builds">) => void;
  setIsSaving: (saving: boolean) => void;
  resetBuilder: () => void;
}

const defaultSlots: Record<OutfitSlotCategory, SlotState> = {
  headwear:  { productId: null, currentIndex: 0 },
  outerwear: { productId: null, currentIndex: 0 },
  top:       { productId: null, currentIndex: 0 },
  bottom:    { productId: null, currentIndex: 0 },
  footwear:  { productId: null, currentIndex: 0 },
  accessory: { productId: null, currentIndex: 0 },
};

const initialState = {
  selectedSize: null,
  isSizeLocked: false,
  slots: defaultSlots,
  mode: "browse" as const,
  activeSlot: null,
  isSaving: false,
  outfitId: null,
};

export const useOutfitBuilderStore = create<OutfitBuilderStore>()(
  devtools(
    (set) => ({
      ...initialState,

      lockSize: (size) =>
        set({ selectedSize: size, isSizeLocked: true }),

      setSlotProduct: (category, productId) =>
        set((state) => ({
          slots: {
            ...state.slots,
            [category]: { ...state.slots[category], productId },
          },
        })),

      setSlotIndex: (category, index) =>
        set((state) => ({
          slots: {
            ...state.slots,
            [category]: { ...state.slots[category], currentIndex: index },
          },
        })),

      setActiveSlot: (category) =>
        set({ activeSlot: category }),

      setMode: (mode) => set({ mode }),

      setOutfitId: (id) => set({ outfitId: id }),

      setIsSaving: (saving) => set({ isSaving: saving }),

      resetBuilder: () => set(initialState),
    }),
    { name: "outfitBuilderStore" }
  )
);