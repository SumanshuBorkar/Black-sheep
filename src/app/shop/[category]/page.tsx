import { notFound } from "next/navigation";
import { CategoryCarousel } from "@/components/product/CategoryCarousel";
import { ProductGrid } from "@/components/product/ProductGrid";
import { CATEGORY_LABELS } from "@/lib/utils";
import type { Metadata } from "next";

/**
 * Category Page (/shop/[category])
 *
 * Plain English summary:
 * Matches the Figma "JACKETS" category screen — same layout as Shop
 * but pre-filtered to one category, with the category name as the
 * page heading.
 *
 * generateMetadata() below sets the page <title> dynamically per
 * category — important for SEO so "/shop/jackets" and "/shop/pants"
 * have distinct, search-friendly titles instead of all sharing one.
 */

const VALID_CATEGORIES = [
  "jackets", "pants", "shirts", "shoes", "glasses", "accessories", "other",
];

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;

  const label = CATEGORY_LABELS[category] ?? category;
  return {
    title: `${label} — Shop`,
    description: `Browse unique thrifted ${label.toLowerCase()} at BLAX SHEEP. Every item one-of-a-kind.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;

  if (!VALID_CATEGORIES.includes(category)) {

    notFound();
  }

  const label = CATEGORY_LABELS[category] ?? category.toUpperCase();

  return (
    <main className="min-h-screen bg-white">
      <div className="container-app py-8">
        <h1 className="section-heading">{label}</h1>
        <div className="section-heading-divider" />

        <CategoryCarousel activeCategory={category} />

        <div className="mt-8">
          <ProductGrid category={category} sortBy="newest" />
        </div>
      </div>
    </main>
  );
}
