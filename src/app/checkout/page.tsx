"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { useAuth, useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { OptimisedImage } from "@/components/common/OptimisedImage";
import { useToast } from "@/components/ui/toast";
import { formatPrice, loadRazorpayScript } from "@/lib/utils";
import type { RazorpayResponse } from "@/types";

/**
 * Checkout Page — /checkout
 *
 * Flow:
 * 1. Shows order summary (wardrobe items + prices)
 * 2. User fills shipping address
 * 3. "Pay Now" → creates Razorpay order → opens checkout modal
 * 4. On success → verifyAndFinalise → redirect to /orders/[id]
 * 5. On failure → show error, do not clear wardrobe
 */

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh",
];

export default function CheckoutPage() {
  const router    = useRouter();
  const { toast } = useToast();
  const { userId } = useAuth();
  const { user }   = useUser();

  const wardrobe = useQuery(api.wardrobe.getWardrobe);

  const createRazorpayOrder  = useAction(api.payments.createRazorpayOrder);
  const verifyAndFinalise    = useAction(api.payments.verifyAndFinaliseOrder);

  const [isPaying, setIsPaying] = useState(false);
  const [address, setAddress]   = useState({
    name:         user?.fullName ?? "",
    phone:        "",
    addressLine1: "",
    addressLine2: "",
    city:         "",
    state:        "Maharashtra",
    pincode:      "",
  });

  // Derived totals
  const availableItems = (wardrobe ?? []).filter(
    (i) => i.product?.status === "available"
  );
  const subtotal = availableItems.reduce((sum, item) => {
    return sum + (item.product?.sellingPrice ?? 0) + (item.design?.totalAccessoryCost ?? 0);
  }, 0);
  const shippingCost = 100;
  const total        = subtotal + shippingCost;

  function handleAddressChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setAddress((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function validateAddress(): string | null {
    if (!address.name.trim())         return "Please enter your name.";
    if (!address.phone.match(/^\d{10}$/)) return "Enter a valid 10-digit phone number.";
    if (!address.addressLine1.trim()) return "Please enter your address.";
    if (!address.city.trim())         return "Please enter your city.";
    if (!address.pincode.match(/^\d{6}$/)) return "Enter a valid 6-digit pincode.";
    return null;
  }

  async function handlePayNow() {
    const validationError = validateAddress();
    if (validationError) { toast.error(validationError); return; }
    if (!userId)          { toast.error("Please sign in."); return; }
    if (availableItems.length === 0) { toast.error("Your wardrobe is empty."); return; }

    setIsPaying(true);

    try {
      // Load Razorpay script (lazy-loaded — not in <head>)
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Could not load payment gateway. Check your connection.");

      // Create order on Razorpay's servers
      const orderData = await createRazorpayOrder({
        amountInPaise: total * 100,   // Razorpay uses paise
        receipt:       `order_${Date.now()}`,
      });

      // Open Razorpay checkout modal
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         orderData.keyId,
          amount:      orderData.amount as number,
          currency:    "INR",
          name:        "BLAX SHEEP",
          description: `${availableItems.length} item${availableItems.length > 1 ? "s" : ""}`,
          order_id:    orderData.razorpayOrderId,
          prefill: {
            name:    address.name,
            contact: address.phone,
            email:   user?.primaryEmailAddress?.emailAddress ?? "",
          },
          theme: { color: "#F7FD04" },
          handler: async (response: RazorpayResponse) => {
            try {
              // Verify signature + finalise order atomically
              const result = await verifyAndFinalise({
                razorpayOrderId:   response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                userId,
                shippingAddress: {
                  name:         address.name,
                  phone:        address.phone,
                  addressLine1: address.addressLine1,
                  addressLine2: address.addressLine2 || undefined,
                  city:         address.city,
                  state:        address.state,
                  pincode:      address.pincode,
                },
              });

              toast.success("Payment successful!");
              router.push(`/orders/${result.orderId}`);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
        });

        rzp.on("payment.failed", () => {
          reject(new Error("Payment failed. Please try again."));
        });

        rzp.open();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed.";
      if (msg.includes("ITEMS_SOLD")) {
        toast.error("Some items sold during checkout. Please review your wardrobe.");
        router.push("/wardrobe");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsPaying(false);
    }
  }

  if (!wardrobe) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse font-mono text-xs uppercase tracking-wider">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-32">
      <div className="container-app py-8 max-w-lg">
        <h1 className="section-heading mb-1">Checkout</h1>
        <div className="section-heading-divider" />

        {/* ── Order summary ── */}
        <section className="mb-8">
          <h2 className="font-mono font-black text-sm uppercase tracking-widest mb-4">
            Order Summary
          </h2>

          <div className="space-y-3 mb-4">
            {availableItems.map((item) => {
              const lineTotal =
                (item.product?.sellingPrice ?? 0) +
                (item.design?.totalAccessoryCost ?? 0);
              return (
                <div
                  key={item._id}
                  className="flex gap-3 border border-black p-2"
                >
                  <div className="w-14 h-20 relative shrink-0 bg-white-off border border-black">
                    {item.product?.primaryImage && (
                      <OptimisedImage
                        publicId={item.product.primaryImage.cloudinaryPublicId}
                        alt={item.product?.title ?? ""}
                        preset="thumb"
                        fill
                        objectFit="cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-bold uppercase truncate">
                      {item.product?.title}
                    </p>
                    <p className="font-mono text-2xs text-muted-foreground uppercase">
                      Size {item.product?.size}
                    </p>
                    {item.design && (
                      <p className="font-mono text-2xs mt-0.5 text-muted-foreground">
                        + {item.design.placements.length} accessories
                      </p>
                    )}
                    <p className="font-mono text-sm font-black mt-1">
                      {formatPrice(lineTotal)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border border-black p-3 space-y-2">
            <div className="flex justify-between font-mono text-xs uppercase">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-bold">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between font-mono text-xs uppercase">
              <span className="text-muted-foreground">Shipping (India Post)</span>
              <span className="font-bold">{formatPrice(shippingCost)}</span>
            </div>
            <div className="flex justify-between font-mono text-sm uppercase border-t border-black pt-2">
              <span className="font-black">Total</span>
              <span className="font-black">{formatPrice(total)}</span>
            </div>
          </div>
        </section>

        {/* ── Shipping address ── */}
        <section className="mb-8">
          <h2 className="font-mono font-black text-sm uppercase tracking-widest mb-4">
            Shipping Address
          </h2>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-2xs uppercase tracking-wider mb-1 font-bold">
                  Full Name
                </label>
                <input
                  name="name"
                  value={address.name}
                  onChange={handleAddressChange}
                  className="input-flat normal-case"
                  placeholder="Rohan Mehta"
                />
              </div>
              <div>
                <label className="block font-mono text-2xs uppercase tracking-wider mb-1 font-bold">
                  Phone
                </label>
                <input
                  name="phone"
                  value={address.phone}
                  onChange={handleAddressChange}
                  type="tel"
                  className="input-flat"
                  placeholder="9876543210"
                  maxLength={10}
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-2xs uppercase tracking-wider mb-1 font-bold">
                Address Line 1
              </label>
              <input
                name="addressLine1"
                value={address.addressLine1}
                onChange={handleAddressChange}
                className="input-flat normal-case"
                placeholder="42 Linking Road"
              />
            </div>

            <div>
              <label className="block font-mono text-2xs uppercase tracking-wider mb-1 font-bold">
                Address Line 2 (optional)
              </label>
              <input
                name="addressLine2"
                value={address.addressLine2}
                onChange={handleAddressChange}
                className="input-flat normal-case"
                placeholder="Flat no., Landmark"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-2xs uppercase tracking-wider mb-1 font-bold">
                  City
                </label>
                <input
                  name="city"
                  value={address.city}
                  onChange={handleAddressChange}
                  className="input-flat normal-case"
                  placeholder="Mumbai"
                />
              </div>
              <div>
                <label className="block font-mono text-2xs uppercase tracking-wider mb-1 font-bold">
                  Pincode
                </label>
                <input
                  name="pincode"
                  value={address.pincode}
                  onChange={handleAddressChange}
                  className="input-flat"
                  placeholder="400050"
                  maxLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-2xs uppercase tracking-wider mb-1 font-bold">
                State
              </label>
              <select
                name="state"
                value={address.state}
                onChange={handleAddressChange}
                className="input-flat"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-2xs uppercase tracking-wider mb-1 font-bold">
                Order Notes (optional)
              </label>
              <input
                name="notes"
                className="input-flat normal-case"
                placeholder="Special instructions..."
              />
            </div>
          </div>
        </section>
      </div>

      {/* ── Sticky Pay button ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black px-4 py-4">
        <div className="max-w-lg mx-auto">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handlePayNow}
            disabled={isPaying || availableItems.length === 0}
          >
            {isPaying
              ? "Processing payment..."
              : `Pay ${formatPrice(total)} →`}
          </Button>
          <p className="font-mono text-2xs text-muted-foreground text-center mt-2 uppercase tracking-wider">
            Secured by Razorpay · UPI · Cards · Net Banking
          </p>
        </div>
      </div>
    </main>
  );
}
