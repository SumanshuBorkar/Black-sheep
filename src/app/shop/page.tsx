import { CategoryCarousel } from "@/components/product/CategoryCarousel";
import { ProductGrid } from "@/components/product/ProductGrid";
import { PromoSlider } from "@/components/common/PromoSlider";
import { MarqueeBanner } from "@/components/common/MarqueeBanner";

/**
 * Shop Page (/shop)
 *
 * Plain English summary:
 * Matches the Figma "SHOP" screen — category carousel up top,
 * "SEE WHAT'S NEW" marquee/banner section, then the full product grid.
 *
 * This page itself is a Server Component (fast initial HTML), but it
 * renders <ProductGrid>, which is a Client Component using Convex's
 * live useQuery — so the grid updates in real time as items sell,
 * without needing the whole page to be a client component.
 */
export default function ShopPage() {
  return (
    <main className="min-h-screen bg-white pt-[3.4rem]">
      <div className="container-app py-8">
        <h1 className="section-heading">Shop</h1>
        <div className="section-heading-divider" />
        <PromoSlider/>
        <br />
        <br />

        <CategoryCarousel />   

         <div className="flex justify-center mt-8 relative z-40">
        <span className="btn-secondary px-8 py-3.5 font-mono font-black text-xs md:text-sm uppercase border-2 border-black bg-white text-black hover:bg-[#F7FD04] transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:scale-95">
          New arrivals
        </span>
      </div>     
      <br />
      <br />

        <div className="mt-8">
          <ProductGrid sortBy="newest" />
        </div>
      </div>
    </main>
  );
}
