// Paystack webhook. Marks orders paid ONLY after verifying signature + amount.
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { sendEmail, paidEmail, teamAlertEmail } from "../_shared/email.ts";

async function hmacSha512(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const raw = await req.text();
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) {
    console.error("PAYSTACK_SECRET_KEY is not set");
    return new Response("Server not configured", { status: 500 });
  }

  const expected = await hmacSha512(secret, raw);
  if (expected !== req.headers.get("x-paystack-signature")) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw);
  if (event.event !== "charge.success") return new Response("ignored", { status: 200 });

  const reference: string = event.data.reference;
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Idempotency: Paystack may retry. Skip if we've already logged this event.
  const { error: dupe } = await db
    .from("payment_events")
    .insert({ reference, event_type: event.event, payload: event });
  if (dupe) return new Response("duplicate", { status: 200 });

  // If we cannot finish, release the lock so Paystack's retry is processed again.
  const release = () =>
    db.from("payment_events").delete().eq("reference", reference).eq("event_type", event.event);

  try {
    // Never trust the webhook body alone: verify with Paystack.
    const vres = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    const v = await vres.json();
    if (!v.status || v.data.status !== "success") {
      await release();
      return new Response("not successful", { status: 500 });
    }

    // The order's saved reference changes on every payment attempt, so if this
    // reference is an older attempt, fall back to the order number Paystack echoes back.
    let { data: order } = await db
      .from("orders")
      .select("*, order_items(*), customers(customer_code)")
      .eq("paystack_reference", reference)
      .maybeSingle();
    if (!order && v.data.metadata?.order_number) {
      ({ data: order } = await db
        .from("orders")
        .select("*, order_items(*), customers(customer_code)")
        .eq("order_number", v.data.metadata.order_number)
        .maybeSingle());
    }
    if (!order) {
      await release();
      return new Response("order not found", { status: 500 });
    }

    if (v.data.amount !== order.total * 100) {
      console.error("Amount mismatch", reference, v.data.amount, order.total);
      await db.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
      return new Response("amount mismatch", { status: 200 });
    }

    // Remember Paystack's own customer code against our customer ID.
    const pcode = v.data.customer?.customer_code;
    if (pcode && order.customer_id) {
      await db.from("customers").update({ paystack_customer_code: pcode })
        .eq("id", order.customer_id).is("paystack_customer_code", null);
    }
    const metaCode = v.data.metadata?.customer_code;
    if (metaCode && order.customer_id) {
      const { data: c } = await db.from("customers").select("customer_code").eq("id", order.customer_id).maybeSingle();
      if (c && c.customer_code !== metaCode) console.error("Customer ID mismatch", reference, metaCode, c.customer_code);
    }

    if (order.payment_status !== "paid") {
      const { error: upErr } = await db
        .from("orders")
        .update({ payment_status: "paid", paid_at: new Date().toISOString() })
        .eq("id", order.id);
      if (upErr) {
        console.error("Could not mark order paid", upErr);
        await release();
        return new Response("update failed", { status: 500 });
      }

      if (order.order_status === "cancelled") {
        const team = Deno.env.get("TEAM_EMAIL");
        if (team) {
          await sendEmail({
            to: team,
            subject: `REFUND NEEDED: ${order.order_number} was cancelled but paid`,
            html: `<p>${order.customer_name} (${order.customer_phone}) paid ₦${order.total} for ${order.order_number}, which you had cancelled. Please refund them in Paystack.</p>`,
          });
        }
      }

      const customer = paidEmail(order, order.order_items);
      await sendEmail({ to: order.customer_email, ...customer });
      const team = Deno.env.get("TEAM_EMAIL");
      if (team) await sendEmail({ to: team, ...teamAlertEmail(order, order.order_items, "paid") });
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error(e);
    await release();
    return new Response("error", { status: 500 });
  }
});