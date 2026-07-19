"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sheet — bottom/side sliding panel
 *
 * Used for:
 * - Accessory picker (slides up from bottom in editor)
 * - Product filters (slides up from bottom on shop page)
 * - Product detail sheet (slides up from bottom in outfit builder)
 *
 * BLAX SHEEP style: sharp black border on the open edge,
 * no rounded corners on the sheet itself (matches our minimal aesthetic).
 */

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-40 bg-black/50",
      "data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-in",
      className
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  side?: "bottom" | "right";
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "bottom", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 bg-white",
        "focus:outline-none",
        side === "bottom" && [
          "bottom-0 left-0 right-0 max-h-[80vh]",
          "border-t-2 border-black",
          "data-[state=open]:animate-slide-up",
        ],
        side === "right" && [
          "top-0 right-0 h-full w-[85vw] max-w-sm",
          "border-l-2 border-black",
          "data-[state=open]:animate-slide-down",
        ],
        className
      )}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute right-4 top-4 opacity-70 hover:opacity-100">
        <X size={20} strokeWidth={2} />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("px-4 pt-4 pb-3 border-b border-black", className)}
    {...props}
  />
);

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(
      "font-mono font-black text-sm uppercase tracking-widest text-black",
      className
    )}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
};
