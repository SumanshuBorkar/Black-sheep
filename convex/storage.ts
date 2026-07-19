import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * BLAX SHEEP — Image Attachment Functions
 *
 * Plain English summary:
 * Cloudinary handles the actual file storage, resizing, and CDN delivery
 * (see convex/cloudinary.ts for upload signatures and src/lib/cloudinary.ts
 * for URL building). This file just saves the Cloudinary REFERENCE
 * (publicId + URL) onto the relevant database record after a successful
 * upload — Convex never touches the image bytes themselves.
 */

// ─── MUTATION: Attach an uploaded product image ───────────────────────────────
export const attachProductImage = mutation({
  args: {
    productId:   v.id("products"),
    cloudinaryPublicId: v.string(),
    secureUrl:   v.string(),
    angle:       v.union(
      v.literal("front"), v.literal("back"), v.literal("detail"),
      v.literal("flat"), v.literal("lifestyle")
    ),
    isPrimary:   v.boolean(),
    sortOrder:   v.number(),
    width:       v.number(),
    height:      v.number(),
    blurDataUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If this is marked primary, un-mark any existing primary image
    if (args.isPrimary) {
      const existing = await ctx.db
        .query("product_images")
        .withIndex("by_product_primary", (q) =>
          q.eq("productId", args.productId).eq("isPrimary", true)
        )
        .collect();
      for (const img of existing) {
        await ctx.db.patch(img._id, { isPrimary: false });
      }
    }

    const imageId = await ctx.db.insert("product_images", args);
    return imageId;
  },
});

// ─── MUTATION: Remove a product image record ──────────────────────────────────
// Note: this only removes the DB reference. To also delete the file from
// Cloudinary, call the deleteCloudinaryImage action in convex/cloudinary.ts
// from the frontend alongside this mutation.
export const removeProductImage = mutation({
  args: { imageId: v.id("product_images") },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) return { success: false, publicId: null };

    await ctx.db.delete(args.imageId);
    return { success: true, publicId: image.cloudinaryPublicId };
  },
});