"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { OptimisedImage } from "@/components/common/OptimisedImage";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { ACCESSORY_TYPE_LABELS } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function AdminAccessoriesPage() {
  const accessories = useQuery(api.accessories.listAccessories, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-mono font-black text-2xl uppercase tracking-widest">
          Accessories
        </h1>
        <Button variant="primary" size="sm" asChild>
          <Link href="/admin/accessories/new">+ Add Accessory</Link>
        </Button>
      </div>

      {!accessories || accessories.length === 0 ? (
        <p className="font-mono text-sm text-muted-foreground uppercase">
          No accessories yet. Add patches, pins & stickers.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {accessories.map((acc) => (
            <div key={acc._id} className="product-card p-3">
              <div className="aspect-square relative bg-white-off mb-2 border border-black">
                <OptimisedImage
                  publicId={acc.imagePublicId}
                  alt={acc.title}
                  preset="card"
                  fill
                  objectFit="contain"
                />
              </div>
              <p className="font-mono text-xs font-bold uppercase truncate">{acc.title}</p>
              <p className="font-mono text-2xs text-muted-foreground uppercase mt-0.5">
                {ACCESSORY_TYPE_LABELS[acc.type]}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="font-mono text-sm font-black">{formatPrice(acc.price)}</p>
                <span className={cn(
                  "font-mono text-2xs font-bold uppercase px-1.5 py-0.5 border",
                  acc.stock > 0
                    ? "bg-yellow text-black border-black"
                    : "bg-sold text-white border-sold"
                )}>
                  Stock: {acc.stock}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}