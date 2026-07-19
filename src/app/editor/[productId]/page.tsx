import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { EditorShell } from "@/components/editor/EditorShell";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Editor Page — /editor/[productId]
 *
 * Also accepts ?design=[designId] query param to reload an
 * existing design (e.g. when editing from the wardrobe page).
 *
 * Server component: fetches product + its images server-side so
 * the canvas has image URLs immediately on mount — no loading flash.
 */

interface EditorPageProps {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ design?: string }>;
}

export default async function EditorPage({
  params,
  searchParams,
}: EditorPageProps) {
  const { productId } = await params;
  const { design: designId } = await searchParams;

  const product = await fetchQuery(api.products.getProductById, {
    productId: productId as Id<"products">,
  });

  if (!product || !product.isCustomizable) notFound();

  const frontImage = product.images?.find((img) => img.angle === "front")
    ?? product.images?.[0];
  const backImage  = product.images?.find((img) => img.angle === "back");

  return (
    <EditorShell
      product={{
        _id:        product._id,
        title:      product.title,
        slug:       product.slug,
        sellingPrice: product.sellingPrice,
      }}
      frontImagePublicId={frontImage?.cloudinaryPublicId ?? ""}
      backImagePublicId={backImage?.cloudinaryPublicId ?? ""}
      existingDesignId={designId as Id<"custom_designs"> | undefined}
    />
  );
}
