"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { OptimisedImage } from "@/components/common/OptimisedImage";
import { formatPrice } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

interface SimilarItemsProps {
  productId: Id<"products">;
}

export function SimilarItems({ productId }: SimilarItemsProps) {
  const similar = useQuery(api.products.getSimilarProducts, { productId, limit: 6 });

  if (!similar || similar.length === 0) return null;

  return (
    <section className="mt-2 pt-6 border-t border-black">
      <div className="px-4 mb-4">
        <h2 className="font-mono font-black text-base uppercase tracking-widest">
          Similar Items
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-4">
        {similar.map((product) => (
          <Link key={product._id} href={`/product/${product.slug}`} className="product-card shrink-0 w-40">
            <div className="product-image-wrapper">
              {product.primaryImage ? (
                <OptimisedImage
                  publicId={product.primaryImage.cloudinaryPublicId}
                  alt={product.title}
                  preset="card"
                  fill
                  blurDataUrl={product.primaryImage.blurDataUrl}
                  sizes="160px"
                />
              ) : (
                <div className="absolute inset-0 bg-white-off" />
              )}
              {product.status === "sold" && (
                <span className="status-badge status-badge--sold">SOLD</span>
              )}
            </div>
            <div className="p-2">
              <p className="font-mono text-2xs uppercase tracking-wide truncate">{product.title}</p>
              <p className="font-mono text-xs font-bold mt-0.5">{formatPrice(product.sellingPrice)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
