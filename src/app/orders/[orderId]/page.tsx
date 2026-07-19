"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { OptimisedImage } from "@/components/common/OptimisedImage";
import { formatPrice, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Id } from "../../../../convex/_generated/dataModel";

const STATUS_STEPS = ["confirmed", "processing", "shipped", "delivered"];

const STATUS_STYLES: Record<string, string> = {
  confirmed:  "bg-yellow text-black",
  processing: "bg-yellow text-black",
  shipped:    "bg-black text-yellow",
  delivered:  "bg-available text-white",
  cancelled:  "bg-sold text-white",
};

export default function OrderDetailPage() {
  const params  = useParams();
  const orderId = params.orderId as Id<"orders">;
  const order   = useQuery(api.orders.getOrderById, { orderId });

  if (!order) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-wider animate-pulse">
          Loading order...
        </p>
      </main>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(order.status);

  return (
    <main className="min-h-screen bg-white pb-16">
      <div className="container-app py-8 max-w-lg">

        {/* ── Header ── */}
        <h1 className="section-heading mb-1">Order Detail</h1>
        <div className="section-heading-divider" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase">
              Order #{order._id.slice(-8).toUpperCase()}
            </p>
            <p className="font-mono text-2xs text-muted-foreground">
              Placed {formatDate(order._creationTime)}
            </p>
          </div>
          <span
            className={cn(
              "font-mono text-xs font-bold uppercase tracking-wider px-3 py-1.5 border border-black",
              STATUS_STYLES[order.status] ?? STATUS_STYLES.confirmed
            )}
          >
            {order.status}
          </span>
        </div>

        {/* ── Progress tracker ── */}
        {order.status !== "cancelled" && (
          <div className="mb-8">
            <div className="flex items-center gap-0">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={cn(
                      "w-6 h-6 border-2 border-black flex items-center justify-center font-mono text-2xs font-bold shrink-0",
                      i <= currentStep ? "bg-yellow text-black" : "bg-white text-muted-foreground"
                    )}
                  >
                    {i < currentStep ? "✓" : i + 1}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5",
                        i < currentStep ? "bg-black" : "bg-black/20"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {STATUS_STEPS.map((step) => (
                <span key={step} className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                  {step}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Tracking ── */}
        {order.trackingId && (
          <div className="border border-black p-3 mb-6 bg-yellow">
            <p className="font-mono text-2xs font-bold uppercase tracking-wider mb-1">
              Tracking (India Post)
            </p>
            <p className="font-mono text-sm font-black">{order.trackingId}</p>
            {order.trackingUrl && (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-2xs uppercase underline mt-1 block"
              >
                Track on India Post →
              </a>
            )}
          </div>
        )}

        {/* ── Items ── */}
        <section className="mb-6">
          <h2 className="font-mono font-black text-xs uppercase tracking-widest mb-3">
            Items
          </h2>
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex gap-3 border border-black p-2">
                <div className="w-14 h-20 shrink-0 bg-white-off border border-black relative overflow-hidden">
                  {item.snapshotImageUrl && (
                    <img
                      src={item.snapshotImageUrl}
                      alt={item.productTitle}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-mono text-xs font-bold uppercase">{item.productTitle}</p>
                  <p className="font-mono text-2xs text-muted-foreground uppercase">
                    Size {item.productSize}
                  </p>
                  {item.accessories.length > 0 && (
                    <p className="font-mono text-2xs text-muted-foreground mt-0.5">
                      + {item.accessories.length} custom accessories
                    </p>
                  )}
                  <p className="font-mono text-sm font-black mt-1">
                    {formatPrice(item.lineTotal)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Price breakdown ── */}
        <div className="border border-black p-3 mb-6 space-y-2">
          <div className="flex justify-between font-mono text-xs uppercase">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-bold">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between font-mono text-xs uppercase">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-bold">{formatPrice(order.shippingCost)}</span>
          </div>
          <div className="flex justify-between font-mono text-sm uppercase border-t border-black pt-2">
            <span className="font-black">Total paid</span>
            <span className="font-black">{formatPrice(order.totalAmount)}</span>
          </div>
        </div>

        {/* ── Shipping address ── */}
        <section className="mb-6">
          <h2 className="font-mono font-black text-xs uppercase tracking-widest mb-3">
            Shipping To
          </h2>
          <div className="border border-black p-3 font-mono text-xs">
            <p className="font-bold uppercase">{order.shippingAddress.name}</p>
            <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
            <p className="mt-1">{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && (
              <p>{order.shippingAddress.addressLine2}</p>
            )}
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.state} —{" "}
              {order.shippingAddress.pincode}
            </p>
          </div>
        </section>

        <Link href="/orders" className="btn-secondary block text-center">
          ← All Orders
        </Link>
      </div>
    </main>
  );
}
