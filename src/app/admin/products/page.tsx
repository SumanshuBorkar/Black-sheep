"use client";

import { useQuery, useMutation } from "convex/react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { OptimisedImage } from "@/components/common/OptimisedImage";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function AdminProductsPage() {
  const products = useQuery(api.products.listProducts, { status: "available" });
  const soldProducts = useQuery(api.products.listProducts, { status: "sold" });
  const updateStatus = useMutation(api.products.updateProductStatus);
  const { toast } = useToast();

  async function handleToggleStatus(
    productId: Id<"products">,
    currentStatus: string
  ) {
    try {
      const newStatus = currentStatus === "available" ? "sold" : "available";
      await updateStatus({ productId, status: newStatus });
      toast.success(`Marked as ${newStatus}`);
    } catch {
      toast.error("Could not update status.");
    }
  }

  const allProducts = [...(products ?? []), ...(soldProducts ?? [])];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-mono font-black text-2xl uppercase tracking-widest">
          Products
        </h1>
        <Button variant="primary" size="sm" asChild>
          <Link href="/admin/products/new">+ Add Product</Link>
        </Button>
      </div>

      {allProducts.length === 0 ? (
        <p className="font-mono text-sm text-muted-foreground uppercase">
          No products yet. Add your first item.
        </p>
      ) : (
        <div className="space-y-3">
          {allProducts.map((product) => (
            <div
              key={product._id}
              className="border border-black p-3 flex gap-3 items-center"
            >
              {/* Thumbnail */}
              <div className="w-14 h-20 relative shrink-0 bg-white-off border border-black overflow-hidden">
                {product.primaryImage && (
                  <OptimisedImage
                    publicId={product.primaryImage.cloudinaryPublicId}
                    alt={product.title}
                    preset="thumb"
                    fill
                    objectFit="cover"
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs font-bold uppercase truncate">
                  {product.title}
                </p>
                <p className="font-mono text-2xs text-muted-foreground uppercase mt-0.5">
                  {product.category} · Size {product.size} · {product.condition}
                </p>
                <p className="font-mono text-sm font-black mt-1">
                  {formatPrice(product.sellingPrice)}
                  <span className="font-normal text-2xs text-muted-foreground line-through ml-2">
                    {formatPrice(product.originalPrice)}
                  </span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <span className={cn(
                  "font-mono text-2xs font-bold uppercase px-2 py-1 border border-black text-center",
                  product.status === "available" ? "bg-yellow" : "bg-sold text-white border-sold"
                )}>
                  {product.status}
                </span>
                <button
                  onClick={() => handleToggleStatus(product._id, product.status)}
                  className="font-mono text-2xs uppercase tracking-wider underline text-muted-foreground hover:text-black"
                >
                  {product.status === "available" ? "Mark sold" : "Relist"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}