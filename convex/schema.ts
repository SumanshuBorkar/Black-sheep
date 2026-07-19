import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * BLAX SHEEP — Convex Database Schema
 *
 * Plain English explanation:
 * This file is your "database blueprint". It tells Convex exactly what
 * tables exist, what fields each table has, and what type each field is.
 * Convex reads this file and enforces it — you cannot save data that
 * doesn't match this schema. This is your safety net.
 *
 * Every table automatically gets:
 * - _id: a unique ID (like a primary key)
 * - _creationTime: a timestamp
 */

export default defineSchema({

  // ──────────────────────────────────────────────────────────────────────────
  // PRODUCTS
  // Each row = one unique physical item in your inventory.
  // 50 blue denim jeans = 50 rows. Each has its own photos, condition, price.
  // ──────────────────────────────────────────────────────────────────────────
  products: defineTable({
    slug:           v.string(),   // URL-friendly ID: "ed-hardy-jeans-m-32"
    title:          v.string(),   // "Ed Hardy Vintage Jeans"
    description:    v.string(),
    category:       v.union(      // Top-level nav category
      v.literal("jackets"),
      v.literal("pants"),
      v.literal("shirts"),
      v.literal("shoes"),
      v.literal("glasses"),
      v.literal("accessories"),
      v.literal("other")
    ),
    subCategory:    v.optional(v.string()),   // e.g. "denim", "leather"
    brand:          v.optional(v.string()),   // "Ed Hardy", "Levi's"
    size:           v.string(),               // "M", "L", "32", "EU42"
    sizeSystem:     v.union(
      v.literal("IN"), v.literal("EU"), v.literal("US"), v.literal("UK"), v.literal("ONE_SIZE")
    ),
    color:          v.optional(v.string()),
    material:       v.optional(v.string()),
    condition:      v.union(
      v.literal("mint"),    // Looks new
      v.literal("good"),    // Minor wear, no damage
      v.literal("fair"),    // Visible wear, still wearable
      v.literal("worn")     // Heavy wear, priced accordingly
    ),
    originalPrice:  v.number(),   // What it originally cost (show as strikethrough)
    sellingPrice:   v.number(),   // What you're selling it for
    // Status tracks the item's lifecycle:
    // available → someone adds to wardrobe/pays → sold
    // We do NOT reserve items (no "reserved" status) — first to pay wins.
    status: v.union(
      v.literal("available"),
      v.literal("sold")
    ),
    isCustomizable: v.boolean(),  // Can accessories be attached? (not shoes)
    weight:         v.optional(v.number()),  // grams — for shipping calc
    tags:           v.array(v.string()),     // ["vintage", "Y2K", "japanese"]
    // measurements stored inline (not a separate table — simpler queries)
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
  })
    .index("by_slug",     ["slug"])         // Fast lookup by URL slug
    .index("by_category", ["category"])     // Filter by category
    .index("by_status",   ["status"])       // Filter available items
    .index("by_size",     ["size"])         // Filter by size (outfit builder)
    .index("by_category_status", ["category", "status"])  // Combined filter
    .searchIndex("search_products", {       // Full-text search
      searchField: "title",
      filterFields: ["category", "status", "size"],
    }),

  // ──────────────────────────────────────────────────────────────────────────
  // PRODUCT IMAGES
  // Separate table so one product can have multiple photos.
  // Images are stored in Convex Storage (like S3 but built-in).
  // ──────────────────────────────────────────────────────────────────────────
  product_images: defineTable({
    productId:  v.id("products"),
    // Cloudinary identifiers — NOT Convex storage.
    // publicId is what you use to build transformation URLs on the fly,
    // e.g. resizing, format conversion, cropping — all done by Cloudinary's
    // CDN at request time, not stored as separate files by us.
    cloudinaryPublicId: v.string(),   // e.g. "blax-sheep/products/abc123"
    secureUrl:          v.string(),   // Original full-res HTTPS URL (backup reference)
    angle:      v.union(
      v.literal("front"),
      v.literal("back"),
      v.literal("detail"),
      v.literal("flat"),
      v.literal("lifestyle")
    ),
    isPrimary:  v.boolean(),  // The main image shown in grids
    sortOrder:  v.number(),   // Display order
    // Blur placeholder: a tiny 10×10 base64 PNG shown while full image loads.
    // Generated at upload time. Prevents the white flash between images.
    blurDataUrl: v.optional(v.string()),
    width:      v.number(),   // Original upload dimensions
    height:     v.number(),
  })
    .index("by_product",          ["productId"])
    .index("by_product_primary",  ["productId", "isPrimary"]),

  // ──────────────────────────────────────────────────────────────────────────
  // ACCESSORIES
  // Patches, pins, stickers, etc. These have stock counts (not 1-of-1).
  // They are sold individually AND used in the customisation editor.
  // ──────────────────────────────────────────────────────────────────────────
  accessories: defineTable({
    slug:           v.string(),
    title:          v.string(),
    description:    v.string(),
    type: v.union(
      v.literal("embroidery_patch"),
      v.literal("pvc_patch"),
      v.literal("dtf_sticker"),
      v.literal("metal_piece"),
      v.literal("enamel_pin"),
      v.literal("bleach_art"),
      v.literal("shoe_customisation")
    ),
    price:          v.number(),
    stock:          v.number(),   // How many you have in stock
    // Display photo (on white background) — Cloudinary
    imagePublicId:  v.string(),
    imageUrl:       v.string(),
    // Cutout: PNG with transparent background — used in the editor
    // so accessories appear directly on top of the garment photo.
    // Cloudinary can auto-generate this from a regular photo using
    // its background-removal add-on, or you can upload a pre-cut PNG.
    cutoutPublicId: v.string(),
    cutoutUrl:       v.string(),
    // Physical dimensions — so the editor can scale accessories realistically
    widthMm:        v.number(),
    heightMm:       v.number(),
    status: v.union(
      v.literal("available"),
      v.literal("out_of_stock"),
      v.literal("discontinued")
    ),
    blurDataUrl:    v.optional(v.string()),
    imageWidth:     v.number(),
    imageHeight:    v.number(),
  })
    .index("by_type",   ["type"])
    .index("by_status", ["status"])
    .searchIndex("search_accessories", {
      searchField: "title",
      filterFields: ["type", "status"],
    }),

  // ──────────────────────────────────────────────────────────────────────────
  // CUSTOM DESIGNS
  // Created when a user opens the editor for a product.
  // Stores the exact position of every accessory on the garment.
  //
  // Key design decision: positions are stored as PERCENTAGES (0–100),
  // not pixels. This means the design looks correct on any screen size.
  // ──────────────────────────────────────────────────────────────────────────
  custom_designs: defineTable({
    userId:     v.string(),         // Clerk user ID
    productId:  v.id("products"),
    status: v.union(
      v.literal("draft"),        // Being edited, not saved
      v.literal("saved"),        // Saved but not in wardrobe
      v.literal("in_wardrobe"),  // Added to wardrobe
      v.literal("ordered")       // Part of a completed order
    ),
    // Placement: where each accessory sits on the garment
    // We store the full canvas state for each face so the editor
    // can perfectly reconstruct the design if the user returns.
    placements: v.array(v.object({
      accessoryId: v.id("accessories"),
      face:        v.union(v.literal("front"), v.literal("back")),
      xPercent:    v.number(),    // 0–100: horizontal position
      yPercent:    v.number(),    // 0–100: vertical position
      rotation:    v.number(),    // degrees
      scaleX:      v.number(),    // 1.0 = original size
      scaleY:      v.number(),
      zIndex:      v.number(),    // Layer order (for overlapping accessories)
    })),
    // Preview images generated by the editor (fabric canvas → PNG), uploaded
    // to Cloudinary via an unsigned upload preset directly from the browser.
    previewFrontPublicId: v.optional(v.string()),
    previewFrontUrl:      v.optional(v.string()),
    previewBackPublicId:  v.optional(v.string()),
    previewBackUrl:       v.optional(v.string()),
    // Total cost of all accessories in this design
    totalAccessoryCost: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user",            ["userId"])
    .index("by_user_status",     ["userId", "status"])
    .index("by_product",         ["productId"])
    .index("by_user_product",    ["userId", "productId"]),

  // ──────────────────────────────────────────────────────────────────────────
  // WARDROBE (Cart equivalent)
  // One row per item a user has saved to their wardrobe.
  // A wardrobe item can be:
  // - A plain product (no customisation)
  // - A product + a custom design
  // ──────────────────────────────────────────────────────────────────────────
  wardrobe: defineTable({
    userId:    v.string(),
    productId: v.id("products"),
    designId:  v.optional(v.id("custom_designs")),  // null = no customisation
    addedAt:   v.number(),
  })
    .index("by_user",         ["userId"])
    .index("by_user_product", ["userId", "productId"]),

  // ──────────────────────────────────────────────────────────────────────────
  // OUTFIT BUILDS
  // The outfit builder. User picks a size, then slots items into
  // categories (headwear, top, bottom, footwear, etc.)
  // ──────────────────────────────────────────────────────────────────────────
  outfit_builds: defineTable({
    userId:       v.string(),
    title:        v.optional(v.string()),   // User-given name
    selectedSize: v.string(),               // SIZE IS LOCKED for the session
    slots: v.array(v.object({
      category: v.union(
        v.literal("headwear"),
        v.literal("outerwear"),
        v.literal("top"),
        v.literal("bottom"),
        v.literal("footwear"),
        v.literal("accessory")
      ),
      productId:  v.optional(v.id("products")),  // null = empty slot
      layerOrder: v.number(),   // Visual stacking order in the preview
    })),
    previewPublicId: v.optional(v.string()),
    previewUrl:      v.optional(v.string()),
    isPublic:   v.boolean(),
    updatedAt:  v.number(),
  })
    .index("by_user",   ["userId"])
    .index("by_public", ["isPublic"]),

  // ──────────────────────────────────────────────────────────────────────────
  // ORDERS
  // Created after successful Razorpay payment.
  // Stores a snapshot of all product/price data at time of purchase
  // (prices can change later — the order must reflect what was paid).
  // ──────────────────────────────────────────────────────────────────────────
  orders: defineTable({
    userId:             v.string(),
    // Razorpay IDs — for payment verification and refunds
    razorpayOrderId:    v.string(),
    razorpayPaymentId:  v.optional(v.string()),
    razorpaySignature:  v.optional(v.string()),
    status: v.union(
      v.literal("pending"),     // Payment initiated
      v.literal("confirmed"),   // Payment verified, processing begins
      v.literal("processing"),  // You are attaching accessories
      v.literal("shipped"),     // Handed to India Post
      v.literal("delivered"),   // Customer confirmed delivery
      v.literal("cancelled")    // Failed payment or stock issue
    ),
    // Line items — snapshot of products at purchase time
    items: v.array(v.object({
      productId:       v.id("products"),
      designId:        v.optional(v.id("custom_designs")),
      productTitle:    v.string(),   // Snapshot — product may be edited later
      productSize:     v.string(),
      productPrice:    v.number(),
      accessoryCost:   v.number(),
      lineTotal:       v.number(),
      snapshotImageUrl: v.string(),  // What the item looked like when ordered
      // Accessory details
      accessories: v.array(v.object({
        accessoryId:    v.id("accessories"),
        accessoryTitle: v.string(),
        quantity:       v.number(),
        unitPrice:      v.number(),
      })),
    })),
    subtotal:     v.number(),
    shippingCost: v.number(),
    totalAmount:  v.number(),
    currency:     v.string(),   // "INR"
    // Shipping address — copied at order time (user may change address later)
    shippingAddress: v.object({
      name:         v.string(),
      phone:        v.string(),
      addressLine1: v.string(),
      addressLine2: v.optional(v.string()),
      city:         v.string(),
      state:        v.string(),
      pincode:      v.string(),
    }),
    notes:        v.optional(v.string()),   // Customer's special instructions
    trackingId:   v.optional(v.string()),   // India Post tracking number
    trackingUrl:  v.optional(v.string()),
    updatedAt:    v.number(),
  })
    .index("by_user",              ["userId"])
    .index("by_status",            ["status"])
    .index("by_razorpay_order",    ["razorpayOrderId"]),

});