"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ProductCard } from "./ProductCard";

/**
 * ProductGrid — Responsive grid of products
 *
 * Plain English summary:
 * Uses Convex's useQuery, which is "reactive" — meaning this component
 * automatically re-renders the instant the underlying data changes,
 * with zero extra code from us. If you mark an item SOLD from the
 * admin panel, every customer currently viewing this exact grid sees
 * it update live, no refresh needed.
 *
 * Loading state shows skeleton placeholders matching the card shape,
 * so there's no layout jump when real data arrives.
 */

interface ProductGridProps {
  category?: string;
  size?: string;
  sortBy?: "price_asc" | "price_desc" | "newest";
  limit?: number;
}

export function ProductGrid({ category, size, sortBy, limit }: ProductGridProps) {
  const products = useQuery(api.products.listProducts, {
    category,
    size,
    sortBy,
    limit,
  });

  // Loading state — skeleton grid, matching the responsive card shape
  if (products === undefined) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="product-card animate-pulse">
            <div className="product-image-wrapper bg-white-off" />
            <div className="px-2 py-3 space-y-2">
              <div className="h-3 bg-white-off w-3/4" />
              <div className="h-4 bg-white-off w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          No items found
        </p>
        <p className="font-mono text-2xs uppercase tracking-wide text-muted-foreground mt-2">
          Check back soon — new drops weekly
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {products.map((product: any) => (
        <ProductCard
          key={product._id}
          slug={product.slug}
          title={product.title}
          sellingPrice={product.sellingPrice}
          originalPrice={product.originalPrice}
          status={product.status}
          primaryImage={
            product.primaryImage
              ? {
                  cloudinaryPublicId: product.primaryImage.cloudinaryPublicId,
                  blurDataUrl: product.primaryImage.blurDataUrl,
                  width: product.primaryImage.width,
                  height: product.primaryImage.height,
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}