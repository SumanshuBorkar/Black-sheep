"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Truck, LogIn, ShoppingBag, ShieldCheck, HelpCircle } from "lucide-react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { PromoSlider } from "../common/PromoSlider";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_LINKS = [
  { label: "HOME", href: "/" },
  { label: "SHOP", href: "/shop" },
  { label: "CART", href: "/cart" },
  { label: "ABOUT", href: "/about" },
  { label: "ORDERS", href: "/orders" },
];

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    router.push(`/shop?search=${encodeURIComponent(searchTerm)}`);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-white overflow-y-auto flex flex-col pt-[3.4rem] scroll-mb-0"
      style={{
        backgroundImage: `url('https://res.cloudinary.com/dtogemlki/image/upload/v1782592445/Background-traced-999_ccdmwc.svg')`,
        backgroundSize: "1000%", // Zoom in
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* ── Sub-Header Search Inline Row ── */}
      <div className="w-full bg-[#F7FD04] border-b-2 border-black px-4 py-3">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-white border-2 border-black px-3 py-1.5 font-mono text-sm placeholder:text-neutral-400 outline-none"
          />
          <button
            type="submit"
            aria-label="Search"
            className="flex items-center justify-center w-10 h-10 bg-white border-2 border-black shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <Search size={16} strokeWidth={2.5} className="text-black" />
          </button>
        </form>
      </div>

      {/* ── Main Content Area ── */}
      <div className="p-4 flex flex-col gap-8 flex-1 relative z-10">

        {/* Tilted Navigation Menu Card */}
        <div className="w-full relative py-4 max-w-md mx-auto">
          <img
            src="https://res.cloudinary.com/dtogemlki/image/upload/v1782635304/kiss-pout_tgckpu.png"
            alt=""
            className="absolute -top-4 -left-2 w-14 h-auto z-20 pointer-events-none transform -rotate-12"
          />

          <nav className="bg-white border-2 border-black px-6 py-8 flex flex-col items-center gap-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform rotate-[-2deg] origin-center">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="font-mono font-black text-xl uppercase tracking-widest text-black hover:bg-[#F7FD04] px-2 py-0.5 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <img
            src="https://res.cloudinary.com/dtogemlki/image/upload/v1782670612/Japenese_dh1jwz.png"
            alt=""
            className="absolute -bottom-6 -right-3 w-20 h-auto z-20 pointer-events-none"
          />
        </div>

        {/* Integrated Carousel Advertisement Promo Banner */}
        <div className="w-full max-w-md mx-auto">
          <PromoSlider />
        </div>
      </div>

      {/* ── 2. Full-Width 100% Width Footer System ── */}
      <div className="w-full bg-white border-t-2 border-black mt-auto relative z-20">
        <div className="max-w-md mx-auto px-6 py-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 border-b border-black/10 pb-4">
            <Link
              href="/orders"
              onClick={onClose}
              className="flex items-center gap-3 font-mono text-xs font-black uppercase tracking-wider text-black py-1 hover:opacity-70"
            >
              <Truck size={16} strokeWidth={2.5} /> Track Order
            </Link>
            <Link
              href="https://instagram.com"
              target="_blank"
              className="flex items-center gap-3 font-mono text-xs font-black uppercase tracking-wider text-black py-1 hover:opacity-70"
            >
              <Truck size={16} strokeWidth={2.5} /> Instagram
            </Link>
            <Link
              href="/shop?sort=new"
              onClick={onClose}
              className="flex items-center gap-3 font-mono text-xs font-black uppercase tracking-wider text-black py-1 hover:opacity-70"
            >
              <ShoppingBag size={16} strokeWidth={2.5} /> Shop New
            </Link>
            <Link
              href="/support"
              onClick={onClose}
              className="flex items-center gap-3 font-mono text-xs font-black uppercase tracking-wider text-black py-1 hover:opacity-70"
            >
              <HelpCircle size={16} strokeWidth={2.5} /> Help Desk
            </Link>
          </div>

          {/* Identity Gate Row */}
          <div className="w-full pt-1">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-black text-white font-mono text-xs font-black uppercase tracking-wider border-2 border-black hover:bg-[#F7FD04] hover:text-black transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)]">
                  <LogIn size={14} strokeWidth={2.5} /> Account Sign In
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <div className="flex items-center justify-between w-full bg-neutral-50 border border-black/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-emerald-600" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Secure Session Verified
                  </span>
                </div>
                <UserButton />
              </div>
            </Show>
          </div>
        </div>
      </div>

    </div>
  );
}