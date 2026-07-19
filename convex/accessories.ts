import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * BLAX SHEEP — Accessory Functions
 *
 * Plain English summary:
 * Accessories (patches, pins, stickers) are sold individually AND used
 * inside the customisation editor. These functions serve both purposes.
 */

// ─── QUERY: List all accessories, optionally filtered by type ────────────────
// Used on: Editor bottom sheet, Accessories shop page
export const listAccessories = query({
  args: { type: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let accessories;

    if (args.type) {
      accessories = await ctx.db
        .query("accessories")
        .withIndex("by_type", (q) => q.eq("type", args.type as any))
        .collect();
    } else {
      accessories = await ctx.db.query("accessories").collect();
    }

    return accessories.filter((a) => a.status === "available");
  },
});

// ─── QUERY: Get accessories grouped by type ───────────────────────────────────
// Used on: Editor bottom sheet — shows tabs (EMBROIDERY, DTF, METAL, etc.)
export const getAccessoriesGrouped = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("accessories").collect();
    const available = all.filter((a) => a.status === "available");

    const grouped: Record<string, typeof available> = {
      embroidery_patch:   [],
      pvc_patch:          [],
      dtf_sticker:        [],
      metal_piece:        [],
      enamel_pin:         [],
      bleach_art:         [],
      shoe_customisation: [],
    };

    for (const acc of available) {
      grouped[acc.type]?.push(acc);
    }

    return grouped;
  },
});

// ─── QUERY: Get a single accessory by slug ────────────────────────────────────
// Used on: Accessory detail page (sold individually)
export const getAccessoryBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("accessories")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .unique();
  },
});

// ─── QUERY: Get multiple accessories by IDs ───────────────────────────────────
// Used on: Editor — resolving placement.accessoryId back to full accessory data
export const getAccessoriesByIds = query({
  args: { ids: v.array(v.id("accessories")) },
  handler: async (ctx, args) => {
    const accessories = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return accessories.filter((a) => a !== null);
  },
});

// ─── MUTATION: Create accessory (Admin only) ──────────────────────────────────
export const createAccessory = mutation({
  args: {
    slug:             v.string(),
    title:            v.string(),
    description:      v.string(),
    type: v.union(
      v.literal("embroidery_patch"), v.literal("pvc_patch"), v.literal("dtf_sticker"),
      v.literal("metal_piece"), v.literal("enamel_pin"), v.literal("bleach_art"),
      v.literal("shoe_customisation")
    ),
    price:            v.number(),
    stock:            v.number(),
    imagePublicId:    v.string(),
    imageUrl:         v.string(),
    cutoutPublicId:   v.string(),
    cutoutUrl:        v.string(),
    widthMm:          v.number(),
    heightMm:         v.number(),
    imageWidth:       v.number(),
    imageHeight:      v.number(),
    blurDataUrl:      v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const accessoryId = await ctx.db.insert("accessories", {
      ...args,
      status: args.stock > 0 ? "available" : "out_of_stock",
    });

    return accessoryId;
  },
});

// ─── MUTATION: Decrement stock (internal — called on checkout) ────────────────
export const decrementStock = mutation({
  args: { accessoryId: v.id("accessories"), quantity: v.number() },
  handler: async (ctx, args) => {
    const accessory = await ctx.db.get(args.accessoryId);
    if (!accessory) throw new Error("Accessory not found.");

    const newStock = Math.max(0, accessory.stock - args.quantity);
    await ctx.db.patch(args.accessoryId, {
      stock: newStock,
      status: newStock > 0 ? "available" : "out_of_stock",
    });

    return { success: true, remainingStock: newStock };
  },
});

// ─── MUTATION: Update accessory (Admin only) ──────────────────────────────────
export const updateAccessory = mutation({
  args: {
    accessoryId: v.id("accessories"),
    price:       v.optional(v.number()),
    stock:       v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { accessoryId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    if (cleanUpdates.stock !== undefined) {
      cleanUpdates.status = (cleanUpdates.stock as number) > 0 ? "available" : "out_of_stock";
    }

    await ctx.db.patch(accessoryId, cleanUpdates);
    return { success: true };
  },
});