"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Admin Orders Page
 *
 * Shows all orders across all users. You can:
 * - Update order status (confirmed → processing → shipped → delivered)
 * - Add a tracking ID (India Post tracking number)
 */

type OrderStatus = "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-white-off text-muted-foreground border-black",
  confirmed:  "bg-yellow text-black border-black",
  processing: "bg-yellow text-black border-black",
  shipped:    "bg-black text-yellow border-black",
  delivered:  "bg-available text-white border-available",
  cancelled:  "bg-sold text-white border-sold",
};

const STATUS_FLOW: OrderStatus[] = ["confirmed", "processing", "shipped", "delivered"];

export default function AdminOrdersPage() {
  const orders = useQuery(api.orders.getAllOrders);
  const updateStatus = useMutation(api.orders.updateOrderStatus);
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});

  async function handleStatusUpdate(
    orderId: Id<"orders">,
    status: OrderStatus,
    trackingId?: string
  ) {
    try {
      await updateStatus({ orderId, status, trackingId: trackingId || undefined });
      toast.success(`Order updated to ${status}`);
    } catch {
      toast.error("Could not update order.");
    }
  }

  if (!orders) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-white-off border border-black animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-mono font-black text-2xl uppercase tracking-widest mb-6">
        Orders ({orders.length})
      </h1>

      {orders.length === 0 ? (
        <p className="font-mono text-sm text-muted-foreground uppercase">
          No orders yet.
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isExpanded  = expandedId === order._id;
            const currentStep = STATUS_FLOW.indexOf(order.status as OrderStatus);
            const nextStatus  = STATUS_FLOW[currentStep + 1];

            return (
              <div key={order._id} className="border border-black">
                {/* ── Summary row ── */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order._id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-white-off transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold uppercase">
                        #{order._id.slice(-8).toUpperCase()}
                      </span>
                      <span className={cn(
                        "font-mono text-2xs font-bold uppercase px-1.5 py-0.5 border",
                        STATUS_STYLES[order.status] ?? STATUS_STYLES.confirmed
                      )}>
                        {order.status}
                      </span>
                    </div>
                    <p className="font-mono text-2xs text-muted-foreground mt-0.5">
                      {formatDate(order._creationTime)} ·{" "}
                      {order.items.length} item{order.items.length > 1 ? "s" : ""} ·{" "}
                      {order.shippingAddress.name} · {order.shippingAddress.city}
                    </p>
                  </div>
                  <span className="font-mono font-black text-sm shrink-0">
                    {formatPrice(order.totalAmount)}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>

                {/* ── Expanded detail ── */}
                {isExpanded && (
                  <div className="border-t border-black p-4 bg-white-off space-y-4">
                    {/* Items */}
                    <div>
                      <p className="font-mono text-2xs font-bold uppercase tracking-wider mb-2">
                        Items to fulfil
                      </p>
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between font-mono text-xs py-1 border-b border-black/10">
                          <span className="uppercase">
                            {item.productTitle} — {item.productSize}
                            {item.accessories.length > 0
                              ? ` + ${item.accessories.map((a) => a.accessoryTitle).join(", ")}`
                              : ""}
                          </span>
                          <span className="font-bold ml-2 shrink-0">
                            {formatPrice(item.lineTotal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Shipping address */}
                    <div>
                      <p className="font-mono text-2xs font-bold uppercase tracking-wider mb-1">
                        Ship to
                      </p>
                      <p className="font-mono text-xs">
                        {order.shippingAddress.name} · {order.shippingAddress.phone}<br />
                        {order.shippingAddress.addressLine1}
                        {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}<br />
                        {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}
                      </p>
                    </div>

                    {/* Tracking input */}
                    <div>
                      <label className="block font-mono text-2xs font-bold uppercase tracking-wider mb-1">
                        India Post Tracking ID
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={trackingInputs[order._id] ?? order.trackingId ?? ""}
                          onChange={(e) => setTrackingInputs((prev) => ({
                            ...prev, [order._id]: e.target.value
                          }))}
                          className="input-flat flex-1"
                          placeholder="EX123456789IN"
                        />
                        {trackingInputs[order._id] && (
                          <Button
                            variant="secondary" size="sm"
                            onClick={() => handleStatusUpdate(
                              order._id, order.status as OrderStatus,
                              trackingInputs[order._id]
                            )}
                          >
                            Save
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Status actions */}
                    {nextStatus && (
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={() => handleStatusUpdate(
                          order._id, nextStatus,
                          trackingInputs[order._id] ?? order.trackingId
                        )}
                      >
                        Mark as {nextStatus.toUpperCase()} →
                      </Button>
                    )}

                    {order.status !== "cancelled" && order.status !== "delivered" && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, "cancelled")}
                        className="w-full font-mono text-2xs uppercase tracking-wider text-sold underline"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}