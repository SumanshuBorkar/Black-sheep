"use client";

import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { useToast } from "@/components/ui/toast";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * useWardrobeStatus — reusable hook for "is this product in my wardrobe?"
 *
 * Plain English:
 * Used on product detail pages so the Add to Wardrobe button shows
 * the correct state even on a hard refresh (not just after adding).
 *
 * It queries Convex live — so if the user adds from another tab,
 * this updates automatically here too.
 */
export function useWardrobeStatus(productId: Id<"products">) {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const inWardrobe = useQuery(
    api.wardrobe.isInWardrobe,
    isSignedIn ? { productId } : "skip"
  );

  const addToWardrobe = useMutation(api.wardrobe.addToWardrobe);

  async function handleAdd(designId?: Id<"custom_designs">) {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    if (inWardrobe) {
      router.push("/wardrobe");
      return;
    }

    setIsAdding(true);
    try {
      await addToWardrobe({ productId, designId });
      toast.success("Added to wardrobe!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not add to wardrobe.";
      if (msg.includes("sold")) {
        toast.error("This item just sold — try a similar one!");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsAdding(false);
    }
  }

  return {
    inWardrobe: inWardrobe ?? false,
    isAdding,
    handleAdd,
  };
}
