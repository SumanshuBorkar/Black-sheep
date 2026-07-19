"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Resend } from "resend";

/**
 * BLAX SHEEP — Email Actions via Resend
 */

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOrderConfirmation = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.runQuery(api.orders.getOrderById, {
      orderId: args.orderId,
    });

    if (!order) throw new Error("Order not found.");

    const itemsList = order.items
      .map(
        (item) =>
          `<tr>
            <td style="padding:8px;font-family:monospace;font-size:13px;border-bottom:1px solid #eee">
              ${item.productTitle} (${item.productSize})
              ${item.accessories.length > 0 ? `<br/><small>+ ${item.accessories.length} accessory items</small>` : ""}
            </td>
            <td style="padding:8px;font-family:monospace;font-size:13px;border-bottom:1px solid #eee;text-align:right">
              ₹${item.lineTotal.toLocaleString("en-IN")}
            </td>
          </tr>`
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#fff;font-family:monospace">
        <div style="max-width:560px;margin:0 auto;padding:32px 16px">

          <div style="background:#F7FD04;padding:16px;margin-bottom:24px">
            <h1 style="margin:0;font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em">
              BLAX SHEEP
            </h1>
          </div>

          <h2 style="font-size:16px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">
            Order Confirmed
          </h2>
          <p style="font-size:12px;color:#737373;margin-top:0;margin-bottom:24px;text-transform:uppercase">
            Order #${order._id.slice(-8).toUpperCase()}
          </p>

          <p style="font-size:13px;margin-bottom:24px">
            Hi ${order.shippingAddress.name}, your order is confirmed.
            We'll begin processing and notify you when it ships via India Post.
          </p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <thead>
              <tr style="background:#F8F8F8">
                <th style="padding:8px;font-size:11px;text-transform:uppercase;text-align:left">Item</th>
                <th style="padding:8px;font-size:11px;text-transform:uppercase;text-align:right">Price</th>
              </tr>
            </thead>
            <tbody>${itemsList}</tbody>
            <tfoot>
              <tr>
                <td style="padding:8px;font-size:12px;text-transform:uppercase">Shipping (India Post)</td>
                <td style="padding:8px;font-size:12px;text-align:right">₹${order.shippingCost}</td>
              </tr>
              <tr style="background:#F7FD04">
                <td style="padding:8px;font-size:14px;font-weight:900;text-transform:uppercase">Total</td>
                <td style="padding:8px;font-size:14px;font-weight:900;text-align:right">
                  ₹${order.totalAmount.toLocaleString("en-IN")}
                </td>
              </tr>
            </tfoot>
          </table>

          <div style="border:1px solid #0A0A0A;padding:16px;margin-bottom:24px">
            <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;color:#737373">
              Shipping to
            </p>
            <p style="margin:0;font-size:13px">
              ${order.shippingAddress.name}<br/>
              ${order.shippingAddress.addressLine1}
              ${order.shippingAddress.addressLine2 ? `<br/>${order.shippingAddress.addressLine2}` : ""}
              <br/>
              ${order.shippingAddress.city}, ${order.shippingAddress.state} — ${order.shippingAddress.pincode}
            </p>
          </div>

          <p style="font-size:11px;color:#737373;text-align:center;text-transform:uppercase;letter-spacing:0.05em">
            Questions? Reply to this email.<br/>
            No returns / refunds on vintage items.
          </p>
        </div>
      </body>
      </html>
    `;

    await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL ?? "orders@blaxsheep.com",
      to:      [order.shippingAddress.name],  // You'd fetch user email from Clerk here
      subject: `Order Confirmed — BLAX SHEEP #${order._id.slice(-8).toUpperCase()}`,
      html,
    });

    return { success: true };
  },
});
