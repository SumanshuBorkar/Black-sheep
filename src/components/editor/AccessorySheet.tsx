"use client";

import { useRef } from "react";
import { useQuery } from "convex/react";
import { X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useEditorStore } from "../../store/editorStore";
import { OptimisedImage } from "@/components/common/OptimisedImage";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ACCESSORY_TYPE_LABELS } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * AccessorySheet — slides up from bottom, shows accessories by category
 *
 * Plain English:
 * Matches the Figma editor extended view exactly:
 * - Category tabs at top (EMBROIDERY | DTF STICKERS | METAL…)
 * - 2-column grid of accessory items below
 * - Tapping an item places it onto the canvas immediately
 *
 * The onAddToCanvas callback is passed from EditorShell, which
 * calls EditorCanvas.addAccessoryToCanvas() via the forwarded ref.
 */

const TABS = [
  { key: "embroidery_patch",   label: "EMBROIDERY" },
  { key: "dtf_sticker",        label: "DTF" },
  { key: "metal_piece",        label: "METAL" },
  { key: "enamel_pin",         label: "PINS" },
  { key: "pvc_patch",          label: "PVC" },
  { key: "bleach_art",         label: "BLEACH" },
];

interface AccessorySheetProps {
  isOpen:   boolean;
  onClose:  () => void;
  onAddToCanvas?: (cutoutUrl: string, accessoryId: string) => void;
}

export function AccessorySheet({ isOpen, onClose, onAddToCanvas }: AccessorySheetProps) {
  const { activeAccessoryType, openBottomSheet } = useEditorStore();
  const activeTab = activeAccessoryType ?? "embroidery_patch";

  const accessories = useQuery(
    api.accessories.listAccessories,
    isOpen ? { type: activeTab } : "skip"
  );

  function handleAccessoryTap(accessory: {
    _id: string;
    cutoutUrl: string;
    title: string;
    price: number;
  }) {
    onAddToCanvas?.(accessory.cutoutUrl, accessory._id);
    onClose();
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="flex flex-col" style={{ maxHeight: "72vh" }}>
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Add Accessory</SheetTitle>
            <button onClick={onClose} className="p-1">
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          {/* ── Category tabs ── */}
          <div className="flex overflow-x-auto scrollbar-hide gap-0 mt-3 border border-black">
            {TABS.map((tab, i) => (
              <button
                key={tab.key}
                onClick={() => openBottomSheet(tab.key)}
                className={cn(
                  "flex-1 min-w-fit px-3 py-2 font-mono text-2xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors",
                  i > 0 && "border-l border-black",
                  activeTab === tab.key
                    ? "bg-yellow text-black"
                    : "bg-white text-black hover:bg-white-off"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* ── Accessory grid ── */}
        <div className="overflow-y-auto flex-1 px-4 pt-4 pb-6">
          {accessories === undefined ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-white-off animate-pulse border border-black/10" />
              ))}
            </div>
          ) : accessories.length === 0 ? (
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground text-center py-8">
              No accessories in this category yet
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {accessories.map((acc) => (
                <button
                  key={acc._id}
                  onClick={() => handleAccessoryTap({
                    _id:      acc._id,
                    cutoutUrl: acc.cutoutUrl,
                    title:    acc.title,
                    price:    acc.price,
                  })}
                  className="product-card flex flex-col items-center p-3 text-left"
                >
                  <div className="w-full aspect-square relative mb-2 bg-white-off">
                    <OptimisedImage
                      publicId={acc.imagePublicId}
                      alt={acc.title}
                      preset="thumb"
                      fill
                      objectFit="contain"
                    />
                  </div>
                  <p className="font-mono text-2xs uppercase tracking-wide w-full truncate">
                    {acc.title}
                  </p>
                  <p className="font-mono text-xs font-bold w-full mt-0.5">
                    {formatPrice(acc.price)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
