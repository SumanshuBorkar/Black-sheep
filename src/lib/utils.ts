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

// ─── Editor: convert pixel position to percentage ────────────────────────────
// The editor stores positions as percentages so designs work on any screen.
export function toPercent(value: number, total: number): number {
  return Math.round((value / total) * 10000) / 100;  // 2 decimal places
}

export function fromPercent(percent: number, total: number): number {
  return (percent / 100) * total;
}

// ─── Truncate text ────────────────────────────────────────────────────────────
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "…";
}