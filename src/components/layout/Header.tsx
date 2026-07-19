"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ShoppingBag } from "lucide-react";
import { MobileMenu } from "./MobileMenu";

const NAV_LINKS = [
  { label: "HOME",     href: "/" },
  { label: "SHOP",     href: "/shop" },
  { label: "WARDROBE", href: "/wardrobe" },
  { label: "ABOUT",    href: "/about" },
  { label: "ORDERS",   href: "/orders" },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const pathname = usePathname();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // If the mobile menu overlay is active, freeze header layout adjustments
      if (isMenuOpen) return;

      const currentScrollY = window.scrollY;

      if (currentScrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, isMenuOpen]);

  // Lock body scroll while menu is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);

  const isLandingPage = pathname === "/";
  // Force background to solid yellow and header visible when the menu is active
  const isTransparent = isLandingPage && !isScrolled && !isMenuOpen;
  const showHeader = isVisible || isMenuOpen;

  return (
    <>
      <header
        className={`header-bar fixed top-0 left-0 right-0 z-[95] transition-all duration-300 ease-in-out ${
          showHeader ? "translate-y-0" : "-translate-y-full"
        } ${isTransparent ? "bg-transparent border-transparent" : "bg-yellow"}`}
      >
        {/* Main Grid Container */}
        <div className="w-full mx-auto grid grid-cols-3 items-center px-4 py-4 md:flex md:justify-between">
          
          {/* 1. Mobile Toggle */}
          <div className="flex justify-start md:hidden">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
              className={`custom-toggler ${isMenuOpen ? "open" : ""}`}
            >
              <span className="toggler-icon"></span>
            </button>
          </div>

          {/* 2. Branding Logo */}
          <div className="flex justify-center md:justify-start md:flex-initial">
            <Link 
              href="/" 
              onClick={() => setIsMenuOpen(false)}
              className="brand-wordmark font-bold text-xl tracking-tighter md:text-2xl whitespace-nowrap text-black"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              BLAX SHEEP
            </Link>
          </div>

          {/* 3. Desktop Navigation Items */}
          <nav className="hidden md:flex items-center gap-8 ml-auto mr-8">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-mono text-xs font-bold uppercase tracking-wider transition-colors duration-200 hover:text-black/60 ${
                    isActive ? "text-black border-b-2 border-black pb-1" : "text-black/70"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* 4. Cart / Utility Group */}
          <div className="flex justify-end items-center gap-4">
            <Link href="/wardrobe" aria-label="Wardrobe" className="relative p-1 hover:opacity-70 transition-opacity">
              <ShoppingBag size={22} strokeWidth={2} className="text-black" />
            </Link>
          </div>
          
        </div>
      </header>

      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}