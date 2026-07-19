"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOutfitBuilderStore, OUTFIT_SLOT_ORDER } from "@/stores/outfitBuilderStore";
import { useToast } from "@/components/ui/toast";
import { SizeSelector } from "./SizeSelector";
import { OutfitStack } from "./OutfitStack";
import { ProductDetailSheet } from "./ProductDetailSheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * OutfitBuilderShell — orchestrates the entire outfit builder experience
 *
 * Flow:
 * 1. Size not locked → show SizeSelector modal
 * 2. Size locked → show OutfitStack with carousel slots
 * 3. User taps a product → ProductDetailSheet slides up
 * 4. User taps "Save" → html2canvas export → upload → save to Convex
 */

export function OutfitBuilderShell() {
  const router    = useRouter();
  const { toast } = useToast();
  const stackRef  = useRef<HTMLDivElement>(null);

  const {
    selectedSize, isSizeLocked, lockSize,
    mode, setMode,
    activeSlot, setActiveSlot,
    outfitId, setOutfitId,
    slots, setSlotProduct,
    isSaving, setIsSaving,
    resetBuilder,
  } = useOutfitBuilderStore();

  const [previewProductId, setPreviewProductId] = useState<Id<"products"> | null>(null);

  const saveOutfit   = useMutation(api.outfits.saveOutfit);
  const genUploadSig = useAction(api.cloudinary.generateUploadSignature);

  // Fetch products — only runs after size is locked
  const browseProducts = useQuery(
    api.outfits.getProductsForBuilder,
    isSizeLocked && selectedSize ? { size: selectedSize } : "skip"
  );

  const wardrobeProducts = useQuery(
    api.outfits.getWardrobeForBuilder,
    isSizeLocked && selectedSize && mode === "wardrobe" ? { size: selectedSize } : "skip"
  );

  const activeProducts = mode === "wardrobe" ? wardrobeProducts : browseProducts;

  // ── Save outfit with preview image ────────────────────────────────────────
  async function handleSave() {
    if (!stackRef.current || !selectedSize) return;
    setIsSaving(true);

    try {
      // Dynamically import html2canvas — only loaded when saving
      const html2canvas = (await import("html2canvas")).default;

      const canvas = await html2canvas(stackRef.current, {
        backgroundColor: "#FFFFFF",
        scale: 2,
        useCORS: true,
        allowTaint: false,
      });

      // Convert canvas to blob
      const blob: Blob = await new Promise((res) =>
        canvas.toBlob((b) => res(b!), "image/jpeg", 0.85)
      );

      // Upload to Cloudinary
      const sig = await genUploadSig({ folder: "blax-sheep/outfits" });
      const fd  = new FormData();
      fd.append("file",           blob,             "outfit.jpg");
      fd.append("api_key",        sig.apiKey ?? "");
      fd.append("timestamp",      String(sig.timestamp));
      fd.append("signature",      sig.signature);
      fd.append("folder",         sig.folder);
      fd.append("transformation", sig.transformation);

      const res  = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: "POST", body: fd }
      );
      const data = await res.json();

      // Build slot array for Convex
      const slotData = OUTFIT_SLOT_ORDER.map((cat, i) => ({
        category:   cat,
        productId:  slots[cat].productId ?? undefined,
        layerOrder: i,
      }));

      const id = await saveOutfit({
        outfitId:        outfitId ?? undefined,
        selectedSize,
        slots:           slotData,
        previewPublicId: data.public_id as string,
        previewUrl:      data.secure_url as string,
        isPublic:        false,
      });

      setOutfitId(id as Id<"outfit_builds">);
      toast.success("Outfit saved!");

      // Offer download
      const a = document.createElement("a");
      a.href     = data.secure_url;
      a.download = "my-outfit.jpg";
      a.target   = "_blank";
      a.click();
    } catch (err) {
      toast.error("Could not save outfit.");
    } finally {
      setIsSaving(false);
    }
  }

  // Size not locked yet — show modal
  if (!isSizeLocked) {
    return (
      <SizeSelector
        onSelect={(size) => lockSize(size)}
      />
    );
  }

  const filledSlots = OUTFIT_SLOT_ORDER.filter((cat) => slots[cat].productId).length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Header ── */}
      <div className="header-bar shrink-0">
        <button
          onClick={() => { resetBuilder(); router.back(); }}
          className="flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          Back
        </button>

        <span className="font-mono font-black text-xs uppercase tracking-widest absolute left-1/2 -translate-x-1/2">
          Size {selectedSize}
        </span>

        {/* Browse / Wardrobe toggle */}
        <div className="flex border border-black">
          {(["browse", "wardrobe"] as const).map((m, i) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-2 py-1 font-mono text-2xs font-bold uppercase tracking-wider transition-colors",
                i === 1 && "border-l border-black",
                mode === m ? "bg-black text-yellow" : "bg-white text-black"
              )}
            >
              {m === "browse" ? "All" : "Mine"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Outfit Stack ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
        <OutfitStack
          ref={stackRef}
          slots={slots}
          slotOrder={OUTFIT_SLOT_ORDER}
          products={activeProducts ?? {}}
          activeSlot={activeSlot}
          onSlotClick={(cat) => setActiveSlot(activeSlot === cat ? null : cat)}
          onProductSelect={(cat, product) => {
            setSlotProduct(cat, product._id as Id<"products">);
            setPreviewProductId(product._id as Id<"products">);
          }}
        />
      </div>

      {/* ── Bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black px-4 py-4">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => { resetBuilder(); }}
          >
            Reset
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={handleSave}
            disabled={isSaving || filledSlots === 0}
          >
            {isSaving
              ? "Saving..."
              : filledSlots === 0
              ? "Add items first"
              : `Save outfit (${filledSlots})`}
          </Button>
        </div>
      </div>

      {/* ── Product detail sheet ── */}
      {previewProductId && (
        <ProductDetailSheet
          productId={previewProductId}
          isOpen={!!previewProductId}
          onClose={() => setPreviewProductId(null)}
        />
      )}
    </div>
  );
}
