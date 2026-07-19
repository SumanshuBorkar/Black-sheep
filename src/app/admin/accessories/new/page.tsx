"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { useImageUpload } from "@/hooks/useImageUpload";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { generateSlug } from "@/lib/utils";

/**
 * Admin — Add Accessory Page
 *
 * Plain English:
 * Accessories need TWO images:
 * 1. Display image — normal product photo (white background)
 *    shown in the shop and accessory picker
 * 2. Cutout image — PNG with TRANSPARENT background
 *    placed on top of the garment in the editor
 *
 * The cutout is what makes accessories look like they're
 * actually sitting on the garment in the editor canvas.
 * Prepare it in Photoshop / remove.bg before uploading.
 */

const ACCESSORY_TYPES = [
  { value: "embroidery_patch",   label: "Embroidery Patch" },
  { value: "pvc_patch",          label: "PVC Patch" },
  { value: "dtf_sticker",        label: "DTF Sticker" },
  { value: "metal_piece",        label: "Metal Piece" },
  { value: "enamel_pin",         label: "Enamel Pin" },
  { value: "bleach_art",         label: "Bleach Art" },
  { value: "shoe_customisation", label: "Shoe Customisation" },
] as const;

type AccessoryType = typeof ACCESSORY_TYPES[number]["value"];

export default function AdminAddAccessoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createAccessory = useMutation(api.accessories.createAccessory);
  const { uploadImage, isUploading } = useImageUpload();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "",
    type: "embroidery_patch" as AccessoryType,
    price: "", stock: "",
    widthMm: "", heightMm: "",
  });

  const [displayFile, setDisplayFile]   = useState<File | null>(null);
  const [cutoutFile,  setCutoutFile]    = useState<File | null>(null);
  const [displayPreview, setDisplayPreview] = useState<string | null>(null);
  const [cutoutPreview,  setCutoutPreview]  = useState<string | null>(null);

  function set(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleDisplayFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDisplayFile(file);
    setDisplayPreview(URL.createObjectURL(file));
  }

  function handleCutoutFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCutoutFile(file);
    setCutoutPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayFile) { toast.error("Upload a display image."); return; }
    if (!cutoutFile)  { toast.error("Upload a cutout (transparent PNG)."); return; }

    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!price || stock < 0) { toast.error("Enter valid price and stock."); return; }

    setIsSubmitting(true);
    try {
      // Upload display image
      const displayUploaded = await uploadImage(displayFile, "blax-sheep/accessories");
      // Upload cutout PNG
      const cutoutUploaded  = await uploadImage(cutoutFile, "blax-sheep/accessories/cutouts");

      const slug = `${generateSlug(form.title)}-${Date.now().toString(36)}`;

      await createAccessory({
        slug,
        title:          form.title,
        description:    form.description,
        type:           form.type,
        price,
        stock,
        imagePublicId:  displayUploaded.publicId,
        imageUrl:       displayUploaded.secureUrl,
        cutoutPublicId: cutoutUploaded.publicId,
        cutoutUrl:      cutoutUploaded.secureUrl,
        widthMm:        form.widthMm  ? Number(form.widthMm)  : 80,
        heightMm:       form.heightMm ? Number(form.heightMm) : 80,
        imageWidth:     displayUploaded.width,
        imageHeight:    displayUploaded.height,
        blurDataUrl:    displayUploaded.blurDataUrl,
      });

      toast.success("Accessory published!");
      router.push("/admin/accessories");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const busy = isSubmitting || isUploading;

  return (
    <div>
      <h1 className="font-mono font-black text-2xl uppercase tracking-widest mb-8">
        Add Accessory
      </h1>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-5">

        {/* Display image */}
        <div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">
            Display Image * <span className="font-normal text-muted-foreground">(white background)</span>
          </label>
          <input type="file" accept="image/*" onChange={handleDisplayFile}
            className="input-flat normal-case cursor-pointer" />
          {displayPreview && (
            <img src={displayPreview} alt="display"
              className="mt-2 w-24 h-24 object-contain border border-black bg-white-off" />
          )}
        </div>

        {/* Cutout image */}
        <div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">
            Cutout Image * <span className="font-normal text-muted-foreground">(transparent PNG — used in editor)</span>
          </label>
          <input type="file" accept="image/png" onChange={handleCutoutFile}
            className="input-flat normal-case cursor-pointer" />
          {cutoutPreview && (
            <div className="mt-2 w-24 h-24 border border-black"
              style={{ background: "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0/12px 12px" }}>
              <img src={cutoutPreview} alt="cutout" className="w-full h-full object-contain" />
            </div>
          )}
          <p className="font-mono text-2xs text-muted-foreground mt-1">
            Tip: Use remove.bg or Photoshop to remove the white background before uploading.
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Title *</label>
          <input required value={form.title} onChange={(e) => set("title", e.target.value)}
            className="input-flat normal-case" placeholder="Ghostbusters Embroidery Patch" />
        </div>

        {/* Description */}
        <div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Description *</label>
          <textarea required rows={2} value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="input-flat normal-case resize-none w-full"
            placeholder="Iron-on embroidery patch..." />
        </div>

        {/* Type */}
        <div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Type *</label>
          <select value={form.type} onChange={(e) => set("type", e.target.value)} className="input-flat w-full">
            {ACCESSORY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Price + Stock */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Price ₹ *</label>
            <input required type="number" value={form.price}
              onChange={(e) => set("price", e.target.value)}
              className="input-flat" placeholder="350" />
          </div>
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Stock Qty *</label>
            <input required type="number" min="0" value={form.stock}
              onChange={(e) => set("stock", e.target.value)}
              className="input-flat" placeholder="10" />
          </div>
        </div>

        {/* Physical dimensions */}
        <div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">
            Physical Size (mm) — used to scale in editor
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-2xs text-muted-foreground uppercase mb-1">Width mm</label>
              <input type="number" value={form.widthMm}
                onChange={(e) => set("widthMm", e.target.value)}
                className="input-flat" placeholder="80" />
            </div>
            <div>
              <label className="block font-mono text-2xs text-muted-foreground uppercase mb-1">Height mm</label>
              <input type="number" value={form.heightMm}
                onChange={(e) => set("heightMm", e.target.value)}
                className="input-flat" placeholder="80" />
            </div>
          </div>
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
          {busy ? "Uploading..." : "Publish Accessory"}
        </Button>
      </form>
    </div>
  );
}