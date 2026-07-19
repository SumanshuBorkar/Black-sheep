"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { useImageUpload } from "@/hooks/useImageUpload";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { generateSlug } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";

const CATEGORIES = ["jackets","pants","shirts","shoes","glasses","accessories","other"] as const;
const CONDITIONS = ["mint","good","fair","worn"] as const;
const SIZE_SYSTEMS = ["IN","EU","US","UK","ONE_SIZE"] as const;

type Angle = "front" | "back" | "detail" | "flat" | "lifestyle";

interface PendingImage {
  file: File;
  previewUrl: string;
  angle: Angle;
}

export default function AdminAddProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createProduct = useMutation(api.products.createProduct);
  const attachImage   = useMutation(api.storage.attachProductImage);
  const { uploadImage, isUploading } = useImageUpload();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

  const [form, setForm] = useState({
    title: "", description: "", category: "jackets" as typeof CATEGORIES[number],
    brand: "", size: "", sizeSystem: "IN" as typeof SIZE_SYSTEMS[number],
    color: "", material: "", condition: "good" as typeof CONDITIONS[number],
    originalPrice: "", sellingPrice: "",
    isCustomizable: true, tags: "",
    waist: "", chest: "", length: "",
  });

  function set(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPendingImages((prev) => [
      ...prev,
      ...files.map((file, i) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        angle: (prev.length === 0 && i === 0 ? "front" : "detail") as Angle,
      })),
    ]);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pendingImages.length === 0) { toast.error("Add at least one photo."); return; }
    const originalPrice = Number(form.originalPrice);
    const sellingPrice  = Number(form.sellingPrice);
    if (!originalPrice || !sellingPrice) { toast.error("Enter valid prices."); return; }

    setIsSubmitting(true);
    try {
      const slug = `${generateSlug(form.title)}-${generateSlug(form.size)}-${Date.now().toString(36)}`;

      const productId = await createProduct({
        slug, title: form.title, description: form.description,
        category: form.category, brand: form.brand || undefined,
        size: form.size, sizeSystem: form.sizeSystem,
        color: form.color || undefined, material: form.material || undefined,
        condition: form.condition, originalPrice, sellingPrice,
        isCustomizable: form.isCustomizable,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        measurements: (form.waist || form.chest || form.length) ? {
          waist:   form.waist   ? Number(form.waist)   : undefined,
          chest:   form.chest   ? Number(form.chest)   : undefined,
          length:  form.length  ? Number(form.length)  : undefined,
          unit: "cm",
        } : undefined,
      });

      for (let i = 0; i < pendingImages.length; i++) {
        const uploaded = await uploadImage(pendingImages[i].file, "blax-sheep/products");
        await attachImage({
          productId:          productId as Id<"products">,
          cloudinaryPublicId: uploaded.publicId,
          secureUrl:          uploaded.secureUrl,
          angle:              pendingImages[i].angle,
          isPrimary:          i === 0,
          sortOrder:          i,
          width:              uploaded.width,
          height:             uploaded.height,
          blurDataUrl:        uploaded.blurDataUrl,
        });
      }

      toast.success("Product published!");
      router.push("/admin/products");
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
        Add Product
      </h1>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-5">

        {/* Photos */}
        <div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-2">
            Photos *
          </label>
          <input type="file" accept="image/*" multiple onChange={handleFiles}
            className="input-flat normal-case cursor-pointer" />
          {pendingImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {pendingImages.map((img, i) => (
                <div key={i} className="border border-black p-1.5">
                  <img src={img.previewUrl} alt="" className="w-full aspect-square object-cover mb-1" />
                  <select
                    value={img.angle}
                    onChange={(e) => setPendingImages((prev) => prev.map((p, pi) =>
                      pi === i ? { ...p, angle: e.target.value as Angle } : p
                    ))}
                    className="w-full font-mono text-2xs border border-black p-0.5 uppercase"
                  >
                    {["front","back","detail","flat","lifestyle"].map((a) => (
                      <option key={a} value={a}>{a.toUpperCase()}</option>
                    ))}
                  </select>
                  <button type="button"
                    onClick={() => setPendingImages((prev) => prev.filter((_, pi) => pi !== i))}
                    className="font-mono text-2xs text-sold uppercase underline mt-1 block">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Title + Brand */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Title *</label>
            <input required value={form.title} onChange={(e) => set("title", e.target.value)}
              className="input-flat normal-case" placeholder="Ed Hardy Vintage Jeans" />
          </div>
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Brand</label>
            <input value={form.brand} onChange={(e) => set("brand", e.target.value)}
              className="input-flat normal-case" placeholder="Ed Hardy" />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Description *</label>
          <textarea required rows={3} value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="input-flat normal-case resize-none w-full"
            placeholder="Sourced from Japan, great vintage wash..." />
        </div>

        {/* Category + Condition */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Category *</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="input-flat w-full">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Condition *</label>
            <select value={form.condition} onChange={(e) => set("condition", e.target.value)} className="input-flat w-full">
              {CONDITIONS.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
          </div>
        </div>

        {/* Size */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Size *</label>
            <input required value={form.size} onChange={(e) => set("size", e.target.value)}
              className="input-flat" placeholder="M / 32 / EU42" />
          </div>
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Size System</label>
            <select value={form.sizeSystem} onChange={(e) => set("sizeSystem", e.target.value)} className="input-flat w-full">
              {SIZE_SYSTEMS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Color + Material */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Color</label>
            <input value={form.color} onChange={(e) => set("color", e.target.value)}
              className="input-flat normal-case" placeholder="Indigo blue" />
          </div>
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Material</label>
            <input value={form.material} onChange={(e) => set("material", e.target.value)}
              className="input-flat normal-case" placeholder="Denim" />
          </div>
        </div>

        {/* Measurements */}
        <div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">
            Measurements (cm)
          </label>
          <div className="grid grid-cols-3 gap-3">
            {["waist","chest","length"].map((field) => (
              <div key={field}>
                <label className="block font-mono text-2xs text-muted-foreground uppercase mb-1">{field}</label>
                <input type="number" value={(form as any)[field]}
                  onChange={(e) => set(field, e.target.value)}
                  className="input-flat" placeholder="32" />
              </div>
            ))}
          </div>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Original Price ₹ *</label>
            <input required type="number" value={form.originalPrice}
              onChange={(e) => set("originalPrice", e.target.value)}
              className="input-flat" placeholder="16000" />
          </div>
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Selling Price ₹ *</label>
            <input required type="number" value={form.sellingPrice}
              onChange={(e) => set("sellingPrice", e.target.value)}
              className="input-flat" placeholder="4000" />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider mb-1">Tags (comma separated)</label>
          <input value={form.tags} onChange={(e) => set("tags", e.target.value)}
            className="input-flat normal-case" placeholder="vintage, y2k, japanese" />
        </div>

        {/* Customizable */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.isCustomizable}
            onChange={(e) => set("isCustomizable", e.target.checked)}
            className="w-5 h-5 accent-yellow" />
          <span className="font-mono text-xs uppercase tracking-wider">
            Allow customisation (editor)
          </span>
        </label>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
          {busy ? "Uploading..." : "Publish Product"}
        </Button>
      </form>
    </div>
  );
}