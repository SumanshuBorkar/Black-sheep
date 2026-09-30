import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * editorStore — Customisation Editor UI state
 *
 * Plain English:
 * Tracks everything the editor needs while a user is designing
 * a custom garment. None of this lives on the server — it's all
 * in-progress work. When the user taps "Add to Wardrobe", we take
 * a snapshot of this store and send it to Convex as a mutation.
 * Only THEN does it become server state.
 *
 * What lives here:
 * - Which view/side is active (front/back/left/right/...) — controls
 *   which garment photo + canvas is shown. A product can have any number
 *   of views (a cap might have 5), not just two.
 * - The placement objects — WORLD-SPACE (millimetre) positions of
 *   accessories, independent of screen size or zoom level.
 * - Whether there are unsaved changes (isDirty) — controls the save button state
 * - Which accessory category tab is open in the bottom sheet
 * - Whether the accessory picker sheet is open
 *
 * Note on placementId: a placement is uniquely identified by a
 * client-generated placementId (NOT by accessoryId), so the SAME accessory
 * can be placed more than once on the same view (e.g. two identical pins).
 */

export interface PlacementData {
  placementId: string;               // unique per placement, e.g. crypto.randomUUID()
  accessoryId: Id<"accessories">;
  viewId: Id<"product_images">;      // which garment view/side this sits on
  xMm: number;                        // horizontal position, mm from view origin
  yMm: number;                        // vertical position, mm from view origin
  rotation: number;                   // degrees
  scaleX: number;                     // world-space scale actually applied
  scaleY: number;
  zIndex: number;                     // layer order (for overlapping accessories)
}

interface EditorStore {
  // The product being customised (set when editor mounts)
  productId: Id<"products"> | null;
  designId: Id<"custom_designs"> | null;

  // Canvas state
  activeViewId: Id<"product_images"> | null;
  placements: PlacementData[];

  // UI state
  isBottomSheetOpen: boolean;
  activeAccessoryType: string | null;  // e.g. "embroidery_patch"
  isDirty: boolean;   // true = unsaved changes exist
  isSaving: boolean;

  // Actions
  setProductId: (id: Id<"products">) => void;
  setDesignId: (id: Id<"custom_designs">) => void;
  setActiveViewId: (viewId: Id<"product_images">) => void;
  addPlacement: (placement: PlacementData) => void;
  updatePlacement: (placementId: string, updates: Partial<PlacementData>) => void;
  removePlacement: (placementId: string) => void;
  setPlacements: (placements: PlacementData[]) => void;
  openBottomSheet: (type: string) => void;
  closeBottomSheet: () => void;
  setIsSaving: (saving: boolean) => void;
  markSaved: () => void;
  resetEditor: () => void;
}

const initialState = {
  productId: null,
  designId: null,
  activeViewId: null,
  placements: [],
  isBottomSheetOpen: false,
  activeAccessoryType: null,
  isDirty: false,
  isSaving: false,
};

export const useEditorStore = create<EditorStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setProductId: (id) => set({ productId: id }),

      setDesignId: (id) => set({ designId: id }),

      setActiveViewId: (viewId) => set({ activeViewId: viewId }),

      addPlacement: (placement) =>
        set((state) => ({
          placements: [...state.placements, placement],
          isDirty: true,
        })),

      updatePlacement: (placementId, updates) =>
        set((state) => ({
          placements: state.placements.map((p) =>
            p.placementId === placementId ? { ...p, ...updates } : p
          ),
          isDirty: true,
        })),

      removePlacement: (placementId) =>
        set((state) => ({
          placements: state.placements.filter((p) => p.placementId !== placementId),
          isDirty: true,
        })),

      // Loads placements from a saved design (or resets to empty for a new
      // one) WITHOUT marking the store dirty — this is a load, not an edit.
      setPlacements: (placements) =>
        set({ placements, isDirty: false }),

      openBottomSheet: (type) =>
        set({ isBottomSheetOpen: true, activeAccessoryType: type }),

      closeBottomSheet: () =>
        set({ isBottomSheetOpen: false }),

      setIsSaving: (saving) => set({ isSaving: saving }),

      markSaved: () => set({ isDirty: false, isSaving: false }),

      // Called when leaving the editor — clean slate for next use
      resetEditor: () => set(initialState),
    }),
    { name: "editorStore" }
  )
);
