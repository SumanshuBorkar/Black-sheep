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
 * - Which face is active (front/back) — controls which canvas is shown
 * - The Fabric.js placement objects — positions of accessories on the canvas
 * - Whether there are unsaved changes (isDirty) — controls the save button state
 * - Which accessory category tab is open in the bottom sheet
 * - Whether the accessory picker sheet is open
 */

export interface PlacementData {
  accessoryId: Id<"accessories">;
  face: "front" | "back";
  xPercent: number;
  yPercent: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  zIndex: number;
}

interface EditorStore {
  // The product being customised (set when editor mounts)
  productId: Id<"products"> | null;
  designId: Id<"custom_designs"> | null;

  // Canvas state
  activeFace: "front" | "back";
  placements: PlacementData[];

  // UI state
  isBottomSheetOpen: boolean;
  activeAccessoryType: string | null;  // e.g. "embroidery_patch"
  isDirty: boolean;   // true = unsaved changes exist
  isSaving: boolean;

  // Actions
  setProductId: (id: Id<"products">) => void;
  setDesignId: (id: Id<"custom_designs">) => void;
  setActiveFace: (face: "front" | "back") => void;
  addPlacement: (placement: PlacementData) => void;
  updatePlacement: (accessoryId: Id<"accessories">, face: "front" | "back", updates: Partial<PlacementData>) => void;
  removePlacement: (accessoryId: Id<"accessories">, face: "front" | "back") => void;
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
  activeFace: "front" as const,
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

      setActiveFace: (face) => set({ activeFace: face }),

      addPlacement: (placement) =>
        set((state) => ({
          placements: [...state.placements, placement],
          isDirty: true,
        })),

      updatePlacement: (accessoryId, face, updates) =>
        set((state) => ({
          placements: state.placements.map((p) =>
            p.accessoryId === accessoryId && p.face === face
              ? { ...p, ...updates }
              : p
          ),
          isDirty: true,
        })),

      removePlacement: (accessoryId, face) =>
        set((state) => ({
          placements: state.placements.filter(
            (p) => !(p.accessoryId === accessoryId && p.face === face)
          ),
          isDirty: true,
        })),

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