import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * BLAX SHEEP — Product Functions
 *
 * Plain English summary of what's in this file:
 * - listProducts:        get a filtered/sorted list of products (Shop page)
 * - getProductBySlug:    get one product + its images (Product detail page)
 * - getProductsByIds:    get multiple specific products (Wardrobe, Outfit builder)
 * - getSimilarProducts:  get related products (Product detail page footer)
 * - searchProducts:      full-text search (Header search bar)
 * - createProduct:       add a new product (Admin panel)
 * - updateProduct:       edit a product (Admin panel)
 * - updateProductStatus: mark sold/available (used internally by checkout)
 */

// ─── Helper: attach images to a product ──────────────────────────────────────
// Convex stores image REFERENCES in product_images (Cloudinary publicId + URL).
// This helper joins them onto the product so the frontend gets one clean object.
async function attachImages(ctx: any, product: Doc<"products">) {
  const images = await ctx.db
    .query("product_images")
    .withIndex("by_product", (q: any) => q.eq("productId", product._id))
    .collect();

  images.sort((a: any, b: any) => a.sortOrder - b.sortOrder);

  const primaryImage = images.find((img: any) => img.isPrimary) ?? images[0];

  return { ...product, images, primaryImage };
}

// ─── QUERY: List products with filters ───────────────────────────────────────
// Used on: Shop page, Category page
export const listProducts = query({
  args: {
    category:  v.optional(v.string()),
    size:      v.optional(v.string()),
    condition: v.optional(v.string()),
    status:    v.optional(v.string()),   // defaults to "available" if not passed
    sortBy:    v.optional(v.string()),   // "price_asc" | "price_desc" | "newest"
    limit:     v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let products: Doc<"products">[];

    // Use the most specific index available for performance.
    if (args.category && args.status) {
      products = await ctx.db
        .query("products")
        .withIndex("by_category_status", (q) =>
          q.eq("category", args.category as any).eq("status", args.status as any)
        )
        .collect();
    } else if (args.category) {
      products = await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("category", args.category as any))
        .collect();
    } else if (args.size) {
      products = await ctx.db
        .query("products")
        .withIndex("by_size", (q) => q.eq("size", args.size as string))
        .collect();
    } else {
      products = await ctx.db.query("products").collect();
    }

    // Default: only show available items unless explicitly asked otherwise
    const statusFilter = args.status ?? "available";
    products = products.filter((p) => p.status === statusFilter);

    if (args.condition) {
      products = products.filter((p) => p.condition === args.condition);
    }

    // Sorting
    if (args.sortBy === "price_asc") {
      products.sort((a, b) => a.sellingPrice - b.sellingPrice);
    } else if (args.sortBy === "price_desc") {
      products.sort((a, b) => b.sellingPrice - a.sellingPrice);
    } else {
      // "newest" default — Convex _creationTime is built in
      products.sort((a, b) => b._creationTime - a._creationTime);
    }

    if (args.limit) {
      products = products.slice(0, args.limit);
    }

    // Attach images to every product
    return Promise.all(products.map((p) => attachImages(ctx, p)));
  },
});

// ─── QUERY: Get a single product by its URL slug ─────────────────────────────
// Used on: Product detail page (/product/[slug])
export const getProductBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!product) return null;

    return attachImages(ctx, product);
  },
});

// ─── QUERY: Get multiple products by their IDs ───────────────────────────────
// Used on: Wardrobe page, Outfit builder (fetching saved items)
export const getProductsByIds = query({
  args: { ids: v.array(v.id("products")) },
  handler: async (ctx, args) => {
    const products = await Promise.all(
      args.ids.map((id) => ctx.db.get(id))
    );
    const found = products.filter((p): p is Doc<"products"> => p !== null);
    return Promise.all(found.map((p) => attachImages(ctx, p)));
  },
});

// ─── QUERY: Get similar products ──────────────────────────────────────────────
// Used on: Product detail page ("SIMILAR ITEMS" section)
// Strategy: same category, same condition tier, excluding current product
export const getSimilarProducts = query({
  args: { productId: v.id("products"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const current = await ctx.db.get(args.productId);
    if (!current) return [];

    const sameCategory = await ctx.db
      .query("products")
      .withIndex("by_category_status", (q) =>
        q.eq("category", current.category).eq("status", "available")
      )
      .collect();

    const similar = sameCategory
      .filter((p) => p._id !== current._id)
      .slice(0, args.limit ?? 4);

    return Promise.all(similar.map((p) => attachImages(ctx, p)));
  },
});

// ─── QUERY: Full-text search ──────────────────────────────────────────────────
// Used on: Header search bar
export const searchProducts = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    if (!args.searchTerm.trim()) return [];

    const results = await ctx.db
      .query("products")
      .withSearchIndex("search_products", (q) =>
        q.search("title", args.searchTerm).eq("status", "available")
      )
      .take(20);

    return Promise.all(results.map((p) => attachImages(ctx, p)));
  },
});

// ─── QUERY: Get products for the Outfit Builder ───────────────────────────────
// Filters by size AND groups by category in one call — saves the frontend
// from making 6 separate queries.
export const getProductsForOutfitBuilder = query({
  args: { size: v.string() },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_size", (q) => q.eq("size", args.size))
      .collect();

    const available = products.filter((p) => p.status === "available");
    const withImages = await Promise.all(available.map((p) => attachImages(ctx, p)));

    // Group by category for the builder's slot system
    const grouped: Record<string, typeof withImages> = {
      headwear: [], outerwear: [], top: [], bottom: [], footwear: [], accessory: [],
    };

    // Map product categories to outfit slot categories
    const categoryToSlot: Record<string, string> = {
      jackets: "outerwear",
      shirts:  "top",
      pants:   "bottom",
      shoes:   "footwear",
      glasses: "accessory",
    };

    for (const product of withImages) {
      const slot = categoryToSlot[product.category] ?? "accessory";
      grouped[slot].push(product);
    }

    return grouped;
  },
});

// ─── MUTATION: Create a new product (Admin only) ──────────────────────────────
export const createProduct = mutation({
  args: {
    slug:           v.string(),
    title:          v.string(),
    description:    v.string(),
    category:       v.union(
      v.literal("jackets"), v.literal("pants"), v.literal("shirts"),
      v.literal("shoes"), v.literal("glasses"), v.literal("accessories"), v.literal("other")
    ),
    subCategory:    v.optional(v.string()),
    brand:          v.optional(v.string()),
    size:           v.string(),
    sizeSystem:     v.union(v.literal("IN"), v.literal("EU"), v.literal("US"), v.literal("UK"), v.literal("ONE_SIZE")),
    color:          v.optional(v.string()),
    material:       v.optional(v.string()),
    condition:      v.union(v.literal("mint"), v.literal("good"), v.literal("fair"), v.literal("worn")),
    originalPrice:  v.number(),
    sellingPrice:   v.number(),
    isCustomizable: v.boolean(),
    weight:         v.optional(v.number()),
    tags:           v.array(v.string()),
    measurements: v.optional(v.object({
      chest:    v.optional(v.number()),
      waist:    v.optional(v.number()),
      hips:     v.optional(v.number()),
      length:   v.optional(v.number()),
      shoulder: v.optional(v.number()),
      sleeve:   v.optional(v.number()),
      inseam:   v.optional(v.number()),
      unit:     v.union(v.literal("cm"), v.literal("inches")),
    })),
  },
  handler: async (ctx, args) => {
    // Check slug uniqueness
    const existing = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error(`A product with slug "${args.slug}" already exists.`);
    }

    const productId = await ctx.db.insert("products", {
      ...args,
      status: "available",
    });

    return productId;
  },
});

// ─── MUTATION: Update an existing product (Admin only) ────────────────────────
export const updateProduct = mutation({
  args: {
    productId:      v.id("products"),
    title:          v.optional(v.string()),
    description:    v.optional(v.string()),
    sellingPrice:   v.optional(v.number()),
    originalPrice:  v.optional(v.number()),
    condition:      v.optional(v.union(v.literal("mint"), v.literal("good"), v.literal("fair"), v.literal("worn"))),
    tags:           v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { productId, ...updates } = args;
    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Product not found.");

    // Strip undefined fields so we don't overwrite with "undefined"
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(productId, cleanUpdates);
    return productId;
  },
});

// ─── MUTATION: Update product status (internal — used by checkout flow) ───────
export const updateProductStatus = mutation({
  args: {
    productId: v.id("products"),
    status:    v.union(v.literal("available"), v.literal("sold")),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found.");

    await ctx.db.patch(args.productId, { status: args.status });
    return { success: true };
  },
});

// ─── MUTATION: Delete a product (Admin only) ───────────────────────────────────
// Note: this deletes the DB records. The actual Cloudinary files are cleaned
// up separately by the frontend calling deleteCloudinaryImage for each
// returned publicId — keeps this mutation fast and storage cleanup explicit.
export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("product_images")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    const publicIds = images.map((img) => img.cloudinaryPublicId);

    for (const image of images) {
      await ctx.db.delete(image._id);
    }

    await ctx.db.delete(args.productId);
    return { success: true, cloudinaryPublicIds: publicIds };
  },
});

export const getProductById = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    console.log("hit")
    const product = await ctx.db.get(args.productId);
    if (!product) return null;
 
    const images = await ctx.db
      .query("product_images")
      .withIndex("by_product", (q) => q.eq("productId", product._id))
      .collect();
 
    images.sort((a, b) => a.sortOrder - b.sortOrder);
    const primaryImage = images.find((img) => img.isPrimary) ?? images[0];
 
    return { ...product, images, primaryImage };
  },
});
 