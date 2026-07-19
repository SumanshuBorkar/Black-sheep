import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

/**
 * Admin Layout — /admin/*
 * Checks the signed-in Clerk userId matches ADMIN_USER_ID env var.
 * Anyone else is redirected to home immediately.
 *
 * Setup: add to .env.local →  ADMIN_USER_ID=user_2abc123...
 * Find your userId: Clerk dashboard → Users → click your account.
 */

const NAV_LINKS = [
  { label: "Dashboard",   href: "/admin" },
  { label: "Products",    href: "/admin/products" },
  { label: "Accessories", href: "/admin/accessories" },
  { label: "Orders",      href: "/admin/orders" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  const adminId    = process.env.ADMIN_USER_ID;

  if (!userId || userId !== adminId) redirect("/");

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-black text-yellow px-4 py-3 flex items-center justify-between">
        <span className="font-mono font-black text-sm uppercase tracking-widest">
          BLAX SHEEP — Admin
        </span>
        <Link href="/" className="font-mono text-2xs uppercase tracking-wider text-yellow/70 hover:text-yellow">
          ← View Store
        </Link>
      </div>

      <div className="border-b border-black bg-white">
        <div className="container-app flex gap-0 overflow-x-auto scrollbar-hide">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-xs font-bold uppercase tracking-wider px-4 py-3 border-r border-black whitespace-nowrap hover:bg-yellow transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="container-app py-8 max-w-4xl">
        {children}
      </div>
    </div>
  );
}