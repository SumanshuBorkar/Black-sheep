"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WardrobeItem } from "./WardrobeItem";
import { WardrobeCheckoutBar } from "./WardrobeCheckoutBar";
import { WardrobeEmpty } from "./WardrobeEmpty";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * WardrobeClient — the reactive core of the wardrobe page
 *
 * Plain English:
 * useQuery(api.wardrobe.getWardrobe) is live — Convex pushes updates
 * any time anything in the wardrobe changes. This means:
 * - Add an item on the product page → appears here instantly
 * - An item sells while you're looking → it shows a SOLD flag
 *   immediately without any refresh
 *
 * We separate available and sold items so the user clearly sees
 * what they can still checkout with.
 */
export function WardrobeClient() {
  const items = useQuery(api.wardrobe.getWardrobe);

  // Loading skeleton
  if (items === undefined) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-black p-3 flex gap-3 animate-pulse">
            <div className="w-24 h-32 bg-white-off shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 bg-white-off w-3/4" />
              <div className="h-3 bg-white-off w-1/2" />
              <div className="h-4 bg-white-off w-1/3 mt-4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) return <WardrobeEmpty />;

  const availableItems = items.filter((i) => i.product?.status === "available");
  const soldItems      = items.filter((i) => i.product?.status === "sold");

  const subtotal = availableItems.reduce((sum, item) => {
    const productPrice  = item.product?.sellingPrice ?? 0;
    const accessoryCost = item.design?.totalAccessoryCost ?? 0;
    return sum + productPrice + accessoryCost;
  }, 0);

  return (
    <>
      {/* ── Available items ── */}
      <div className="space-y-4 mb-6">
        {availableItems.map((item) => (
          <WardrobeItem key={item._id} item={item} />
        ))}
      </div>

      {/* ── Sold items (flagged, can be removed) ── */}
      {soldItems.length > 0 && (
        <div className="mb-6">
          <p className="font-mono text-xs uppercase tracking-widest text-sold font-bold mb-3">
            Sold — remove to proceed
          </p>
          <div className="space-y-4 opacity-60">
            {soldItems.map((item) => (
              <WardrobeItem key={item._id} item={item} isSold />
            ))}
          </div>
        </div>
      )}

      {/* ── Outfit builder CTA ── */}
      <div className="border border-black p-4 mb-24 flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-wider">
            Build an outfit
          </p>
          <p className="font-mono text-2xs text-muted-foreground mt-0.5">
            Mix & match items in your wardrobe
          </p>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href="/outfit-builder">Try it →</Link>
        </Button>
      </div>

      {/* ── Sticky checkout bar ── */}
      <WardrobeCheckoutBar
        subtotal={subtotal}
        itemCount={availableItems.length}
        hasSoldItems={soldItems.length > 0}
      />
    </>
  );
}
