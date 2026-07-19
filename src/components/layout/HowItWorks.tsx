"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface StepData {
  title: string;
  description?: string;
  iconSrc: string; 
  zIndex?: number;  
  tiltAngle?: number; 
}

export interface PatchImages {
  ImageURL: string;
  zIndex?: number;
  left: number;
  bottom: number;
  width: number;
  // Responsive layout positioning parameters
  mdLeft?: number;
  mdBottom?: number;
  mdWidth?: number;
}

const DEFAULT_STEPS: StepData[] = [
  {
    title: "Select any item from inventory",
    description: "Browse our one-of-a-kind thrifted pieces.",
    iconSrc: "/Pants.svg", 
    zIndex: 10,
    tiltAngle: -3,
  },
  {
    title: "Press customize button and start customizing",
    description: "Drag patches, pins & stickers onto your piece.",
    iconSrc: "/eye wars.svg",
    zIndex: 20,
    tiltAngle: 3,
  },
  {
    title: "Add the piece to your wardrobe",
    description: "Save your design — we'll fulfil it exactly.",
    iconSrc: "/Tshirt.svg",
    zIndex: 30,
    tiltAngle: -2,
  },
  {
    title: "Now you are able to create outfits with items in your wardrobe",
    description: "Mix and match in the outfit builder.",
    iconSrc: "https://res.cloudinary.com/dtogemlki/image/upload/v1782500778/Jacket_yzu97p.svg",
    zIndex: 40,
    tiltAngle: 4,
  },
];

const DEFAULT_IMAGES: PatchImages[] = [
  {
    ImageURL: "https://res.cloudinary.com/dtogemlki/image/upload/v1782635304/kiss-pout_tgckpu.png",
    zIndex: 2,
    left: 20, 
    bottom: 950,
    width: 120,
    mdLeft: 180,
    mdBottom: 1220,
    mdWidth: 210
  },
  {
    ImageURL: "https://res.cloudinary.com/dtogemlki/image/upload/v1782635307/Chamelion_kpy9ob.png",
    zIndex: 2,
    left: 10, 
    bottom: 1200,
    width: 100,
    mdLeft: 20, 
    mdBottom: 1100,
    mdWidth: 150
  },
  {
    ImageURL: "https://res.cloudinary.com/dtogemlki/image/upload/v1782635349/Star_tusdkn.png",
    zIndex: 2,
    left: 280, 
    bottom: 490,
    width: 90,
    mdLeft: 30, 
    mdBottom: 490,
    mdWidth: 140
  },
  {
    ImageURL: "https://res.cloudinary.com/dtogemlki/image/upload/v1782635305/Snake_gl3d1f.png",
    zIndex: 2,
    left: 40, 
    bottom: 150,
    width: 110,
    mdLeft: 520, 
    mdBottom: 720,
    mdWidth: 160
  },
  {
    ImageURL: "https://res.cloudinary.com/dtogemlki/image/upload/v1782670612/Japenese_dh1jwz.png",
    zIndex: 2,
    left: 200, 
    bottom: 40,
    width: 140,
    mdLeft: 480, 
    mdBottom: 200,
    mdWidth: 250
  }
];

interface HowItWorksProps {
  steps?: StepData[];
  images?: PatchImages[];
}

export function HowItWorks({ steps = DEFAULT_STEPS, images = DEFAULT_IMAGES }: HowItWorksProps) {
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const [activeCardIndex, setActiveCardIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth >= 768) {
        if (activeCardIndex !== null) setActiveCardIndex(null);
        return;
      }

      const viewportCenter = window.innerHeight / 2;
      let closestIdx: number | null = null;
      let minDistance = Infinity;

      cardRefs.current.forEach((card, idx) => {
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distance = Math.abs(viewportCenter - cardCenter);

        // Find the absolute closest card currently crossing the viewport threshold axis
        if (distance < minDistance) {
          minDistance = distance;
          closestIdx = idx;
        }
      });

      // Strict snap filter window: card must be within 120px of the center line to trigger
      if (minDistance < 120) {
        setActiveCardIndex(closestIdx);
      } else {
        setActiveCardIndex(null);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [steps, activeCardIndex]);

  return (
    <section 
      className="relative py-20 px-4 overflow-hidden select-none bg-cover bg-center border-t border-b border-black"
      style={{
        backgroundImage: `url('https://res.cloudinary.com/dtogemlki/image/upload/v1782592445/Background-traced-999_ccdmwc.svg')`,
      }}
    >
      <div className="absolute inset-0 bg-black/5 pointer-events-none z-0" />
      
      {/* 1. Background Sticker/Patch Image Layers with Device Form Factors via CSS Variables */}
      {images.map((item, index) => (
        <img 
          key={index}
          src={item.ImageURL} 
          alt="sticker-patch" 
          className="absolute transition-all duration-300 pointer-events-none patch-element"
          style={{ 
            zIndex: item.zIndex ?? 2,
            "--patch-left": `${item.left}px`,
            "--patch-bottom": `${item.bottom}px`,
            "--patch-width": `${item.width}px`,
            "--patch-md-left": `${item.mdLeft ?? item.left}px`,
            "--patch-md-bottom": `${item.mdBottom ?? item.bottom}px`,
            "--patch-md-width": `${item.mdWidth ?? item.width}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* 2. Headline Title Settings */}
      <div className="relative z-40 mb-16 text-center max-w-3xl mx-auto px-2">
        <h2 
          className="uppercase tracking-tighter text-[#F7FD04] drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] text-3xl sm:text-[44px] md:text-[48px] font-black leading-[0.95]"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          Become a designer in 4 easy steps
        </h2>
      </div>

      {/* 3. Cards Container with 1/3 Height Air Spacing Gaps */}
      <div className="relative max-w-xl md:max-w-2xl mx-auto space-y-16 md:space-y-20 pb-12 z-10">
        {steps.map((step, i) => {
          const isMobileActive = activeCardIndex === i;
          const customTilt = step.tiltAngle || -3;

          return (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el; }}
              className="w-full"
              style={{ 
                zIndex: step.zIndex || (10 + i),
                position: "relative"
              }}
            >
              <div
                className={cn(
                  "w-full h-48 bg-white border-2 border-black p-5 md:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-500 ease-out flex items-center justify-between gap-6 origin-center",
                  isMobileActive 
                    ? "-translate-y-4 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]" 
                    : "md:hover:-translate-y-4 md:hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]"
                )}
                style={{
                  transform: isMobileActive ? `rotate(${customTilt}deg) scale(1.03)` : undefined,
                  '--desktop-tilt': `${customTilt}deg`
                } as React.CSSProperties}
              >
                {/* Left Text Column */}
                <div className="flex-1 pr-2">
                  <span className="font-mono text-[11px] md:text-xs font-black uppercase tracking-widest text-neutral-400 block mb-1.5">
                    STEP {i + 1}
                  </span>
                  <h3 className="font-mono text-xs sm:text-sm md:text-base font-black uppercase leading-tight text-black">
                    {step.title}
                  </h3>
                </div>

                {/* Right Graphic Frame */}
                <div className="w-[75px] h-[75px] sm:w-[90px] sm:h-[90px] md:w-[115px] md:h-[115px] flex items-center justify-center p-1 border border-dashed border-black/20 bg-neutral-50/50 rounded shrink-0">
                  <img 
                    src={step.iconSrc} 
                    alt="" 
                    className="max-w-full max-h-full object-contain pointer-events-none" 
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA Footer Action */}
      <div className="flex justify-center mt-8 relative z-40">
        <Link href="/shop" className="btn-secondary px-8 py-3.5 font-mono font-black text-xs md:text-sm uppercase border-2 border-black bg-white text-black hover:bg-[#F7FD04] transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:scale-95">
          See What's Possible
        </Link>
      </div>
    </section>
  );
}