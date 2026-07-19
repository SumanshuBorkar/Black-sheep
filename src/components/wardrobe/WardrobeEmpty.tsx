import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * WardrobeEmpty — shown when the wardrobe has no items
 *
 * Plain English:
 * Clean empty state matching the minimal BLAX SHEEP aesthetic.
 * Two CTAs: Shop (to browse products) and Outfit Builder
 * (though builder requires wardrobe items — we still show it
 * so users discover the feature).
 */
export function WardrobeEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 border-2 border-black mb-6 flex items-center justify-center">
        <span className="text-2xl">🛍️</span>
      </div>

      <h2 className="font-mono font-black text-xl uppercase tracking-widest mb-2">
        Empty
      </h2>
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-8 max-w-xs">
        Add items from the shop to start building your wardrobe
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button variant="primary" asChild>
          <Link href="/shop">Browse the shop</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/shop">See accessories</Link>
        </Button>
      </div>
    </div>
  );
}
