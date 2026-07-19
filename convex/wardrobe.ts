import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * BLAX SHEEP — Wardrobe Functions
 *
 * Plain English: the wardrobe is the cart. One row per item saved by a user.
 * Items are NOT locked/reserved here — first to pay wins (see orders.ts).
 */

async function getUserId(ctx: any): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

// ─── QUERY: Live wardrobe item count (header badge) ───────────────────────────
export const getWardrobeCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return 0;
    const items = await ctx.db
      .query("wardrobe")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return items.length;
  },
});

// ─── QUERY: Full wardrobe with product + design data ─────────────────────────
export const getWardrobe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const items = await ctx.db
      .query("wardrobe")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return Promise.all(
      items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        const design  = item.designId ? await ctx.db.get(item.designId) : null;

        // Get primary image for display
        const images = await ctx.db
          .query("product_images")
          .withIndex("by_product_primary", (q) =>
            q.eq("productId", item.productId).eq("isPrimary", true)
          )
          .collect();

        return {
          ...item,
          product: product ? { ...product, primaryImage: images[0] ?? null } : null,
          design,
        };
      })
    );
  },
});

// ─── MUTATION: Add product to wardrobe ────────────────────────────────────────
export const addToWardrobe = mutation({
  args: {
    productId: v.id("products"),
    designId:  v.optional(v.id("custom_designs")),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not signed in.");

    // Check product is still available
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found.");
    if (product.status === "sold") throw new Error("This item has been sold.");

    // Prevent duplicate entries
    const existing = await ctx.db
      .query("wardrobe")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", userId).eq("productId", args.productId)
      )
      .unique();

    if (existing) {
      // If already in wardrobe, update the design reference if provided
      if (args.designId) {
        await ctx.db.patch(existing._id, { designId: args.designId });
      }
      return existing._id;
    }

    return ctx.db.insert("wardrobe", {
      userId,
      productId: args.productId,
      designId:  args.designId,
      addedAt:   Date.now(),
    });
  },
});

// ─── MUTATION: Remove from wardrobe ──────────────────────────────────────────
export const removeFromWardrobe = mutation({
  args: { wardrobeItemId: v.id("wardrobe") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not signed in.");

    const item = await ctx.db.get(args.wardrobeItemId);
    if (!item || item.userId !== userId) throw new Error("Item not found.");

    await ctx.db.delete(args.wardrobeItemId);
    return { success: true };
  },
});

// ─── QUERY: Check if a product is already in user's wardrobe ─────────────────
export const isInWardrobe = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return false;

    const item = await ctx.db
      .query("wardrobe")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", userId).eq("productId", args.productId)
      )
      .unique();

    return !!item;
  },
});
