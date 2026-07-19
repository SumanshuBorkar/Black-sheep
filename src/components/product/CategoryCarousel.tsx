"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface CarouselItemData {
  label: string;
  href: string;
  icon?: string; // String path to local SVG assets or Cloudinary URLs
}

const DEFAULT_ITEMS: CarouselItemData[] = [
  { label: "PANTS",       href: "/shop/pants",       icon: "/Pants.svg" },
  { label: "GLASSES",     href: "/shop/glasses",     icon: "/eye wars.svg" },
  { label: "SHIRTS",      href: "/shop/shirts",      icon: "/Tshirt.svg" },
  { label: "JACKETS",     href: "/shop/jackets",     icon: "https://res.cloudinary.com/dtogemlki/image/upload/v1782500778/Jacket_yzu97p.svg" },
  { label: "SHOES",       href: "/shop/shoes",       icon: "/eye wars.svg" },
  { label: "ACCESSORIES", href: "/shop/accessories", icon: "/Tshirt.svg" },
];

interface CategoryCarouselProps {
  items?: CarouselItemData[];
}

export function CategoryCarousel({ items = DEFAULT_ITEMS }: CategoryCarouselProps) {
  const [activeIndex, setActiveIndex] = React.useState(1);
  const [touchStart, setTouchStart] = React.useState<number | null>(null);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.touches[0].clientX;
    const diff = touchStart - touchEnd;

    if (diff > 50) {
      nextSlide();
      setTouchStart(null);
    } else if (diff < -50) {
      prevSlide();
      setTouchStart(null);
    }
  };

  return (
    <div className="w-full bg-white py-6 px-4 overflow-hidden select-none flex items-center h-[30vh] justify-center">
      {/* Container constrained to a maximum height of 30% viewport height (max-h-[30vh]).
        We use h-[30vh] along with max-h-[280px] to keep an ideal baseline aspect ratio on desktop grids.
      */}
      <div 
        className="relative w-full max-w-5xl mx-auto flex items-center justify-center min-h-[180px] max-h-[280px]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Track Container */}
        <div className="flex items-center justify-center w-full h-full relative">
          {items.map((item, index) => {
            let offset = index - activeIndex;
            
            if (offset < -1 && activeIndex === items.length - 1 && index === 0) offset = 1;
            if (offset > 1 && activeIndex === 0 && index === items.length - 1) offset = -1;

            const isActive = index === activeIndex;
            const isVisible = offset >= -1 && offset <= 1;

            if (!isVisible) return null;

            return (
              <div
                key={item.href + index}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "absolute w-[28%] sm:w-[26%] md:w-[20%] lg:w-[16%] transition-all duration-500 ease-out cursor-pointer",
                  isActive ? "z-30" : "z-10"
                )}
                style={{
                  transform: `translateX(${offset * 110}%) scale(${isActive ? 1.08 : 0.92})`,
                }}
              >
                <Link 
                  href={item.href} 
                  className={cn("block pointer-events-none", isActive && "pointer-events-auto")}
                  onClick={(e) => !isActive && e.preventDefault()}
                >
                  <div
                    className={cn(
                      "flex flex-col items-center justify-between bg-white border border-black p-4 aspect-[3/4] w-full h-full transition-all duration-500 ease-out origin-center shadow-md",
                      isActive 
                        ? "-translate-y-4 rotate-[-3deg] shadow-[0_20px_30px_-10px_rgba(0,0,0,0.25)] border-[1.5px]" 
                        : "translate-y-0 rotate-0 opacity-40 scale-95"
                    )}
                  >
                    {/* Centered Graphic Space: Explicit bounding controls for SVG renders */}
                    <div className="flex-1 w-full flex items-center justify-center p-2 overflow-hidden">
                      {item.icon && (
                        <img 
                          src={item.icon} 
                          alt={item.label}
                          className="max-w-full max-h-full object-contain pointer-events-none group-hover:scale-105 transition-transform duration-300"
                          draggable={false}
                        />
                      )}
                    </div>

                    {/* Monospaced Wordmark Text */}
                    <span className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider text-black mt-2 text-center block select-none">
                      {item.label}
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Action Controls for Desktop Layouts */}
        <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 left-0 right-0 justify-between px-2 pointer-events-none z-40">
          <button
            onClick={prevSlide}
            className="w-8 h-8 rounded-full border border-black bg-white flex items-center justify-center text-sm font-bold font-mono transition-transform active:scale-90 pointer-events-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow"
            aria-label="Previous slide"
          >
            ←
          </button>
          <button
            onClick={nextSlide}
            className="w-8 h-8 rounded-full border border-black bg-white flex items-center justify-center text-sm font-bold font-mono transition-transform active:scale-90 pointer-events-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow"
            aria-label="Next slide"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}