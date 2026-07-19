import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * BLAX SHEEP — Outfit Builder Functions
 */

async function getUserId(ctx: any): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

// ─── QUERY: Get all available products grouped by outfit slot category ────────
// This is the core query for the builder — returns products filtered
// by size, grouped into the 5 slot categories so the frontend doesn't
// need to make separate queries per slot.
export const getProductsForBuilder = query({
  args: { size: v.string() },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_size", (q) => q.eq("size", args.size))
      .collect();

    const available = products.filter((p) => p.status === "available");

    // Attach primary image to each product
    const withImages = await Promise.all(
      available.map(async (product) => {
        const images = await ctx.db
          .query("product_images")
          .withIndex("by_product_primary", (q) =>
            q.eq("productId", product._id).eq("isPrimary", true)
          )
          .collect();
        return { ...product, primaryImage: images[0] ?? null };
      })
    );

    // Map product categories → outfit slot categories
    const categoryToSlot: Record<string, string> = {
      jackets:     "outerwear",
      shirts:      "top",
      pants:       "bottom",
      shoes:       "footwear",
      glasses:     "accessory",
      accessories: "accessory",
    };

    const grouped: Record<string, typeof withImages> = {
      headwear:  [],
      outerwear: [],
      top:       [],
      bottom:    [],
      footwear:  [],
      accessory: [],
    };

    for (const product of withImages) {
      const slot = categoryToSlot[product.category] ?? "accessory";
      grouped[slot].push(product);
    }

    return grouped;
  },
});

// ─── QUERY: Get wardrobe items grouped by slot category (wardrobe mode) ───────
export const getWardrobeForBuilder = query({
  args: { size: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const wardrobeItems = await ctx.db
      .query("wardrobe")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const categoryToSlot: Record<string, string> = {
      jackets:     "outerwear",
      shirts:      "top",
      pants:       "bottom",
      shoes:       "footwear",
      glasses:     "accessory",
      accessories: "accessory",
    };

    const grouped: Record<string, any[]> = {
      headwear: [], outerwear: [], top: [],
      bottom: [], footwear: [], accessory: [],
    };

    for (const item of wardrobeItems) {
      const product = await ctx.db.get(item.productId);
      if (!product || product.status !== "available") continue;
      // Only include items matching the selected size
      if (product.size !== args.size) continue;

      const images = await ctx.db
        .query("product_images")
        .withIndex("by_product_primary", (q) =>
          q.eq("productId", product._id).eq("isPrimary", true)
        )
        .collect();

      const slot = categoryToSlot[product.category] ?? "accessory";
      grouped[slot].push({ ...product, primaryImage: images[0] ?? null });
    }

    return grouped;
  },
});

// ─── MUTATION: Save outfit build ──────────────────────────────────────────────
export const saveOutfit = mutation({
  args: {
    outfitId:        v.optional(v.id("outfit_builds")),
    selectedSize:    v.string(),
    slots:           v.array(v.object({
      category:   v.string(),
      productId:  v.optional(v.id("products")),
      layerOrder: v.number(),
    })),
    previewPublicId: v.optional(v.string()),
    previewUrl:      v.optional(v.string()),
    isPublic:        v.boolean(),
    title:           v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not signed in.");

    const now = Date.now();

    const data = {
      userId,
      selectedSize: args.selectedSize,
      slots:        args.slots as any,
      isPublic:     args.isPublic,
      title:        args.title,
      previewPublicId: args.previewPublicId,
      previewUrl:      args.previewUrl,
      updatedAt:    now,
    };

    if (args.outfitId) {
      const existing = await ctx.db.get(args.outfitId);
      if (!existing || existing.userId !== userId) throw new Error("Outfit not found.");
      await ctx.db.patch(args.outfitId, data);
      return args.outfitId;
    }

    return ctx.db.insert("outfit_builds", data);
  },
});

// ─── QUERY: Get user's saved outfits ─────────────────────────────────────────
export const getUserOutfits = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("outfit_builds")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});
