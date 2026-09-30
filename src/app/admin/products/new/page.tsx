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
type ViewSlug = "front" | "back" | "left" | "right" | "top" | "bottom" | "custom";

const VIEW_SLUG_LABELS: Record<ViewSlug, string> = {
  front: "Front", back: "Back", left: "Left", right: "Right",
  top: "Top", bottom: "Bottom", custom: "Custom",
};

interface PendingImage {
  file: File;
  previewUrl: string;
  angle: Angle;
  // Editor / customisation view fields — only used when isEditorView is true.
  // Lets ANY photo become a customisable side in the design editor, not
  // just front/back — e.g. a cap needs front+back+left+right+top.
  isEditorView: boolean;
  editorViewSlug: ViewSlug;
  editorViewLabel: string;
  maxWidthCm: string;   // full max width AS POSED in this exact photo
  maxHeightCm: string;  // full max height AS POSED in this exact photo
}

// Suggested editor-view slots per category, so tagging a cap's 5 sides
// doesn't mean typing "left"/"right"/"top" from scratch each time — the
// admin still confirms/adjusts, this is just a starting point.
const EDITOR_VIEW_TEMPLATES: Record<string, ViewSlug[]> = {
  shirts:      ["front", "back"],
  jackets:     ["front", "back"],
  pants:       ["front", "back"],
  accessories: ["front", "back", "left", "right", "top"],  // caps live here
  shoes:       [],
  glasses:     [],
  other:       ["front", "back"],
};

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
    const template = EDITOR_VIEW_TEMPLATES[form.category] ?? [];

    setPendingImages((prev) => [
      ...prev,
      ...files.map((file, i) => {
        const slotIndex = prev.length + i;
        const suggestedSlug = template[slotIndex];
        const isEditorView = !!suggestedSlug;
        return {
          file,
          previewUrl: URL.createObjectURL(file),
          angle: (slotIndex === 0 ? "front" : suggestedSlug === "back" ? "back" : "detail") as Angle,
          isEditorView,
          editorViewSlug: (suggestedSlug ?? "front") as ViewSlug,
          editorViewLabel: suggestedSlug ? VIEW_SLUG_LABELS[suggestedSlug] : "",
          maxWidthCm: "",
          maxHeightCm: "",
        };
      }),
    ]);
    e.target.value = "";
  }

  function updatePendingImage(index: number, updates: Partial<PendingImage>) {
    setPendingImages((prev) => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pendingImages.length === 0) { toast.error("Add at least one photo."); return; }
    const originalPrice = Number(form.originalPrice);
    const sellingPrice  = Number(form.sellingPrice);
    if (!originalPrice || !sellingPrice) { toast.error("Enter valid prices."); return; }

    const missingMeasurement = pendingImages.find(
      (img) => img.isEditorView && (!img.maxWidthCm || !img.maxHeightCm)
    );
    if (missingMeasurement) {
      toast.error("Enter max width & height (cm) for every editor-view photo — this is what makes accessory sizing accurate.");
      return;
    }

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

      let editorSortOrder = 0;
      for (let i = 0; i < pendingImages.length; i++) {
        const pending = pendingImages[i];
        const uploaded = await uploadImage(pending.file, "blax-sheep/products");
        await attachImage({
          productId:          productId as Id<"products">,
          cloudinaryPublicId: uploaded.publicId,
          secureUrl:          uploaded.secureUrl,
          angle:              pending.angle,
          isPrimary:          i === 0,
          sortOrder:          i,
          width:              uploaded.width,
          height:             uploaded.height,
          blurDataUrl:        uploaded.blurDataUrl,
          isEditorView:       pending.isEditorView,
          editorViewSlug:     pending.isEditorView ? pending.editorViewSlug : undefined,
          editorViewLabel:    pending.isEditorView ? (pending.editorViewLabel || VIEW_SLUG_LABELS[pending.editorViewSlug]) : undefined,
          editorSortOrder:    pending.isEditorView ? editorSortOrder++ : undefined,
          // cm → mm: the measurement is taken in cm, stored in mm to match
          // accessories.widthMm/heightMm so both use the same unit.
          maxWidthMm:         pending.isEditorView ? Number(pending.maxWidthCm) * 10 : undefined,
          maxHeightMm:        pending.isEditorView ? Number(pending.maxHeightCm) * 10 : undefined,
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {pendingImages.map((img, i) => (
                <div key={i} className="border border-black p-1.5">
                  <img src={img.previewUrl} alt="" className="w-full aspect-square object-cover mb-1" />
                  <select
                    value={img.angle}
                    onChange={(e) => updatePendingImage(i, { angle: e.target.value as Angle })}
                    className="w-full font-mono text-2xs border border-black p-0.5 uppercase"
                  >
                    {["front","back","detail","flat","lifestyle"].map((a) => (
                      <option key={a} value={a}>{a.toUpperCase()}</option>
                    ))}
                  </select>

                  <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={img.isEditorView}
                      onChange={(e) => updatePendingImage(i, { isEditorView: e.target.checked })}
                      className="w-3.5 h-3.5 accent-yellow"
                    />
                    <span className="font-mono text-2xs uppercase tracking-wide">Editor side</span>
                  </label>

                  {img.isEditorView && (
                    <div className="mt-1.5 space-y-1 border-t border-black/20 pt-1.5">
                      <select
                        value={img.editorViewSlug}
                        onChange={(e) => {
                          const slug = e.target.value as ViewSlug;
                          updatePendingImage(i, { editorViewSlug: slug, editorViewLabel: VIEW_SLUG_LABELS[slug] });
                        }}
                        className="w-full font-mono text-2xs border border-black p-0.5 uppercase"
                      >
                        {(Object.keys(VIEW_SLUG_LABELS) as ViewSlug[]).map((s) => (
                          <option key={s} value={s}>{VIEW_SLUG_LABELS[s]}</option>
                        ))}
                      </select>
                      <input
                        value={img.editorViewLabel}
                        onChange={(e) => updatePendingImage(i, { editorViewLabel: e.target.value })}
                        placeholder="Tab label e.g. Cap Top"
                        className="w-full font-mono text-2xs border border-black p-0.5 normal-case"
                      />
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={img.maxWidthCm}
                          onChange={(e) => updatePendingImage(i, { maxWidthCm: e.target.value })}
                          placeholder="Max W (cm)"
                          className="w-1/2 font-mono text-2xs border border-black p-0.5"
                        />
                        <input
                          type="number"
                          value={img.maxHeightCm}
                          onChange={(e) => updatePendingImage(i, { maxHeightCm: e.target.value })}
                          placeholder="Max H (cm)"
                          className="w-1/2 font-mono text-2xs border border-black p-0.5"
                        />
                      </div>
                      <p className="font-mono text-[9px] text-muted-foreground normal-case leading-tight">
                        Measure the item's actual max width/height AS POSED in this photo (e.g. sleeve-to-sleeve, or max folded width).
                      </p>
                    </div>
                  )}

                  <button type="button"
                    onClick={() => setPendingImages((prev) => prev.filter((_, pi) => pi !== i))}
                    className="font-mono text-2xs text-sold uppercase underline mt-1.5 block">
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