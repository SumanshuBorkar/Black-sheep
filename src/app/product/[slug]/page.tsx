import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { SimilarItems } from "@/components/product/SimilarItems";
import { formatPrice, getDiscountPercent } from "@/lib/utils";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Product Detail Page — /product/[slug]
 *
 * This is a React Server Component. Next.js renders full HTML server-side:
 * 1. SEO — Google sees complete product data immediately, not a spinner.
 * 2. Speed — content visible on first network response, no JS needed.
 *
 * Interactive parts (image toggle, Add to Wardrobe) are isolated into
 * their own Client Components so JS only loads for what needs it.
 */

interface ProductPageProps {
  params: Promise<{ slug: string }>;

}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchQuery(api.products.getProductBySlug, { slug });
  if (!product) return { title: "Product Not Found" };

  return {
    title: product.title,
    description: `${product.condition.toUpperCase()} condition ${product.category} — size ${product.size}. ${product.description.slice(0, 120)}`,
    openGraph: {
      title: product.title,
      description: `${formatPrice(product.sellingPrice)} — ${product.condition} condition`,
      images: product.primaryImage ? [{ url: product.primaryImage.secureUrl }] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await fetchQuery(api.products.getProductBySlug, { slug });
  if (!product) notFound();

  const discount = getDiscountPercent(product.originalPrice, product.sellingPrice);

  return (
    <main className="min-h-screen bg-white pt-[3.4rem] pb-24">

      <section
        className="
          mx-auto
          max-w-7xl
          px-4
          md:px-6
          lg:px-8
          lg:grid
          lg:grid-cols-[1.15fr_0.85fr]
          lg:gap-14
          xl:gap-20
          items-start
        "
      >

        {product.isCustomizable && (
          <div className="absolute top-18 right-4 z-10">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/editor/${product._id}`}>CUSTOMIZE</Link>
            </Button>
          </div>
        )}

        <ProductImageGallery
          images={product.images ?? []}
          productTitle={product.title}
          productId={product._id}
          productSlug={slug}
        />

        <div className="lg:sticky lg:top-24">
          <ProductInfo
            productId={product._id}
            title={product.title}
            sellingPrice={product.sellingPrice}
            originalPrice={product.originalPrice}
            discount={discount}
            size={product.size}
            measurements={product.measurements}
            material={product.material}
            condition={product.condition}
            brand={product.brand}
            status={product.status}
          />
        </div>
      </section>

      <SimilarItems productId={product._id} />
    </main>
  );
}
