"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { OptimisedImage } from "@/components/common/OptimisedImage";
import { Button } from "@/components/ui/button";
import { useWardrobeStatus } from "@/hooks/useWardrobeStatus";
import { formatPrice, CONDITION_LABELS } from "@/lib/utils";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * ProductDetailSheet — bottom sheet showing product details
 * when a user taps an item in the outfit stack.
 *
 * Inspired by Pinterest's outfit builder detail view.
 * Shows: image, title, price, size, condition + Add to Wardrobe.
 */

const CONDITION_STARS: Record<string, number> = {
  mint: 5, good: 4, fair: 3, worn: 2,
};

interface ProductDetailSheetProps {
  productId: Id<"products">;
  isOpen:    boolean;
  onClose:   () => void;
}

export function ProductDetailSheet({
  productId,
  isOpen,
  onClose,
}: ProductDetailSheetProps) {
  const product = useQuery(
    api.products.getProductById,
    isOpen ? { productId } : "skip"
  );

  const { inWardrobe, isAdding, handleAdd } = useWardrobeStatus(productId);

  if (!product) return null;

  const stars = CONDITION_STARS[product.condition] ?? 3;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{product.title}</SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-8 pt-4 flex gap-4">
          {/* ── Product image ── */}
          <div className="w-28 h-36 relative shrink-0 border border-black bg-white-off">
            {product.primaryImage && (
              <OptimisedImage
                publicId={product.primaryImage.cloudinaryPublicId}
                alt={product.title}
                preset="card"
                fill
                objectFit="cover"
                blurDataUrl={product.primaryImage.blurDataUrl}
              />
            )}
          </div>

          {/* ── Info ── */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              {product.brand && (
                <p className="font-mono text-2xs text-muted-foreground uppercase mb-1">
                  {product.brand}
                </p>
              )}

              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-mono font-black text-lg text-sold">
                  {formatPrice(product.sellingPrice)}
                </span>
                {product.originalPrice > product.sellingPrice && (
                  <span className="font-mono text-xs line-through text-muted-foreground">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>

              <p className="font-mono text-xs uppercase tracking-wider mb-2">
                <span className="text-muted-foreground">Size </span>
                <span className="font-bold">{product.size}</span>
              </p>

              {/* Condition stars */}
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    strokeWidth={1.5}
                    className={cn(
                      i < stars ? "text-yellow fill-yellow" : "text-black/20 fill-black/10"
                    )}
                  />
                ))}
                <span className="font-mono text-2xs uppercase tracking-wider ml-1 text-muted-foreground">
                  {CONDITION_LABELS[product.condition]}
                </span>
              </div>
            </div>

            <Button
              variant={product.status === "sold" ? "dark" : "primary"}
              size="sm"
              className="w-full"
              disabled={product.status === "sold" || isAdding}
              onClick={() => handleAdd()}
            >
              {product.status === "sold"
                ? "SOLD"
                : isAdding
                ? "Adding..."
                : inWardrobe
                ? "In Wardrobe ✓"
                : "Add to Wardrobe"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
