"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * SizeSelector — shown on first visit to the outfit builder
 *
 * Plain English:
 * Size is LOCKED for the entire session once selected.
 * This is a deliberate UX decision — a single outfit must
 * be one size so every piece fits the same person.
 * Once locked, all product queries filter to this size only.
 */

const SIZES = [
  ["XS", "S", "M"],
  ["L", "XL", "XXL"],
  ["28", "30", "32"],
  ["34", "36", "38"],
];

interface SizeSelectorProps {
  onSelect: (size: string) => void;
}

export function SizeSelector({ onSelect }: SizeSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-modal bg-white flex flex-col items-center justify-center px-6">
      <h1 className="font-mono font-black text-3xl uppercase tracking-widest text-center mb-2">
        Select Your Size
      </h1>
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground text-center mb-10">
        All outfit items will match this size
      </p>

      <div className="w-full max-w-xs space-y-3 mb-10">
        {SIZES.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-3">
            {row.map((size) => (
              <button
                key={size}
                onClick={() => setSelected(size)}
                className={cn(
                  "flex-1 py-3 font-mono font-bold text-sm uppercase tracking-wider border transition-all",
                  "border-black",
                  selected === size
                    ? "bg-yellow text-black shadow-card translate-x-[-1px] translate-y-[-1px]"
                    : "bg-white text-black hover:bg-white-off"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        ))}
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full max-w-xs"
        disabled={!selected}
        onClick={() => selected && onSelect(selected)}
      >
        {selected ? `Build with size ${selected} →` : "Select a size"}
      </Button>

      <p className="font-mono text-2xs text-muted-foreground mt-4 text-center max-w-xs">
        Can't find your size? It means no items in that size are available right now — check back soon.
      </p>
    </div>
  );
}
