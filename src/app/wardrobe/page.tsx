import { WardrobeClient } from "@/components/wardrobe/WardrobeClient";

/**
 * Wardrobe Page — /wardrobe
 *
 * Plain English:
 * This is the cart page. Protected by Clerk proxy.ts so only
 * signed-in users can reach it.
 *
 * The page shell is a Server Component (fast HTML) but the actual
 * wardrobe list is a Client Component because it uses Convex's
 * reactive useQuery — items update in real time if something sells
 * while the user is looking at their wardrobe.
 */
export default function WardrobePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="container-app py-8 max-w-lg">
        <h1 className="section-heading mb-1">Wardrobe</h1>
        <div className="section-heading-divider" />
        <WardrobeClient />
      </div>
    </main>
  );
}
