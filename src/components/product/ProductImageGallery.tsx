"use client";

import { useState } from "react";
import { OptimisedImage } from "@/components/common/OptimisedImage";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

interface ImageData {
  _id: string;
  cloudinaryPublicId: string;
  angle: "front" | "back" | "detail" | "flat" | "lifestyle";
  isPrimary: boolean;
  sortOrder: number;
  blurDataUrl?: string;
  width: number;
  height: number;
}

interface ProductImageGalleryProps {
  images: ImageData[];
  productTitle: string;
  productId: Id<"products">;
  productSlug: string;
}

export function ProductImageGallery({
  images,
  productTitle,
  productId,
  productSlug,
}: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeFace, setActiveFace] = useState<"front" | "back">("front");

  const frontImages = images.filter((img) => img.angle === "front");
  const backImages = images.filter((img) => img.angle === "back");
  const hasBoth = frontImages.length > 0 && backImages.length > 0;

  function handleFaceToggle(face: "front" | "back") {
    setActiveFace(face);
    const faceImages = face === "front" ? frontImages : backImages;
    if (faceImages.length > 0) {
      const idx = images.findIndex((img) => img._id === faceImages[0]._id);
      setActiveIndex(idx >= 0 ? idx : 0);
    }
  }

  const activeImage = images[activeIndex] ?? images[0];
  if (!activeImage) return (
    <div className="w-full aspect-[3/4] bg-white-off flex items-center justify-center">
      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">No images</span>
    </div>
  );

  return (
    <div className="relative">

      {/* Front / Back toggle */}
      {hasBoth && (
        <div className="flex justify-center gap-0 pt-6 px-2 md:px-4">
          {(["front", "back"] as const).map((face, i) => (
            <button
              key={face}
              onClick={() => handleFaceToggle(face)}
              className={cn(
                "flex-1 max-w-[140px] py-2 font-mono text-sm font-bold uppercase tracking-wider",
                "border-black border transition-all",
                i === 1 && "border-l-0",
                activeFace === face
                  ? "bg-yellow text-black shadow-card"
                  : "bg-white text-black"
              )}
            >
              {face}
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div
        className="relative mx-auto mt-4 w-full max-w-sm md:max-w-lg lg:max-w-xl xl:max-w-2xl px-2 md:px-4" style={{ aspectRatio: "3/4" }}>
        <OptimisedImage
          publicId={activeImage.cloudinaryPublicId}
          alt={`${productTitle} — ${activeImage.angle}`}
          preset="full"
          fill
          objectFit="contain"
          blurDataUrl={activeImage.blurDataUrl}
          priority
          sizes="(max-width: 640px) 100vw, 50vw"
        />
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div
          className="flex gap-2 px-2 md:px-4 mt-5 overflow-x-auto scrollbar-hide pb-2 justify-center">          
          {images.map((img, i) => (
            <button
              key={img._id}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "shrink-0 w-16 h-16 border overflow-hidden transition-all",
                activeIndex === i ? "border-2 border-black shadow-card" : "border border-black/30"
              )}
            >
              <OptimisedImage
                publicId={img.cloudinaryPublicId}
                alt={`${productTitle} view ${i + 1}`}
                preset="thumb"
                width={64}
                height={64}
                objectFit="cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
