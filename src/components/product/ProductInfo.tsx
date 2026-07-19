"use client";

import { Star, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWardrobeStatus } from "@/hooks/useWardrobeStatus";
import { formatPrice, CONDITION_LABELS, CONDITION_DESCRIPTIONS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * ProductInfo — price, metadata, Add to Wardrobe, disclaimers
 *
 * Uses useWardrobeStatus so button state is correct on hard refresh —
 * Convex tells us live whether this product is already in the wardrobe.
 */

interface ProductInfoProps {
  productId: Id<"products">;
  title: string;
  sellingPrice: number;
  originalPrice: number;
  discount: number;
  size: string;
  measurements?: {
    waist?: number;
    chest?: number;
    length?: number;
    unit: "cm" | "inches";
  };
  material?: string;
  condition: "mint" | "good" | "fair" | "worn";
  brand?: string;
  status: "available" | "sold";
}

const CONDITION_STARS: Record<string, number> = {
  mint: 5, good: 4, fair: 3, worn: 2,
};

const BEFORE_ORDER = [
  "Authentic pre-owned vintage garment.",
  "Professionally washed and disinfected before shipping.",
  "You will receive the exact item shown in the photographs.",
  "Minor signs of wear may exist due to the item's age.",
  "Please review measurements carefully before ordering.",
];

const RETURN_POLICY =
  "Vintage items are final sale. Returns and exchanges are not accepted.";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
      {children}
    </h2>
  );
}

export function ProductInfo({
  productId,
  title,
  sellingPrice,
  originalPrice,
  discount,
  size,
  measurements,
  material,
  condition,
  brand,
  status,
}: ProductInfoProps) {
  const { inWardrobe, isAdding, handleAdd } = useWardrobeStatus(productId);
  const isSold = status === "sold";
  const stars = CONDITION_STARS[condition] ?? 3;

  return (
    <div
      className="mx-auto w-full max-w-sm md:max-w-xl lg:max-w-none pt-8 lg:pt-10">

      {/* ── Brand + Title ── */}
      <h1 className="font-mono font-black uppercase tracking-wide leading-tight text-xl sm:text-3xl lg:text-4xl xl:text-3xl mb-5">
        {brand && (
          <span className="  mb-2 block font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {brand}
          </span>
        )}
        {title}
      </h1>

      {/* ── Price ── */}
      <div className="mb-8">

        <div className="flex items-end gap-3 flex-wrap">

          <span className="font-mono font-black text-3xl lg:text-4xl text-sold">
            {formatPrice(sellingPrice)}
          </span>

          {discount > 0 && (
            <>
              <span className="font-mono text-base line-through text-muted-foreground">
                {formatPrice(originalPrice)}
              </span>

              <span className="border border-black bg-yellow px-2 py-1 font-mono text-xs font-bold">
                {discount}% OFF
              </span>
            </>
          )}

        </div>

      </div>

      {/* ── Metadata row ── */}
      <div className="border-y border-black/10 py-6">
        <SectionHeading>Product Details</SectionHeading>

        <div className="grid grid-cols-2 gap-y-4 font-mono text-xs uppercase tracking-wider">

          <span className="text-muted-foreground">
            Size
          </span>

          <span className="font-bold text-right">
            {size}
          </span>

          {material && (
            <>
              <span className="text-muted-foreground">
                Material
              </span>

              <span className="font-bold text-right">
                {material}
              </span>
            </>
          )}

          {measurements?.waist && (
            <>
              <span className="text-muted-foreground">
                Waist
              </span>

              <span className="font-bold text-right">
                {measurements.waist}
                {measurements.unit === "inches" ? '"' : " cm"}
              </span>
            </>
          )}

          {measurements?.chest && (
            <>
              <span className="text-muted-foreground">
                Chest
              </span>

              <span className="font-bold text-right">
                {measurements.chest}
                {measurements.unit === "inches" ? '"' : " cm"}
              </span>
            </>
          )}

          {measurements?.length && (
            <>
              <span className="text-muted-foreground">
                Length
              </span>

              <span className="font-bold text-right">
                {measurements.length}
                {measurements.unit === "inches" ? '"' : " cm"}
              </span>
            </>
          )}

        </div>
      </div>

      {/* ── Condition stars ── */}
      <div className="py-6 border-b border-black/10">

        <SectionHeading>
          Condition
        </SectionHeading>

        <div className="flex items-center gap-4">

          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={16}
                strokeWidth={1.5}
                className={cn(
                  i < stars
                    ? "fill-yellow text-yellow"
                    : "fill-black/10 text-black/20"
                )}
              />
            ))}
          </div>

          <div>

            <p className="font-mono font-bold uppercase tracking-wider">
              {CONDITION_LABELS[condition]}
            </p>

            <p className="font-mono text-xs text-muted-foreground mt-1">
              {CONDITION_DESCRIPTIONS[condition]}
            </p>

          </div>

        </div>

      </div>

      {/* ── Add to Wardrobe ── */}
      <Button
        variant={isSold ? "dark" : "primary"}
        size="lg"
        className="w-full mb-8"
        onClick={() => handleAdd()}
        disabled={isSold || isAdding}
      >
        {isSold
          ? "SOLD OUT"
          : isAdding
            ? "ADDING..."
            : inWardrobe
              ? "VIEW WARDROBE →"
              : "ADD TO CART"}
      </Button>

      {/* ── Disclaimers ── */}
      <div className="border-t border-black/10 pt-8 pb-8">

        <SectionHeading>
          Before You Order
        </SectionHeading>

        <div className="space-y-4">

          {BEFORE_ORDER.map((item) => (

            <div
              key={item}
              className="flex items-start gap-3"
            >

              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-black bg-yellow">

                <Check
                  size={12}
                  strokeWidth={3}
                />

              </div>

              <p className="font-mono text-xs leading-relaxed uppercase tracking-wide">

                {item}

              </p>

            </div>

          ))}

        </div>

        <div className="mt-8 border border-black">

          <div className="border-b border-black bg-white-off px-4 py-2">

            <h3 className="font-mono text-xs font-bold uppercase tracking-[0.25em]">

              Returns

            </h3>

          </div>

          <div className="flex gap-3 px-4 py-4">

            <RotateCcw
              size={18}
              className="mt-0.5 shrink-0 text-muted-foreground"
            />

            <p className="font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">

              {RETURN_POLICY}

            </p>

          </div>

        </div>

      </div>
    </div>
  );
}
