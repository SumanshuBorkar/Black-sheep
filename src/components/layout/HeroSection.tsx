"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export interface SlideData {
  id: string;
  type: "image" | "video";
  src: string;        // Desktop asset path (Widescreen landscape)
  mobileSrc?: string;  // Optional Mobile asset path (Vertical 3:4 or 9:16 portrait)
  subheading: string;
  headingText1: string;
  headingText2: string;
  btnText: string;
  btnLink: string;
}

const DEFAULT_SLIDES: SlideData[] = [
  {
    id: "slide-1",
    type: "image",
    src: "https://res.cloudinary.com/dtogemlki/image/upload/v1783702925/japart3_uciffp.png",       // Widescreen landscape asset
    mobileSrc: "https://i.pinimg.com/1200x/62/2f/cb/622fcbadb78a45a9b98956d96d53c19d.jpg", // Your original vertical asset
    subheading: "50% off on stickers",
    headingText1: "Make your",
    headingText2: "own fits",
    btnText: "Shop Now",
    btnLink: "/shop",
  },
  {
    id: "slide-2",
    type: "image",
    src: "https://res.cloudinary.com/dtogemlki/image/upload/v1782403537/CloseUpDenim_v5ddbj.jpg",     // Desktop video loop
    mobileSrc: "https://res.cloudinary.com/dtogemlki/image/upload/v1790172203/CartGirl_cfacgg.jpg", // Mobile optimized compressed vertical loop
    subheading: "New Drops Live Now",
    headingText1: "Thrifted &",
    headingText2: "Reworked",
    btnText: "Explore Collection",
    btnLink: "/shop",
  },

  {
    id: "slide-3",
    type: "image",
    src: "https://i.pinimg.com/1200x/29/16/20/291620e20f15c5416fc7bd38b2698e32.jpg",     // Desktop video loop
    mobileSrc: "https://i.pinimg.com/1200x/29/16/20/291620e20f15c5416fc7bd38b2698e32.jpg", // Mobile optimized compressed vertical loop
    subheading: "New Drops Live Now",
    headingText1: "Thrifted &",
    headingText2: "Reworked",
    btnText: "Explore Collection",
    btnLink: "/shop",
  },
];

export function HeroSection({ slides = DEFAULT_SLIDES }: { slides?: SlideData[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  if (!slides || slides.length === 0) return null;

  return (
    <section className="relative w-full h-[75vh] md:h-screen overflow-hidden">
      {slides.map((slide, idx) => {
        const isActive = idx === current;
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
              isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {/* ── VIDEO RENDER LOGIC ── */}
            {slide.type === "video" && (
              <>
                {/* Mobile Video: Visible on small screens, hidden on md+ */}
                <video
                  src={slide.mobileSrc || slide.src}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover md:hidden"
                />
                {/* Desktop Video: Hidden on small screens, visible on md+ */}
                <video
                  src={slide.src}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="hidden md:block w-full h-full object-cover"
                />
              </>
            )}

            {/* ── IMAGE RENDER LOGIC ── */}
            {slide.type === "image" && (
              <picture className="w-full h-full">
                {slide.mobileSrc && (
                  <source srcSet={slide.mobileSrc} media="(max-width: 767px)" />
                )}
                <source srcSet={slide.src} media="(min-width: 768px)" />
                <img
                  src={slide.src}
                  alt={slide.headingText1}
                  className="w-full h-full object-cover"
                />
              </picture>
            )}

            {/* Dark Graphic Vignette Gradient Mask overlay */}
            <div className="absolute inset-0  from-black/30 via-black/40 to-black/80" />

            {/* Content Display Alignment Block */}
            <div className="absolute inset-0 flex flex-col justify-end items-center text-center p-6 pb-20 md:pb-24">
              <p className="font-mono text-sm font-black uppercase tracking-widest text-yellow mb-3 bg-black/40 px-3 py-1 rounded backdrop-blur-xs">
                {slide.subheading}
              </p>
              
              <h1 className="font-mono font-black text-4xl sm:text-6xl md:text-7xl uppercase leading-[0.9] text-white tracking-tighter mb-8 max-w-2xl drop-shadow-lg">
                {slide.headingText1}
                <br />
                <span className="text-yellow">{slide.headingText2}</span>
              </h1>

              <Link href={slide.btnLink} className="btn-primary px-8 py-4 font-mono font-bold text-base uppercase border-2 border-black bg-white text-black transition-transform active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow">
                {slide.btnText}
              </Link>
            </div>
          </div>
        );
      })}

      {/* Slide Pagination / Progress Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrent(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 transition-all duration-300 rounded-full ${
                idx === current ? "w-8 bg-yellow" : "w-3 bg-white/50 hover:bg-white"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}