/**
 * BLAX SHEEP — Cloudinary URL Builder
 *
 * Plain English summary:
 * Once an image is uploaded to Cloudinary, you NEVER need to re-upload
 * different sizes of it. Instead, you build a URL with transformation
 * instructions baked in, and Cloudinary generates + caches that exact
 * version the first time it's requested.
 *
 * Example:
 *   Original upload: blax-sheep/products/ed-hardy-front
 *   Thumbnail URL:   .../w_400,c_fill,q_auto,f_auto/blax-sheep/products/ed-hardy-front
 *   Full-size URL:   .../w_1600,c_fill,q_auto,f_auto/blax-sheep/products/ed-hardy-front
 *
 * Both URLs point to the SAME uploaded file — Cloudinary resizes/converts
 * on the fly and caches the result on their CDN. You only ever store
 * ONE high-res image per photo.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

type CloudinaryPreset = "thumb" | "card" | "full" | "hero" | "cutout" | "og";

// Predefined transformation presets used throughout the app.
// Keeping these centralised means one place to tune image quality/size.
const PRESETS: Record<CloudinaryPreset, string> = {
  // Grid thumbnails — product cards, wardrobe list
  thumb: "w_400,h_533,c_fill,g_auto,q_auto,f_auto",
  // Product card on shop/category pages
  card:  "w_800,h_1067,c_fill,g_auto,q_auto,f_auto",
  // Full product detail page image
  full:  "w_1600,c_limit,q_auto,f_auto",
  // Full-bleed background hero images (landing page)
  hero:  "w_1920,c_fill,g_auto,q_auto:good,f_auto",
  // Accessory cutouts in the editor — preserve transparency, no cropping
  cutout: "c_limit,w_600,q_auto,f_png",
  // Open Graph / social share preview images
  og:    "w_1200,h_630,c_fill,g_auto,q_auto,f_jpg",
};

/**
 * Build a Cloudinary delivery URL from a publicId.
 *
 * @param publicId  The Cloudinary public ID (e.g. "blax-sheep/products/abc123")
 * @param preset    Which size/transformation preset to use
 */
export function cld(publicId: string, preset: CloudinaryPreset = "card"): string {
  if (!publicId) return "";
  if (!CLOUD_NAME) {
    console.error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set");
    return "";
  }

  const transformation = PRESETS[preset];
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformation}/${publicId}`;
}

/**
 * Build a custom transformation URL — for one-off cases not covered
 * by the standard presets (e.g. the outfit builder's exact crop needs).
 */
export function cldCustom(publicId: string, transformation: string): string {
  if (!publicId || !CLOUD_NAME) return "";
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformation}/${publicId}`;
}

/**
 * Generate a tiny base64 blur placeholder URL using Cloudinary itself.
 * This avoids needing client-side canvas blur generation — Cloudinary
 * creates an 8px-wide heavily-blurred version on the fly.
 * Use this as a fallback if you don't have a pre-generated blurDataUrl.
 */
export function cldBlurPlaceholder(publicId: string): string {
  if (!publicId || !CLOUD_NAME) return "";
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_16,e_blur:1000,q_1,f_auto/${publicId}`;
}

export { PRESETS as CLOUDINARY_PRESETS };