"use client";

import * as React from "react";
import Link from "next/link";

export interface PromoItem {
  title: string;
  subtitle?: string;
  imageURL: string;
  href: string;
}

const DEFAULT_PROMOS: PromoItem[] = [
  {
    title: "TRY THIS GOTH FEATURE",
    imageURL: "https://i.pinimg.com/1200x/41/d2/b5/41d2b50db14f8d301478baab2caa34cd.jpg",
    href: "/shop?feature=goth",
  },
  {
    title: "MAKE YOUR OWN FITS",
    subtitle: "50% OFF ON STICKERS",
    imageURL: "https://i.pinimg.com/1200x/82/7b/a8/827ba8df10bcc998b02b6707a9754080.jpg",
    href: "/customizer",
  }
];

interface PromoSliderProps {
  items?: PromoItem[];
}

export function PromoSlider({ items = DEFAULT_PROMOS }: PromoSliderProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [touchStart, setTouchStart] = React.useState<number | null>(null);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [items.length]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentTouch = e.touches[0].clientX;
    const diff = touchStart - currentTouch;

    if (diff > 50) {
      setCurrentIndex((prev) => (prev + 1) % items.length);
      setTouchStart(null);
    } else if (diff < -50) {
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
      setTouchStart(null);
    }
  };

  return (
    <div 
      className="w-100% h-[50vh] border-2 border-black bg-white relative overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div 
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {items.map((item, index) => (
          <Link 
            key={index} 
            href={item.href} 
            className="w-full h-full relative shrink-0 block group"
          >
            {/* Background Graphic Image Layout */}
            <img 
              src={item.imageURL} 
              alt="" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* Dark Graphic Vignette Gradient Mask Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 z-10" />

            {/* Typography Overlay Elements */}
            <div className="absolute inset-x-4 bottom-6 z-20 flex flex-col gap-1 items-start">
              <h3 
                className="text-[#F7FD04] text-2xl sm:text-3xl font-black uppercase tracking-tighter leading-none drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {item.title}
              </h3>
              {item.subtitle && (
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-white bg-black border border-white px-2 py-0.5">
                  {item.subtitle}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination Tracker Dot Indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
        {items.map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 transition-all duration-300 rounded-full bg-white border border-black ${i === currentIndex ? 'w-6' : 'w-1.5'}`}
          />
        ))}
      </div>
    </div>
  );
}