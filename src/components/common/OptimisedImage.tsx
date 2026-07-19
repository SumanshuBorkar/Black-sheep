"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { cld } from "@/lib/cloudinary";

/**
 * OptimisedImage — Standard image component used EVERYWHERE in BLAX SHEEP
 *
 * Plain English summary:
 * This takes a Cloudinary publicId (NOT a raw URL) and a "preset" name,
 * builds the right transformation URL (see src/lib/cloudinary.ts), and
 * renders it through Next.js's <Image> for additional lazy-loading and
 * layout-shift prevention.
 *
 * Why both Cloudinary AND Next.js <Image>:
 * - Cloudinary does the actual resizing/format conversion/compression
 *   and serves from its global CDN
 * - Next.js <Image> still gives us lazy loading, blur-up placeholders,
 *   and automatic responsive `sizes` handling on top of that
 *
 * We set next.config.ts to trust res.cloudinary.com as a remote image
 * source, but disable Next's own re-optimization (Cloudinary already
 * did it) to avoid double-processing the same image.
 */

type CloudinaryPreset = "thumb" | "card" | "full" | "hero" | "cutout" | "og";

interface OptimisedImageProps {
  publicId: string;        // Cloudinary public ID — NOT a raw URL
  alt: string;
  preset?: CloudinaryPreset;
  width?: number;
  height?: number;
  fill?: boolean;
  blurDataUrl?: string;
  priority?: boolean;      // Use for above-the-fold images only
  sizes?: string;
  className?: string;
  objectFit?: "cover" | "contain";
}

export function OptimisedImage({
  publicId,
  alt,
  preset = "card",
  width,
  height,
  fill = false,
  blurDataUrl,
  priority = false,
  sizes,
  className,
  objectFit = "cover",
}: OptimisedImageProps) {
  const [hasError, setHasError] = useState(false);

  const src = cld(publicId, preset);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-white-off",
          fill ? "absolute inset-0" : "",
          className
        )}
        style={!fill ? { width, height } : undefined}
      >
        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
          Image unavailable
        </span>
      </div>
    );
  }

  const commonProps = {
    src,
    alt,
    priority,
    unoptimized: true,  // Cloudinary already optimised it — skip Next's re-processing
    sizes: sizes ?? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
    className: cn(
      objectFit === "cover" ? "object-cover" : "object-contain",
      "transition-opacity duration-300",
      className
    ),
    onError: () => setHasError(true),
    ...(blurDataUrl
      ? { placeholder: "blur" as const, blurDataURL: blurDataUrl }
      : {}),
  };

  if (fill) {
    return <Image {...commonProps} fill />;
  }

  return (
    <Image
      {...commonProps}
      width={width ?? 800}
      height={height ?? 1000}
    />
  );
}
