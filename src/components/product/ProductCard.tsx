"use client";

import Link from "next/link";
import { OptimisedImage } from "@/components/common/OptimisedImage";
import { formatPrice, getDiscountPercent } from "@/lib/utils";

/**
 * ProductCard — single item in a product grid
 *
 * Plain English summary:
 * Matches the Figma 2-column grid card: image with hard shadow border,
 * title below in caps. Shows a SOLD badge if the item is no longer
 * available — since this data comes from a real-time Convex query
 * upstream, the badge appears instantly the moment an item sells,
 * even if this card is already on someone's screen.
 */

interface ProductCardProps {
  slug: string;
  title: string;
  sellingPrice: number;
  originalPrice: number;
  status: "available" | "sold";
  primaryImage?: {
    cloudinaryPublicId: string;
    blurDataUrl?: string;
    width: number;
    height: number;
  };
}

export function ProductCard({
  slug,
  title,
  sellingPrice,
  originalPrice,
  status,
  primaryImage,
}: ProductCardProps) {
  const discount = getDiscountPercent(originalPrice, sellingPrice);
  const isSold = status === "sold";

  return (
    <Link href={`/product/${slug}`} className="product-card block">
      <div className="product-image-wrapper">
        {primaryImage ? (
          <OptimisedImage
            publicId={primaryImage.cloudinaryPublicId}
            alt={title}
            preset="card"
            width={100}
            height={100}
            fill
            blurDataUrl={primaryImage.blurDataUrl}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-white-off" />
        )}

        {isSold ? (
          <span className="status-badge status-badge--sold">SOLD</span>
        ) : discount > 0 ? (
          <span className="status-badge status-badge--available">
            -{discount}%
          </span>
        ) : null}

        {isSold && <div className="sold-overlay" />}
      </div>

      <div className="px-2 py-3">
        <p className="font-mono text-xs uppercase tracking-wide text-black truncate">
          {title}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="price-current text-base">{formatPrice(sellingPrice)}</span>
          {discount > 0 && (
            <span className="price-original text-xs">{formatPrice(originalPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
