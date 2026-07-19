import { OutfitBuilderShell } from "@/components/outfit/OutfitBuilderShell";

/**
 * Outfit Builder Page — /outfit-builder
 * Protected by proxy.ts — requires sign in.
 *
 * Shell is a server component; all interactive logic is
 * in OutfitBuilderShell (client component).
 */
export default function OutfitBuilderPage() {
  return (
    <main className="min-h-screen bg-white">
      <OutfitBuilderShell />
    </main>
  );
}
