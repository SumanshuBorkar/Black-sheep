"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * useImageUpload — Client-side Cloudinary upload hook
 *
 * Plain English summary:
 * This hook handles the full upload pipeline for ONE image, direct to
 * Cloudinary (NOT through our server, NOT through Convex storage):
 *
 *   1. Ask Convex for a signed upload signature (server-side secret,
 *      safe — never exposed to the browser)
 *   2. Upload the raw file directly to Cloudinary's API using that
 *      signature (browser → Cloudinary, bypassing our server entirely)
 *   3. Cloudinary returns a publicId + secure URL + dimensions
 *   4. Generate a tiny blur placeholder client-side (kept local — instant,
 *      no extra network round trip)
 *
 * Why direct-to-Cloudinary instead of through our backend:
 * - Faster (no double-hop through our server)
 * - Doesn't consume Convex bandwidth at all
 * - Cloudinary auto-applies our transformation preset on arrival
 *   (strips EXIF, caps dimensions, compresses) — defined in convex/cloudinary.ts
 */

interface UploadResult {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  blurDataUrl: string;
}

type UploadFolder = "blax-sheep/products" | "blax-sheep/accessories" | "blax-sheep/designs" | "blax-sheep/outfits";

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const generateSignature = useAction(api.cloudinary.generateUploadSignature);

  async function uploadImage(file: File, folder: UploadFolder): Promise<UploadResult> {
    setIsUploading(true);
    setProgress(0);

    try {
      // Step 1: Generate local blur placeholder (instant, no network call)
      const blurDataUrl = await generateBlurPlaceholder(file);
      setProgress(15);

      // Step 2: Get a signed upload signature from Convex
      const sig = await generateSignature({ folder });
      setProgress(30);

      // Step 3: Upload directly to Cloudinary using XMLHttpRequest
      // (fetch doesn't support upload progress events, XHR does)
      const result = await uploadToCloudinary(file, sig, (pct) => {
        setProgress(30 + Math.round(pct * 0.7)); // 30% → 100%
      });

      return {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        blurDataUrl,
      };
    } finally {
      setIsUploading(false);
    }
  }

  return { uploadImage, isUploading, progress };
}

// ─── Direct upload to Cloudinary's REST API ───────────────────────────────────
function uploadToCloudinary(
  file: File,
  sig: { signature: string; timestamp: number; cloudName?: string; apiKey?: string; folder: string; transformation: string },
  onProgress: (pct: number) => void
): Promise<{ public_id: string; secure_url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", sig.apiKey ?? "");
    formData.append("timestamp", String(sig.timestamp));
    formData.append("signature", sig.signature);
    formData.append("folder", sig.folder);
    formData.append("transformation", sig.transformation);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`
    );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error("Cloudinary upload failed: " + xhr.responseText));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(formData);
  });
}

// ─── Local blur placeholder generator (unchanged — runs client-side) ─────────
function generateBlurPlaceholder(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scaleFactor = 16 / img.naturalWidth;
      canvas.width = 16;
      canvas.height = Math.round(img.naturalHeight * scaleFactor);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        resolve("");
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blurDataUrl = canvas.toDataURL("image/jpeg", 0.4);
      URL.revokeObjectURL(objectUrl);
      resolve(blurDataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image file."));
    };

    img.src = objectUrl;
  });
}