"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useAction } from "convex/react";
import { Plus, ChevronLeft } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useEditorStore } from "../../store/editorStore";
import { useToast } from "@/components/ui/toast";
import { EditorCanvas, type EditorCanvasHandle } from "./EditorCanvas";
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
  frontImagePublicId: string;
  backImagePublicId: string;
  existingDesignId?: Id<"custom_designs">;
}

export function EditorShell({
  product,
  frontImagePublicId,
  backImagePublicId,
  existingDesignId,
}: EditorShellProps) {
  const router    = useRouter();
  const { toast } = useToast();
  const canvasRef = useRef<EditorCanvasHandle>(null);

  const {
    activeFace, setActiveFace,
    placements, isDirty,
    isBottomSheetOpen, openBottomSheet, closeBottomSheet,
    setDesignId, designId, isSaving, setIsSaving, markSaved,
    resetEditor,
  } = useEditorStore();

  const upsertDesign   = useMutation(api.designs.upsertDesign);
  const saveToWardrobe = useMutation(api.designs.saveDesignToWardrobe);
  const genUploadSig   = useAction(api.cloudinary.generateUploadSignature);

  useEffect(() => {
    resetEditor();
    useEditorStore.getState().setProductId(product._id);
    if (existingDesignId) setDesignId(existingDesignId);
    return () => resetEditor();
  }, [product._id]);

  // Auto-save debounced
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!isDirty) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        const state = useEditorStore.getState();
        if (!state.productId) return;
        const id = await upsertDesign({
          designId:           state.designId ?? undefined,
          productId:          state.productId,
          placements:         state.placements,
          totalAccessoryCost: 0,
          status:             "draft",
        });
        setDesignId(id as Id<"custom_designs">);
        markSaved();
      } catch { /* silent */ }
    }, 1500);
    return () => clearTimeout(autoSaveTimer.current);
  }, [isDirty, placements]);

  async function uploadPreview(blob: Blob, face: "front" | "back"): Promise<string> {
    const sig = await genUploadSig({ folder: "blax-sheep/designs" });
    const fd  = new FormData();
    fd.append("file",           blob,             `preview-${face}.jpg`);
    fd.append("api_key",        sig.apiKey ?? "");
    fd.append("timestamp",      String(sig.timestamp));
    fd.append("signature",      sig.signature);
    fd.append("folder",         sig.folder);
    fd.append("transformation", sig.transformation);

    const res  = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
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

      const frontBlob = await canvasRef.current.exportPNG("front");
      const frontPublicId = frontBlob ? await uploadPreview(frontBlob, "front") : undefined;

      let backPublicId: string | undefined;
      if (backImagePublicId) {
        const backBlob = await canvasRef.current.exportPNG("back");
        if (backBlob) backPublicId = await uploadPreview(backBlob, "back");
      }

      await saveToWardrobe({
        designId:             state.designId ?? undefined,
        productId:            state.productId,
        placements:           state.placements,
        previewFrontPublicId: frontPublicId,
        previewBackPublicId:  backPublicId,
      });

      toast.success("Added to wardrobe!");
      router.push("/wardrobe");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save design.");
    } finally {
      setIsSaving(false);
    }
  }

  const hasBothFaces = !!frontImagePublicId && !!backImagePublicId;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="header-bar shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          Back
        </button>

        {hasBothFaces && (
          <div className="flex absolute left-1/2 -translate-x-1/2">
            {(["front", "back"] as const).map((face, i) => (
              <button
                key={face}
                onClick={() => setActiveFace(face)}
                className={`px-4 py-1 font-mono text-xs font-bold uppercase tracking-wider border border-black transition-all ${i === 1 ? "border-l-0" : ""} ${activeFace === face ? "bg-black text-yellow" : "bg-white text-black"}`}
              >
                {face}
              </button>
            ))}
          </div>
        )}
        <div className="w-16" />
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <EditorCanvas
          ref={canvasRef}
          frontImagePublicId={frontImagePublicId}
          backImagePublicId={backImagePublicId}
          activeFace={activeFace}
        />
      </div>

      {/* Add to Wardrobe */}
      <div className="shrink-0 px-4 pb-6 pt-3 border-t border-black bg-white">
        <Button variant="primary" size="lg" className="w-full" onClick={handleAddToWardrobe} disabled={isSaving}>
          {isSaving ? "Saving..." : "Add to Wardrobe"}
        </Button>
      </div>

      {/* FAB */}
      <button
        onClick={() => openBottomSheet("embroidery_patch")}
        className="fab"
        aria-label="Add accessory"
        style={{ bottom: "5.5rem" }}
      >
        <Plus size={24} strokeWidth={2.5} className="text-black" />
      </button>

      {/* Accessory Sheet */}
      <AccessorySheet
        isOpen={isBottomSheetOpen}
        onClose={closeBottomSheet}
        onAddToCanvas={(url, id) => canvasRef.current?.addAccessoryToCanvas(url, id)}
      />
    </div>
  );
}
