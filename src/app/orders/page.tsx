"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-white-off text-muted-foreground",
  confirmed:  "bg-yellow text-black",
  processing: "bg-yellow text-black",
  shipped:    "bg-black text-yellow",
  delivered:  "bg-available text-white",
  cancelled:  "bg-sold text-white",
};

export default function OrdersPage() {
  const orders = useQuery(api.orders.getUserOrders);

  if (!orders) {
    return (
      <main className="min-h-screen bg-white">
        <div className="container-app py-8 max-w-lg">
          <h1 className="section-heading mb-1">Orders</h1>
          <div className="section-heading-divider" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-white-off border border-black animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (orders.length === 0) {
    return (
      <main className="min-h-screen bg-white">
        <div className="container-app py-8 max-w-lg">
          <h1 className="section-heading mb-1">Orders</h1>
          <div className="section-heading-divider" />
          <div className="flex flex-col items-center py-20 text-center">
            <p className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-6">
              No orders yet
            </p>
            <Link href="/shop" className="btn-primary">
              Start Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container-app py-8 max-w-lg">
        <h1 className="section-heading mb-1">Orders</h1>
        <div className="section-heading-divider" />

        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order._id}
              href={`/orders/${order._id}`}
              className="product-card block p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-mono text-2xs text-muted-foreground uppercase">
                    Order #{order._id.slice(-8).toUpperCase()}
                  </p>
                  <p className="font-mono text-2xs text-muted-foreground mt-0.5">
                    {formatDate(order._creationTime)}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-mono text-2xs font-bold uppercase tracking-wider px-2 py-1 border border-black",
                    STATUS_STYLES[order.status] ?? STATUS_STYLES.confirmed
                  )}
                >
                  {order.status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <p className="font-mono text-xs uppercase">
                  {order.items.length} item{order.items.length > 1 ? "s" : ""}
                </p>
                <p className="font-mono font-black text-base">
                  {formatPrice(order.totalAmount)}
                </p>
              </div>

              {order.trackingId && (
                <p className="font-mono text-2xs text-muted-foreground mt-2 uppercase">
                  Tracking: {order.trackingId}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
