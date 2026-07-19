"use client";

import { forwardRef } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { OptimisedImage } from "@/components/common/OptimisedImage";
import { useOutfitBuilderStore } from "@/stores/outfitBuilderStore";
import { cn } from "@/lib/utils";
import type { OutfitSlotCategory } from "@/stores/outfitBuilderStore";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * OutfitStack — the main visual of the outfit builder
 *
 * Plain English:
 * Renders each clothing category as a stacked layer, overlapping
 * slightly like a real outfit laid flat (inspired by the Fits app
 * and your Figma outfit_builder.pdf screen).
 *
 * Each slot has:
 * - A product image if something is selected
 * - A placeholder silhouette with "TAP TO ADD" if empty
 * - Left/Right arrows to cycle through available products (carousel)
 * - A tap on the image opens the product detail sheet
 *
 * The ref is forwarded so html2canvas can capture this element
 * directly for the shareable preview image.
 */

const SLOT_LABELS: Record<OutfitSlotCategory, string> = {
  headwear:  "Hat / Cap",
  outerwear: "Jacket / Coat",
  top:       "Top / Shirt",
  bottom:    "Pants / Shorts",
  footwear:  "Shoes",
  accessory: "Accessory",
};

// Visual sizing per slot — outerwear is widest, shoes are narrowest
const SLOT_WIDTHS: Record<OutfitSlotCategory, string> = {
  headwear:  "w-1/3",
  outerwear: "w-full",
  top:       "w-5/6",
  bottom:    "w-3/4",
  footwear:  "w-1/2",
  accessory: "w-1/3",
};

interface ProductData {
  _id: string;
  title: string;
  slug: string;
  sellingPrice: number;
  primaryImage?: {
    cloudinaryPublicId: string;
    blurDataUrl?: string;
  } | null;
}

interface OutfitStackProps {
  slots:           Record<OutfitSlotCategory, { productId: Id<"products"> | null; currentIndex: number }>;
  slotOrder:       OutfitSlotCategory[];
  products:        Record<string, ProductData[]>;
  activeSlot:      OutfitSlotCategory | null;
  onSlotClick:     (cat: OutfitSlotCategory) => void;
  onProductSelect: (cat: OutfitSlotCategory, product: ProductData) => void;
}

export const OutfitStack = forwardRef<HTMLDivElement, OutfitStackProps>(
  function OutfitStack({
    slots, slotOrder, products, activeSlot, onSlotClick, onProductSelect,
  }, ref) {
    const { setSlotIndex } = useOutfitBuilderStore();

    function getSlotProducts(cat: OutfitSlotCategory): ProductData[] {
      return products[cat] ?? [];
    }

    function navigate(cat: OutfitSlotCategory, dir: "prev" | "next") {
      const items = getSlotProducts(cat);
      if (items.length === 0) return;
      const current = slots[cat].currentIndex;
      const next =
        dir === "next"
          ? (current + 1) % items.length
          : (current - 1 + items.length) % items.length;
      setSlotIndex(cat, next);
      // Auto-select the product when navigating
      const product = items[next];
      if (product) onProductSelect(cat, product);
    }

    return (
      <div ref={ref} className="outfit-stack bg-white py-4">
        {slotOrder.map((cat, layerIdx) => {
          const slotProducts = getSlotProducts(cat);
          const currentIdx   = slots[cat].currentIndex;
          const product      = slotProducts[currentIdx] ?? null;
          const isActive     = activeSlot === cat;

          return (
            <div
              key={cat}
              className={cn(
                "outfit-stack-item flex flex-col items-center",
                layerIdx === 0 && "mt-0"
              )}
            >
              {/* Slot container */}
              <div className={cn("relative", SLOT_WIDTHS[cat])}>

                {/* Image or placeholder */}
                <button
                  onClick={() => {
                    onSlotClick(cat);
                    if (product) onProductSelect(cat, product);
                  }}
                  className={cn(
                    "w-full aspect-[3/4] relative border transition-all",
                    isActive
                      ? "border-2 border-yellow shadow-yellow"
                      : "border border-black/10",
                    !product && "bg-white-off"
                  )}
                >
                  {product?.primaryImage ? (
                    <OptimisedImage
                      publicId={product.primaryImage.cloudinaryPublicId}
                      alt={product.title}
                      preset="card"
                      fill
                      objectFit="contain"
                      blurDataUrl={product.primaryImage.blurDataUrl}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <Plus size={20} strokeWidth={1.5} className="text-black/30" />
                      <span className="font-mono text-2xs uppercase tracking-wider text-black/40">
                        {SLOT_LABELS[cat]}
                      </span>
                    </div>
                  )}
                </button>

                {/* Carousel arrows — only show when slot is active and has items */}
                {isActive && slotProducts.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(cat, "prev"); }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-yellow border border-black p-1 shadow-card"
                      aria-label="Previous"
                    >
                      <ChevronLeft size={14} strokeWidth={2} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(cat, "next"); }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full bg-yellow border border-black p-1 shadow-card"
                      aria-label="Next"
                    >
                      <ChevronRight size={14} strokeWidth={2} />
                    </button>
                  </>
                )}

                {/* Item count pill */}
                {slotProducts.length > 0 && (
                  <div className="absolute top-1 right-1 bg-yellow border border-black px-1.5 py-0.5">
                    <span className="font-mono text-2xs font-bold">
                      {currentIdx + 1}/{slotProducts.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);
