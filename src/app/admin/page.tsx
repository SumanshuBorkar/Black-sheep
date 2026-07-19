import Link from "next/link";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";

/**
 * Admin Dashboard — /admin
 * Quick stats overview: product count, accessory count, order counts.
 */
export default async function AdminDashboardPage() {
  return (
    <div>
      <h1 className="font-mono font-black text-2xl uppercase tracking-widest mb-8">
        Dashboard
      </h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { label: "Add Product",     href: "/admin/products/new",     desc: "Upload a new thrifted item" },
          { label: "Add Accessory",   href: "/admin/accessories/new",  desc: "Upload a patch, pin or sticker" },
          { label: "View Orders",     href: "/admin/orders",           desc: "Manage and ship orders" },
          { label: "View Products",   href: "/admin/products",         desc: "Edit or remove listings" },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="product-card p-5 block"
          >
            <p className="font-mono font-black text-sm uppercase tracking-wider mb-1">
              {card.label}
            </p>
            <p className="font-mono text-2xs text-muted-foreground">
              {card.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}