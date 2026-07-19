import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — shadcn Button adapted for BLAX SHEEP
 *
 * Plain English:
 * This replaces our raw .btn-primary / .btn-secondary CSS classes with
 * a proper typed component that shadcn's ecosystem can work with.
 * The variants map directly to our existing design: primary = yellow,
 * secondary = white/outlined, ghost = no background.
 *
 * We use asChild to allow <Button asChild><Link href="...">...</Link></Button>
 * which lets any button become a Next.js Link without losing button styles.
 */

const buttonVariants = cva(
  // Base styles shared by all variants
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-mono font-bold text-sm uppercase tracking-[0.1em]",
    "transition-all duration-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
    "focus-visible:outline-2 focus-visible:outline-yellow focus-visible:outline-offset-2",
  ],
  {
    variants: {
      variant: {
        // Yellow — primary CTA (Add to Cart, Checkout, Save)
        primary: [
          "bg-yellow text-black border border-black",
          "shadow-card",
          "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-card-hover",
          "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        ],
        // White outlined — secondary action (Back, Cancel, See More)
        secondary: [
          "bg-white text-black border border-black",
          "shadow-card",
          "hover:bg-yellow hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-card-hover",
        ],
        // No background — tertiary/link-style
        ghost: [
          "bg-transparent text-black",
          "hover:bg-yellow",
        ],
        // Solid black — inverted (on yellow backgrounds)
        dark: [
          "bg-black text-yellow border border-black",
          "shadow-yellow",
          "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-yellow-hover",
        ],
        // Destructive — sold/cancel/delete actions
        destructive: [
          "bg-sold text-white border border-sold",
          "hover:opacity-90",
        ],
      },
      size: {
        sm:      "h-8 px-4 text-xs",
        default: "h-11 px-6",
        lg:      "h-12 px-8 text-base",
        icon:    "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
