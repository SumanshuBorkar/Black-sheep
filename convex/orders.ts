import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * BLAX SHEEP — Orders
 *
 * Plain English:
 * finaliseOrder is the most important mutation in the entire app.
 * It runs AFTER payment is verified and does everything atomically:
 *
 * 1. Re-validates every product is still available (race condition guard)
 * 2. Marks each product as SOLD
 * 3. Decrements accessory stock for each custom design
 * 4. Creates the order record with a snapshot of all prices
 * 5. Clears the user's wardrobe
 *
 * "Atomically" means: if ANY step fails, NOTHING is saved.
 * Convex mutations are transactional by default — no partial states.
 */

async function getUserId(ctx: any): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

// ─── MUTATION: Finalise order after payment verified ──────────────────────────
export const finaliseOrder = mutation({
  args: {
    razorpayOrderId:   v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
    userId:            v.string(),
    shippingAddress: v.object({
      name:          v.string(),
      phone:         v.string(),
      addressLine1:  v.string(),
      addressLine2:  v.optional(v.string()),
      city:          v.string(),
      state:         v.string(),
      pincode:       v.string(),
    }),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ── Fetch current wardrobe ─────────────────────────────────────────────
    const wardrobeItems = await ctx.db
      .query("wardrobe")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (wardrobeItems.length === 0) {
      throw new Error("Wardrobe is empty.");
    }

    // ── Re-validate all products are still available ───────────────────────
    // Critical: a product could sell between checkout initiation and payment.
    const soldItems: string[] = [];
    const productData: Array<{
      product: any;
      wardrobeItem: any;
      design: any;
      primaryImage: any;
    }> = [];

    for (const item of wardrobeItems) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;

      if (product.status === "sold") {
        soldItems.push(product.title);
        continue;
      }

      const design = item.designId ? await ctx.db.get(item.designId) : null;

      const images = await ctx.db
        .query("product_images")
        .withIndex("by_product_primary", (q) =>
          q.eq("productId", product._id).eq("isPrimary", true)
        )
        .collect();

      productData.push({
        product,
        wardrobeItem: item,
        design,
        primaryImage: images[0] ?? null,
      });
    }

    // If any items sold since checkout started → throw with details
    // The action layer will handle refund initiation
    if (soldItems.length > 0) {
      throw new Error(
        `ITEMS_SOLD: The following items sold before payment completed: ${soldItems.join(", ")}. A refund will be initiated.`
      );
    }

    // ── Build order items snapshot ─────────────────────────────────────────
    // We snapshot prices at purchase time — important because you might
    // change prices later, but the order must reflect what was paid.
    let subtotal = 0;
    const orderItems = [];

    for (const { product, design, primaryImage } of productData) {
      const accessoryCost = design?.totalAccessoryCost ?? 0;
      const lineTotal     = product.sellingPrice + accessoryCost;
      subtotal += lineTotal;

      // Build accessory snapshot
      const accessories = [];
      if (design?.placements) {
        for (const placement of design.placements) {
          const acc = await ctx.db.get(placement.accessoryId);
          if (acc) {
            accessories.push({
              accessoryId:    acc._id,
              accessoryTitle: acc.title,
              quantity:       1,
              unitPrice:      acc.price,
            });
          }
        }
      }

      orderItems.push({
        productId:        product._id,
        designId:         design?._id,
        productTitle:     product.title,
        productSize:      product.size,
        productPrice:     product.sellingPrice,
        accessoryCost,
        lineTotal,
        snapshotImageUrl: design?.previewFrontUrl
          ?? primaryImage?.secureUrl
          ?? "",
        accessories,
      });
    }

    const shippingCost = 100; // Flat ₹100 India Post shipping
    const totalAmount  = subtotal + shippingCost;

    // ── Create the order record ────────────────────────────────────────────
    const orderId = await ctx.db.insert("orders", {
      userId:            args.userId,
      razorpayOrderId:   args.razorpayOrderId,
      razorpayPaymentId: args.razorpayPaymentId,
      razorpaySignature: args.razorpaySignature,
      status:            "confirmed",
      items:             orderItems,
      subtotal,
      shippingCost,
      totalAmount,
      currency:          "INR",
      shippingAddress:   args.shippingAddress,
      notes:             args.notes,
      updatedAt:         Date.now(),
    });

    // ── Mark all products as SOLD ──────────────────────────────────────────
    for (const { product } of productData) {
      await ctx.db.patch(product._id, { status: "sold" });
    }

    // ── Decrement accessory stock ──────────────────────────────────────────
    for (const { design } of productData) {
      if (!design?.placements) continue;
      for (const placement of design.placements) {
        const acc = await ctx.db.get(placement.accessoryId);
        if (!acc) continue;
        const newStock = Math.max(0, acc.stock - 1);
        await ctx.db.patch(placement.accessoryId, {
          stock:  newStock,
          status: newStock > 0 ? "available" : "out_of_stock",
        });
      }
      // Mark design as ordered
      await ctx.db.patch(design._id, { status: "ordered" });
    }

    // ── Clear wardrobe ─────────────────────────────────────────────────────
    for (const item of wardrobeItems) {
      await ctx.db.delete(item._id);
    }

    return { orderId, success: true };
  },
});

// ─── QUERY: Get all orders for current user ────────────────────────────────────
export const getUserOrders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return orders.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// ─── QUERY: Get single order by ID ────────────────────────────────────────────
export const getOrderById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const order = await ctx.db.get(args.orderId);
    if (!order || order.userId !== userId) return null;

    return order;
  },
});

// ─── MUTATION: Update order status (admin) ────────────────────────────────────
export const updateOrderStatus = mutation({
  args: {
    orderId:    v.id("orders"),
    status:     v.union(
      v.literal("confirmed"), v.literal("processing"),
      v.literal("shipped"),   v.literal("delivered"),
      v.literal("cancelled")
    ),
    trackingId:  v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orderId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(orderId, { ...cleanUpdates, updatedAt: Date.now() });
    return { success: true };
  },
});


export const getAllOrders = query({
    args: {},
    handler: async (ctx) => {
      const orders = await ctx.db.query("orders").collect();
      return orders.sort((a, b) => b._creationTime - a._creationTime);
    },
  });
   