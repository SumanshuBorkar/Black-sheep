import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * BLAX SHEEP — Design Functions
 *
 * Plain English:
 * A "design" is the saved state of the customisation editor for one
 * product. It stores where each accessory sits on the garment (as
 * percentages so it renders correctly on any screen size) plus the
 * Cloudinary public IDs of the exported preview images.
 *
 * Flow:
 * 1. User opens editor → upsertDesign called on first auto-save (status: draft)
 * 2. User keeps editing → upsertDesign called again every 1.5s (debounced)
 * 3. User taps "Add to Wardrobe" → saveDesignToWardrobe called once
 *    (uploads preview, marks design as in_wardrobe, adds wardrobe row)
 */

const placementValidator = v.object({
  accessoryId: v.id("accessories"),
  face:        v.union(v.literal("front"), v.literal("back")),
  xPercent:    v.number(),
  yPercent:    v.number(),
  rotation:    v.number(),
  scaleX:      v.number(),
  scaleY:      v.number(),
  zIndex:      v.number(),
});

async function getUserId(ctx: any): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

// ─── QUERY: Get a single design by ID ─────────────────────────────────────────
export const getDesign = query({
  args: { designId: v.id("custom_designs") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.designId);
  },
});

// ─── MUTATION: Create or update a design (auto-save) ──────────────────────────
export const upsertDesign = mutation({
  args: {
    designId:           v.optional(v.id("custom_designs")),
    productId:          v.id("products"),
    placements:         v.array(placementValidator),
    totalAccessoryCost: v.number(),
    status:             v.union(
      v.literal("draft"),
      v.literal("saved"),
      v.literal("in_wardrobe"),
      v.literal("ordered")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not signed in.");

    // Recalculate accessory cost from actual accessory prices
    let totalAccessoryCost = 0;
    for (const placement of args.placements) {
      const acc = await ctx.db.get(placement.accessoryId);
      if (acc) totalAccessoryCost += acc.price;
    }

    const now = Date.now();

    if (args.designId) {
      // Update existing
      const existing = await ctx.db.get(args.designId);
      if (!existing || existing.userId !== userId) {
        throw new Error("Design not found.");
      }
      await ctx.db.patch(args.designId, {
        placements:         args.placements,
        totalAccessoryCost,
        status:             args.status,
        updatedAt:          now,
      });
      return args.designId;
    } else {
      // Create new
      return ctx.db.insert("custom_designs", {
        userId,
        productId:          args.productId,
        placements:         args.placements,
        totalAccessoryCost,
        status:             args.status,
        updatedAt:          now,
      });
    }
  },
});

// ─── MUTATION: Finalise design + add to wardrobe ──────────────────────────────
export const saveDesignToWardrobe = mutation({
  args: {
    designId:             v.optional(v.id("custom_designs")),
    productId:            v.id("products"),
    placements:           v.array(placementValidator),
    previewFrontPublicId: v.optional(v.string()),
    previewBackPublicId:  v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not signed in.");

    // Verify product is still available
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found.");
    if (product.status === "sold") throw new Error("This item has been sold.");

    // Recalculate cost
    let totalAccessoryCost = 0;
    for (const p of args.placements) {
      const acc = await ctx.db.get(p.accessoryId);
      if (acc) totalAccessoryCost += acc.price;
    }

    // Build preview URLs from public IDs if provided
    const previewFrontUrl = args.previewFrontPublicId
      ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${args.previewFrontPublicId}`
      : undefined;
    const previewBackUrl = args.previewBackPublicId
      ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${args.previewBackPublicId}`
      : undefined;

    const now = Date.now();

    // Upsert the design record
    let designId = args.designId;
    if (designId) {
      await ctx.db.patch(designId, {
        placements:           args.placements,
        totalAccessoryCost,
        previewFrontPublicId: args.previewFrontPublicId,
        previewFrontUrl,
        previewBackPublicId:  args.previewBackPublicId,
        previewBackUrl,
        status:               "in_wardrobe",
        updatedAt:            now,
      });
    } else {
      designId = await ctx.db.insert("custom_designs", {
        userId,
        productId:            args.productId,
        placements:           args.placements,
        totalAccessoryCost,
        previewFrontPublicId: args.previewFrontPublicId,
        previewFrontUrl,
        previewBackPublicId:  args.previewBackPublicId,
        previewBackUrl,
        status:               "in_wardrobe",
        updatedAt:            now,
      });
    }

    // Upsert wardrobe entry
    const existing = await ctx.db
      .query("wardrobe")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", userId).eq("productId", args.productId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        designId,
        addedAt: now,
      });
    } else {
      await ctx.db.insert("wardrobe", {
        userId,
        productId: args.productId,
        designId,
        addedAt:   now,
      });
    }

    return { designId, success: true };
  },
});
