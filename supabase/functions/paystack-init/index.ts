// Starts a Paystack payment for an order. Body: { public_token: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { public_token } = await req.json();
    if (!public_token) return json({ error: "Missing token" }, 400);

    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
    if (!secret || !siteUrl) {
      console.error("PAYSTACK_SECRET_KEY or SITE_URL is not set");
      return json({ error: "Payments are not configured yet" }, 500);
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error } = await db
      .from("orders")
      .select("*")
      .eq("public_token", public_token)
      .single();
    if (error || !order) return json({ error: "Order not found" }, 404);

    if (order.payment_status === "paid") return json({ error: "Already paid" }, 400);
    if (order.order_status === "cancelled") return json({ error: "Order cancelled" }, 400);
    if (order.fulfilment === "delivery" && order.fee_status !== "accepted") {
      return json({ error: "Delivery fee has not been accepted yet" }, 400);
    }

    // New reference each attempt (a Paystack reference can only be used once).
    const reference = `${order.order_number}-${Date.now()}`;
    await db.from("orders").update({ paystack_reference: reference }).eq("id", order.id);

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: order.customer_email,
        amount: order.total * 100, // naira -> kobo
        currency: "NGN",
        reference,
        // The site uses hash routes, so the return link must be /#/confirmation?token=...
        callback_url: `${siteUrl}/#/confirmation?token=${order.public_token}`,
        metadata: { order_number: order.order_number, customer: order.customer_name },
      }),
    });
    const out = await res.json();
    if (!out.status) return json({ error: out.message ?? "Paystack error" }, 502);

    return json({ authorization_url: out.data.authorization_url, reference });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong" }, 500);
  }
});
