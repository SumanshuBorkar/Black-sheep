"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { v2 as cloudinary } from "cloudinary";

/**
 * BLAX SHEEP — Cloudinary Signed Upload
 *
 * Plain English summary:
 * Cloudinary uploads can happen in two ways: "unsigned" (anyone with your
 * cloud name can upload — risky) or "signed" (your server generates a
 * one-time signature, browser uploads directly to Cloudinary using it).
 *
 * We use SIGNED uploads. Here's the flow:
 *   1. Browser asks this Convex action: "give me a signature to upload"
 *   2. This action generates a signature using your Cloudinary API secret
 *      (the secret never leaves the server — it's safe here)
 *   3. Browser uploads the raw file DIRECTLY to Cloudinary using that
 *      signature (the file bytes never pass through Convex or Next.js —
 *      fast, and doesn't burn your Convex bandwidth quota)
 *   4. Cloudinary returns a publicId + URL, which we save to our database
 *
 * This action runs in Convex's Node.js runtime ("use node" at the top)
 * because the Cloudinary SDK needs Node — it can't run in Convex's default
 * lightweight JS runtime.
 */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const generateUploadSignature = action({
  args: {
    folder: v.string(),   // e.g. "blax-sheep/products", "blax-sheep/accessories"
  },
  handler: async (ctx, args) => {
    const timestamp = Math.round(Date.now() / 1000);

    // Parameters that will be signed — must match EXACTLY what the
    // browser sends in the upload request, or Cloudinary will reject it.
    const paramsToSign = {
      timestamp,
      folder: args.folder,
      // Auto-apply our default transformation preset on upload:
      // strips EXIF metadata, caps max dimensions at 2400px (no need to
      // store anything larger — Cloudinary generates smaller sizes
      // on-demand anyway), and auto-applies good compression.
      transformation: "q_auto,f_auto,c_limit,w_2400,h_2400",
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET as string
    );

    return {
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey:    process.env.CLOUDINARY_API_KEY,
      folder:    args.folder,
      transformation: paramsToSign.transformation,
    };
  },
});

// ─── Delete an image from Cloudinary (admin: remove product photo) ──────────
export const deleteCloudinaryImage = action({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const result = await cloudinary.uploader.destroy(args.publicId);
    return { success: result.result === "ok" };
  },
});