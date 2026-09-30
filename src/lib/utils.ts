import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * BLAX SHEEP — Shared Utility Functions
 */

// ─── Tailwind class merging ───────────────────────────────────────────────────
// cn() is the standard shadcn/ui helper.
// It merges Tailwind classes intelligently — no duplicate/conflicting classes.
// Example: cn("px-4 px-6") → "px-6" (last one wins)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Price formatting ─────────────────────────────────────────────────────────
// Formats a number as Indian Rupees: 4000 → "₹4,000"
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style:    "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Discount calculation ─────────────────────────────────────────────────────
export function getDiscountPercent(original: number, selling: number): number {
  if (original <= 0 || selling >= original) return 0;
  return Math.round(((original - selling) / original) * 100);
}

// ─── Slug generation ──────────────────────────────────────────────────────────
// "Ed Hardy Vintage Jeans M" → "ed-hardy-vintage-jeans-m"
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// ─── Condition display ────────────────────────────────────────────────────────
export const CONDITION_LABELS: Record<string, string> = {
  mint:  "MINT",
  good:  "GOOD",
  fair:  "FAIR",
  worn:  "WORN",
};

export const CONDITION_DESCRIPTIONS: Record<string, string> = {
  mint:  "Looks new. No visible wear.",
  good:  "Minor wear only. No damage.",
  fair:  "Visible wear. Still wearable.",
  worn:  "Heavy wear. Priced accordingly.",
};

// ─── Category display labels ──────────────────────────────────────────────────
export const CATEGORY_LABELS: Record<string, string> = {
  jackets:     "JACKETS",
  pants:       "PANTS",
  shirts:      "SHIRTS",
  shoes:       "SHOES",
  glasses:     "GLASSES",
  accessories: "ACCESSORIES",
  other:       "OTHER",
};

// ─── Accessory type display labels ────────────────────────────────────────────
export const ACCESSORY_TYPE_LABELS: Record<string, string> = {
  embroidery_patch:   "EMBROIDERY",
  pvc_patch:          "PVC PATCHES",
  dtf_sticker:        "DTF STICKERS",
  metal_piece:        "METAL",
  enamel_pin:         "ENAMEL PINS",
  bleach_art:         "BLEACH ART",
  shoe_customisation: "SHOE CUSTOM",
};

// ─── Date formatting ──────────────────────────────────────────────────────────
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  }).format(new Date(timestamp));
}

// ─── Blur data URL generator ──────────────────────────────────────────────────
// Creates a tiny 1×1 pixel base64 PNG in the brand yellow colour.
// Used as a placeholder while product images load.
// The real blur hash is generated server-side at upload time.
export const YELLOW_BLUR_PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";

// ─── Razorpay script loader ───────────────────────────────────────────────────
// Dynamically loads the Razorpay checkout script only when needed.
// We do NOT include it in the page <head> because it's only needed
// at checkout — lazy loading saves ~50KB on every other page.
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    // Already loaded? Return immediately.
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─── Wardrobe total calculation ───────────────────────────────────────────────
export function calculateWardrobeTotal(
  items: Array<{ product?: { sellingPrice: number }; design?: { totalAccessoryCost: number } }>
): number {
  return items.reduce((sum, item) => {
    const productPrice  = item.product?.sellingPrice ?? 0;
    const accessoryCost = item.design?.totalAccessoryCost ?? 0;
    return sum + productPrice + accessoryCost;
  }, 0);
}

// ─── Editor: world-space calibration (mm ↔ px) ───────────────────────────────
//
// Plain English:
// Every product photo is taken with the same camera at the same distance,
// so pixels-per-millimetre is effectively constant across the whole
// catalogue. Rather than trust one hardcoded constant forever (which would
// silently drift if a photo is framed slightly differently, or if
// Cloudinary's delivery pipeline resizes an image), we derive it FRESH from
// each photo: its own delivered pixel width divided by the real max-width
// (mm) that was measured for that exact pose before the shot. Same formula
// for height as an independent cross-check.
//
// This is what lets accessory sizes and garment sizes render at true
// relative scale, and what lets accessory position be stored in mm
// (device-independent) instead of a percentage of on-screen canvas pixels
// (which breaks under letterboxing / different viewport sizes).

export interface PxPerMm {
  x: number;
  y: number;
  /** Single scalar to use for isotropic (uniform) scaling — the average of x and y. */
  avg: number;
  /** True if the x- and y-derived values disagree by more than ~4% — a data-quality flag. */
  isSuspect: boolean;
}

/**
 * Derive pixels-per-millimetre for a garment photo from its own delivered
 * pixel dimensions and the max width/height (mm) measured for that pose.
 * Falls back gracefully (returns null) if measurement data isn't present
 * yet — callers should degrade to a fixed relative size in that case
 * rather than crash.
 */
export function computePxPerMm(
  imagePxWidth: number,
  imagePxHeight: number,
  maxWidthMm?: number,
  maxHeightMm?: number
): PxPerMm | null {
  if (!maxWidthMm || !maxHeightMm || maxWidthMm <= 0 || maxHeightMm <= 0) {
    return null;
  }
  const x = imagePxWidth / maxWidthMm;
  const y = imagePxHeight / maxHeightMm;
  const avg = (x + y) / 2;
  const isSuspect = Math.abs(x - y) / avg > 0.04;
  if (isSuspect && typeof console !== "undefined") {
    console.warn(
      `[editor] px-per-mm mismatch for this photo: width-derived=${x.toFixed(3)}, height-derived=${y.toFixed(3)}. ` +
      `Check the photo crop and the measured maxWidthMm/maxHeightMm for this view.`
    );
  }
  return { x, y, avg, isSuspect };
}

export function mmToPx(mm: number, pxPerMm: number): number {
  return mm * pxPerMm;
}

export function pxToMm(px: number, pxPerMm: number): number {
  return px / pxPerMm;
}

// ─── Truncate text ────────────────────────────────────────────────────────────
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "…";
}