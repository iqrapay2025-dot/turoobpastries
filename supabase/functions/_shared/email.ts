// Brevo transactional email helper + simple templates.
// @ts-nocheck
const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );

const naira = (n: number) => "₦" + Number(n).toLocaleString("en-NG");

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": Deno.env.get("BREVO_API_KEY")!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: Deno.env.get("SENDER_NAME") ?? "Turoob Pastries",
        email: Deno.env.get("SENDER_EMAIL")!,
      },
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
    }),
  });
  if (!res.ok) console.error("Brevo error", res.status, await res.text());
  return res.ok;
}

function wrap(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #eee;border-radius:16px;overflow:hidden">
  <div style="background:#D62828;color:#fff;padding:18px 24px;font-size:20px;font-weight:bold">Turoob Pastries</div>
  <div style="padding:24px;color:#111">
    <h2 style="margin-top:0">${title}</h2>${body}
  </div>
  <div style="background:#111;color:#FFC107;padding:12px 24px;font-size:12px">Fresh puff-puff, every Friday after Jumah.</div>
</div>`;
}

// deno-lint-ignore no-explicit-any
function itemsTable(items: any[]) {
  const rows = items
    .map(
      (i) =>
        `<tr><td>${esc(i.product_name)} x ${i.quantity}</td><td style="text-align:right">${naira(i.line_total)}</td></tr>`
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse">${rows}</table>`;
}

// deno-lint-ignore no-explicit-any
function summary(o: any, items: any[]) {
  const where =
    o.fulfilment === "pickup"
      ? `Pickup at ${esc(Deno.env.get("PICKUP_LOCATION") ?? "Central Mosque, University of Ilorin")}`
      : `Delivery to ${esc(o.delivery_address)}${o.delivery_slot ? ` (${esc(o.delivery_slot)})` : ""}`;
  return `<p><b>Order ${esc(o.order_number)}</b>${o.customers?.customer_code ? `<br>Customer ID: ${esc(o.customers.customer_code)}` : ""}<br>${where}<br>Batch date: ${esc(o.batch_date)}</p>
  ${itemsTable(items)}
  <p>Subtotal: ${naira(o.subtotal)}<br>Delivery: ${naira(o.delivery_fee)}<br><b>Total: ${naira(o.total)}</b></p>`;
}

const site = () => (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");

// deno-lint-ignore no-explicit-any
export function orderReceivedEmail(o: any, items: any[]) {
  const next =
    o.fulfilment === "delivery"
      ? `<p>Because this is a delivery order, we'll confirm your final delivery fee first and email you a link to accept it and pay.</p>`
      : `<p>Please complete your payment to confirm your order.</p>`;
  return {
    subject: `We received your order ${o.order_number}`,
    html: wrap(
      `Thanks, ${esc(o.customer_name)}!`,
      summary(o, items) +
        next +
        `<p style="background:#FFF4CC;padding:12px 16px;border-radius:12px">Your tracking code: <b style="font-size:18px;letter-spacing:2px">${esc(o.track_code)}</b><br><span style="font-size:12px">Keep it private. Use it with your phone number on the Track page.${o.fulfilment === "pickup" ? " For pickup, show your order number " + esc(o.order_number) + "." : ""}</span></p>`
    ),
  };
}

// deno-lint-ignore no-explicit-any
export function feeConfirmEmail(o: any, items: any[]) {
  // Clean path route: /fee?token=...
  const link = `${site()}/fee?token=${o.public_token}`;
  return {
    subject: `Confirm your delivery fee for ${o.order_number}`,
    html: wrap(
      "Your delivery fee is ready",
      `<p>Hi ${esc(o.customer_name)}, the delivery fee for <b>${esc(o.delivery_address)}</b> is <b>${naira(o.delivery_fee)}</b>.</p>` +
        summary(o, items) +
        `<p><a href="${link}" style="background:#D62828;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;display:inline-block">Accept and pay</a></p>`
    ),
  };
}

// deno-lint-ignore no-explicit-any
export function orderReadyEmail(o: any, items: any[]) {
  const place = esc(Deno.env.get("PICKUP_LOCATION") ?? "Central Mosque, University of Ilorin");
  return {
    subject: `Your order ${o.order_number} is ready for pickup`,
    html: wrap(
      "Come and get your order!",
      `<p>Hi ${esc(o.customer_name)}, your order <b>${esc(o.order_number)}</b> is ready for pickup at <b>${place}</b>.</p>` +
        `<p>Please show your order number when you arrive.</p>` +
        summary(o, items)
    ),
  };
}

// deno-lint-ignore no-explicit-any
export function paidEmail(o: any, items: any[]) {
  return {
    subject: `Payment received for ${o.order_number}`,
    html: wrap(
      "Payment received. Thank you!",
      `<p>Hi ${esc(o.customer_name)}, your payment was successful and your order is confirmed.</p>` +
        summary(o, items)
    ),
  };
}

// deno-lint-ignore no-explicit-any
export function teamAlertEmail(o: any, items: any[], kind: "new" | "paid") {
  return {
    subject:
      kind === "new"
        ? `New order ${o.order_number} (${o.fulfilment})`
        : `PAID: ${o.order_number} (${naira(o.total)})`,
    html: wrap(
      kind === "new" ? "New order" : "Order paid",
      `<p>${esc(o.customer_name)} · ${esc(o.customer_phone)} · ${esc(o.customer_email)}</p>${summary(o, items)}${o.notes ? `<p>Notes: ${esc(o.notes)}</p>` : ""}`
    ),
  };
}