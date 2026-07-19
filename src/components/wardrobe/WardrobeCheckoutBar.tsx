"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

/**
 * WardrobeCheckoutBar — sticky bottom bar
 *
 * Plain English:
 * Always visible at the bottom of the wardrobe page.
 * Shows the running total of available items + checkout button.
 *
 * If hasSoldItems is true, the button is disabled and shows a
 * message — user must remove sold items before proceeding.
 *
 * Shipping is free / calculated at checkout — we don't show it
 * here since India Post rates vary by weight and destination.
 */

interface WardrobeCheckoutBarProps {
  subtotal: number;
  itemCount: number;
  hasSoldItems: boolean;
}

export function WardrobeCheckoutBar({
  subtotal,
  itemCount,
  hasSoldItems,
}: WardrobeCheckoutBarProps) {
  const router = useRouter();

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-sticky bg-white border-t-2 border-black px-4 py-4">
      <div className="max-w-lg mx-auto">
        {/* Subtotal row */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
            <p className="font-mono text-2xs text-muted-foreground">
              + Shipping calculated at checkout
            </p>
          </div>
          <p className="font-mono font-black text-xl">
            {formatPrice(subtotal)}
          </p>
        </div>

        {/* Sold warning */}
        {hasSoldItems && (
          <p className="font-mono text-2xs uppercase tracking-wider text-sold text-center mb-2">
            Remove sold items to continue
          </p>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={hasSoldItems || itemCount === 0}
          onClick={() => router.push("/checkout")}
        >
          {hasSoldItems ? "Remove sold items first" : "Proceed to checkout →"}
        </Button>
      </div>
    </div>
  );
}
