"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useAction } from "convex/react";
import { Plus, ChevronLeft, Trash2  } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useEditorStore } from "../../store/editorStore";
import { useToast } from "@/components/ui/toast";
import { EditorCanvas, type EditorCanvasHandle, type EditorView } from "./EditorCanvas";
import { AccessorySheet } from "./AccessorySheet";
import { Button } from "@/components/ui/button";
import type { Id } from "../../../convex/_generated/dataModel";

interface ProductInfo {
  _id: Id<"products">;
  title: string;
  slug: string;
  sellingPrice: number;
}

interface EditorShellProps {
  product: ProductInfo;
  views: EditorView[];   // any number of customisable sides — front/back/left/right/top/...
  existingDesignId?: Id<"custom_designs">;
}

export function EditorShell({ product, views, existingDesignId }: EditorShellProps) {
  const router = useRouter();
  const { toast } = useToast();
  const canvasRef = useRef<EditorCanvasHandle>(null);

  const {
    activeViewId, setActiveViewId,
    placements, isDirty,
    isBottomSheetOpen, openBottomSheet, closeBottomSheet,
    setDesignId, designId, isSaving, setIsSaving, markSaved,
    setPlacements, resetEditor,
  } = useEditorStore();

  const upsertDesign = useMutation(api.designs.upsertDesign);
  const saveToWardrobe = useMutation(api.designs.saveDesignToWardrobe);
  const genUploadSig = useAction(api.cloudinary.generateUploadSignature);

  // Load the existing design (if any) so reopening a saved design shows
  // its placements instead of a blank canvas.
  const existingDesign = useQuery(
    api.designs.getDesign,
    existingDesignId ? { designId: existingDesignId } : "skip"
  );

  useEffect(() => {
    resetEditor();
    useEditorStore.getState().setProductId(product._id);
    if (views[0]) useEditorStore.getState().setActiveViewId(views[0].viewId as Id<"product_images">);
    if (existingDesignId) setDesignId(existingDesignId);
    return () => resetEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product._id]);

  // Once the saved design has loaded, populate the store's placements.
  // Guarded so this only happens once per design (not on every re-render,
  // and not overwriting the user's in-progress edits).
  const loadedDesignRef = useRef<string | null>(null);
  useEffect(() => {
    if (!existingDesign) return;
    if (loadedDesignRef.current === existingDesign._id) return;
    loadedDesignRef.current = existingDesign._id;
    setPlacements(existingDesign.placements as any);
  }, [existingDesign, setPlacements]);

  // Auto-save debounced
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!isDirty) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        const state = useEditorStore.getState();
        if (!state.productId) return;
        const id = await upsertDesign({
          designId: state.designId ?? undefined,
          productId: state.productId,
          placements: state.placements,
          totalAccessoryCost: 0,
          status: "draft",
        });
        setDesignId(id as Id<"custom_designs">);
        markSaved();
      } catch { /* silent */ }
    }, 1500);
    return () => clearTimeout(autoSaveTimer.current);
  }, [isDirty, placements]);

  const deleteZoneRef = useRef<HTMLDivElement>(null);

  const [isDeleteTarget, setIsDeleteTarget] = useState(false);

  async function uploadPreview(blob: Blob, slug: string): Promise<string> {
    const sig = await genUploadSig({ folder: "blax-sheep/designs" });
    const fd = new FormData();
    fd.append("file", blob, `preview-${slug}.jpg`);
    fd.append("api_key", sig.apiKey ?? "");
    fd.append("timestamp", String(sig.timestamp));
    fd.append("signature", sig.signature);
    fd.append("folder", sig.folder);
    fd.append("transformation", sig.transformation);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: "POST", body: fd,
    });
    if (!res.ok) throw new Error("Preview upload failed");
    const data = await res.json();
    return data.public_id as string;
  }

  async function handleAddToWardrobe() {
    if (!canvasRef.current) return;
    setIsSaving(true);
    try {
      const state = useEditorStore.getState();
      if (!state.productId) throw new Error("No product.");

      // Export front + back if present (used for the wardrobe thumbnail);
      // other sides (left/right/cap-top etc.) aren't needed for the preview.
      const front = views.find((v) => v.slug === "front") ?? views[0];
      const back = views.find((v) => v.slug === "back");

      const frontBlob = front ? await canvasRef.current.exportPNG(front.viewId) : null;
      const frontPublicId = frontBlob ? await uploadPreview(frontBlob, "front") : undefined;

      let backPublicId: string | undefined;
      if (back) {
        const backBlob = await canvasRef.current.exportPNG(back.viewId);
        if (backBlob) backPublicId = await uploadPreview(backBlob, "back");
      }

      await saveToWardrobe({
        designId: state.designId ?? undefined,
        productId: state.productId,
        placements: state.placements,
        previewFrontPublicId: frontPublicId,
        previewBackPublicId: backPublicId,
      });

      toast.success("Added to wardrobe!");
      router.push("/wardrobe");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save design.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-white flex flex-col">

      {/* =========================================================
          HEADER
          ========================================================= */}
      <header className="header-bar shrink-0">

        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          className="
            flex items-center gap-1
            font-mono text-xs font-bold uppercase tracking-wider
            shrink-0
          "
        >
          <ChevronLeft size={16} strokeWidth={2} />
          Back
        </button>

        {/* View selector */}
        {views.length > 1 && (
          <div
            className="
              absolute left-1/2 -translate-x-1/2
              flex
              max-w-[60vw]
              overflow-x-auto
              scrollbar-none
            "
          >
            {views.map((view, i) => (
              <button
                key={view.viewId}
                type="button"
                onClick={() =>
                  setActiveViewId(view.viewId as Id<"product_images">)
                }
                className={`
                  px-4 py-1
                  font-mono text-xs font-bold uppercase tracking-wider
                  border border-black
                  whitespace-nowrap
                  transition-all
                  ${i > 0
                    ? "border-l-0"
                    : ""
                  }
                  ${activeViewId === view.viewId
                    ? "bg-black text-yellow"
                    : "bg-white text-black"
                  }
                `}
              >
                {view.label || view.slug}
              </button>
            ))}
          </div>
        )}

        {/* Keeps the header balanced */}
        <div className="w-16 shrink-0" />
      </header>


      {/* =========================================================
          CANVAS AREA
          ========================================================= */}
      <main className="relative flex-1 min-h-0 min-w-0 overflow-hidden">

        {activeViewId && (
          <EditorCanvas
            ref={canvasRef}
            views={views}
            activeViewId={activeViewId}
            deleteZoneRef={deleteZoneRef}
            onDeleteTargetChange={setIsDeleteTarget}
          />
        )}

      </main>


      {/* =========================================================
          BOTTOM TOOLBAR
          ========================================================= */}
      <footer
        className="
          shrink-0
          border-t border-black
          bg-white
          px-3
          py-3
          pb-[max(0.75rem,env(safe-area-inset-bottom))]
        "
      >
        <div className="grid grid-cols-3 gap-2">

          {/* ADD ACCESSORY */}
          <button
            type="button"
            onClick={() => openBottomSheet("embroidery_patch")}
            className="
              h-12
              border border-black
              bg-white
              text-black
              font-mono
              text-xs
              font-bold
              uppercase
              tracking-wider
              flex
              items-center
              justify-center
              gap-2
              active:scale-[0.98]
              transition-transform
            "
          >
            <Plus size={18} strokeWidth={2.5} />
            <span className="hidden sm:inline">
              Add Accessory
            </span>
            <span className="sm:hidden">
              Add
            </span>
          </button>


          {/* DELETE DROP ZONE */}
          <div
            ref={deleteZoneRef}
            className={`
              h-12
              border
              flex
              items-center
              justify-center
              gap-2
              font-mono
              text-xs
              font-bold
              uppercase
              tracking-wider
              select-none
              transition-all
              ${isDeleteTarget
                ? "border-red-600 bg-red-600 text-white scale-[1.02]"
                : "border-black bg-white text-black"
              }
            `}
          >
            <Trash2 size={18} strokeWidth={2} />

            <span className="hidden sm:inline">
              {isDeleteTarget ? "Release to Delete" : "Delete"}
            </span>

            <span className="sm:hidden">
              Delete
            </span>
          </div>


          {/* SAVE */}
          <Button
            variant="primary"
            size="lg"
            className="h-12 w-full"
            onClick={handleAddToWardrobe}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Add to Wardrobe"}
          </Button>

        </div>
      </footer>


      {/* =========================================================
          ACCESSORY SHEET
          ========================================================= */}
      <AccessorySheet
        isOpen={isBottomSheetOpen}
        onClose={closeBottomSheet}
        onAddToCanvas={(accessory) => {
          canvasRef.current?.addAccessoryToCanvas(accessory);
        }}
      />

    </div>
  );
}
