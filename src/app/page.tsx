import Link from "next/link";
import { CategoryCarousel } from "@/components/product/CategoryCarousel";
import { HeroSection } from "@/components/layout/HeroSection";
import { HowItWorks } from "@/components/layout/HowItWorks";


const ACCESSORY_TYPES = [
  { label: "EMBROIDERY PATCHES",  slug: "embroidery_patch" },
  { label: "SHOE CUSTOMISATION",  slug: "shoe_customisation" },
  { label: "PVC PATCHES",         slug: "pvc_patch" },
  { label: "DTF STICKERS",        slug: "dtf_sticker" },
  { label: "DESTRESS DENIM",      slug: "destress_denim" },
  { label: "METAL PIECES",        slug: "metal_piece" },
  { label: "BLEACH ART",          slug: "bleach_art" },
  { label: "ENAMEL PINS",         slug: "enamel_pin" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ── Dynamic & Flexible Hero Slider Section ── */}
      <HeroSection />

      {/* ── Category carousel ── */}
      <section className="shadow py-8">
        <CategoryCarousel />
      </section>

      {/* ── Become a designer — 4 steps ── */}
      <section>
         <HowItWorks/>
      </section>

      {/* ── Accessory types grid ── */}
      <section className="py-12 px-4 bg-white-off">
        <h2 className="section-heading">Customise</h2>
        <div className="section-heading-divider max-w-xs mx-auto" />

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {ACCESSORY_TYPES.map((type) => (
            <Link
              key={type.slug}
              href={`/shop/accessories?type=${type.slug}`}
              className="product-card aspect-square flex items-center justify-center p-4 bg-white"
            >
              <span className="font-mono text-xs font-bold uppercase tracking-wide text-center text-black">
                {type.label}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}