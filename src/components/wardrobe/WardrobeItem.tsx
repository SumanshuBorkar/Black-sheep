"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { Trash2, Pencil } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { OptimisedImage } from "@/components/common/OptimisedImage";
import { useToast } from "@/components/ui/toast";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * WardrobeItem — single item card in the wardrobe list
 *
 * Plain English:
 * Shows either:
 * A) A plain product photo + title/price (no customisation)
 * B) The custom design preview image + product info + accessory
 *    breakdown showing each patch/pin and its cost
 *
 * The EDIT button (pencil icon) routes back to the editor with the
 * existing design pre-loaded so the user can modify their accessories.
 *
 * The trash icon removes the item from the wardrobe (not from the
 * store — the product itself is still available).
 */

interface WardrobeItemData {
  _id: Id<"wardrobe">;
  productId: Id<"products">;
  designId?: Id<"custom_designs">;
  product: {
    _id: Id<"products">;
    title: string;
    slug: string;
    size: string;
    sellingPrice: number;
    status: "available" | "sold";
    primaryImage?: {
      cloudinaryPublicId: string;
      blurDataUrl?: string;
    } | null;
  } | null;
  design?: {
    _id: Id<"custom_designs">;
    previewFrontUrl?: string;
    previewFrontPublicId?: string;
    totalAccessoryCost: number;
    placements: Array<{
      accessoryId: Id<"accessories">;
      face: "front" | "back";
    }>;
  } | null;
}

interface WardrobeItemProps {
  item: WardrobeItemData;
  isSold?: boolean;
}

export function WardrobeItem({ item, isSold = false }: WardrobeItemProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const removeFromWardrobe = useMutation(api.wardrobe.removeFromWardrobe);
  const { toast } = useToast();

  const { product, design } = item;
  if (!product) return null;

  const hasDesign        = !!design;
  const accessoryCost    = design?.totalAccessoryCost ?? 0;
  const lineTotal        = product.sellingPrice + accessoryCost;
  const previewPublicId  = design?.previewFrontPublicId;

  async function handleRemove() {
    setIsRemoving(true);
    try {
      await removeFromWardrobe({ wardrobeItemId: item._id });
      toast.success("Removed from wardrobe");
    } catch {
      toast.error("Could not remove item");
      setIsRemoving(false);
    }
  }

  return (
    <div
      className={cn(
        "border border-black p-3 flex gap-3",
        isSold && "border-sold"
      )}
    >
      {/* ── Product / design image ── */}
      <Link
        href={`/product/${product.slug}`}
        className="shrink-0 w-24 h-32 border border-black overflow-hidden bg-white-off relative"
      >
        {previewPublicId ? (
          <OptimisedImage
            publicId={previewPublicId}
            alt={`Custom ${product.title}`}
            preset="card"
            fill
            objectFit="contain"
          />
        ) : product.primaryImage ? (
          <OptimisedImage
            publicId={product.primaryImage.cloudinaryPublicId}
            alt={product.title}
            preset="card"
            fill
            objectFit="cover"
            blurDataUrl={product.primaryImage.blurDataUrl}
          />
        ) : (
          <div className="absolute inset-0 bg-white-off" />
        )}

        {isSold && (
          <div className="absolute inset-0 bg-sold/80 flex items-center justify-center">
            <span className="font-mono text-white text-2xs font-bold uppercase tracking-wider">
              SOLD
            </span>
          </div>
        )}
      </Link>

      {/* ── Info ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold uppercase tracking-wide truncate">
              {product.title}
            </p>
            <p className="font-mono text-2xs text-muted-foreground mt-0.5 uppercase">
              Size {product.size}
            </p>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-2 shrink-0">
            {hasDesign && !isSold && (
              <Link
                href={`/editor/${product._id}?design=${design!._id}`}
                className="flex items-center justify-center w-7 h-7 border border-black hover:bg-yellow transition-colors"
                aria-label="Edit design"
              >
                <Pencil size={12} strokeWidth={2} />
              </Link>
            )}
            <button
              onClick={handleRemove}
              disabled={isRemoving}
              className="flex items-center justify-center w-7 h-7 border border-black hover:bg-sold hover:text-white hover:border-sold transition-colors disabled:opacity-40"
              aria-label="Remove from wardrobe"
            >
              <Trash2 size={12} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Price breakdown ── */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-mono text-2xs text-muted-foreground uppercase">
              Item
            </span>
            <span className="font-mono text-xs font-bold">
              {formatPrice(product.sellingPrice)}
            </span>
          </div>

          {accessoryCost > 0 && (
            <div className="flex justify-between items-center">
              <span className="font-mono text-2xs text-muted-foreground uppercase">
                Customisation ({design!.placements.length} pieces)
              </span>
              <span className="font-mono text-xs font-bold">
                {formatPrice(accessoryCost)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center pt-1 border-t border-black/10">
            <span className="font-mono text-2xs font-bold uppercase tracking-wider">
              Total
            </span>
            <span className="font-mono text-sm font-black text-sold">
              {formatPrice(lineTotal)}
            </span>
          </div>
        </div>

        {/* ── Custom design badge ── */}
        {hasDesign && (
          <div className="mt-2">
            <span className="inline-block font-mono text-2xs uppercase tracking-wider bg-yellow text-black px-1.5 py-0.5 border border-black">
              Customised
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
