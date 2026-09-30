"use node";

import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import Razorpay from "razorpay";
import crypto from "crypto";



const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// ─── ACTION: Create Razorpay order ────────────────────────────────────────────
export const createRazorpayOrder = action({
  args: {
    amountInPaise: v.number(),  // Razorpay uses smallest currency unit (paise)
    receipt: v.string(),  // Your internal reference
  },
  handler: async (ctx, args) => {
    const order = await razorpay.orders.create({
      amount: args.amountInPaise,
      currency: "INR",
      receipt: args.receipt,
    });

    return {
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID!,
    };
  },
});

// ─── ACTION: Verify payment signature + finalise order ────────────────────────
export const verifyAndFinaliseOrder = action({
  args: {
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
    userId: v.string(),
    shippingAddress: v.object({
      name: v.string(),
      phone: v.string(),
      addressLine1: v.string(),
      addressLine2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      pincode: v.string(),
    }),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ orderId: Id<"orders">; success: boolean }> => {
    // ── Step 1: Verify HMAC-SHA256 signature ──────────────────────────────
    // Razorpay signs the orderId + paymentId with your secret key.
    // If the signature matches, the payment is genuine and untampered.
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${args.razorpayOrderId}|${args.razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== args.razorpaySignature) {
      throw new Error("PAYMENT_TAMPERED: Invalid payment signature.");
    }

    // ── Step 2: Call mutation to atomically finalise the order ────────────
    // The mutation handles: inventory lock, order creation, wardrobe clear
    const result = await ctx.runMutation(api.orders.finaliseOrder, {
      razorpayOrderId: args.razorpayOrderId,
      razorpayPaymentId: args.razorpayPaymentId,
      razorpaySignature: args.razorpaySignature,
      userId: args.userId,
      shippingAddress: args.shippingAddress,
      notes: args.notes,
    });

    // ── Step 3: Send confirmation email ──────────────────────────────────
    try {
      await ctx.runAction(api.email.sendOrderConfirmation, {
        orderId: result.orderId,
      });
    } catch {
      // Email failure should NOT fail the order — just log silently
      console.error("Order confirmation email failed for:", result.orderId);
    }

    return result;
  },
});