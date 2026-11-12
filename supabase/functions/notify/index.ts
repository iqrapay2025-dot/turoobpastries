// Sends transactional emails.
// @ts-nocheck
//  { type: "order_received", public_token }   -> called by the site after place_order
//  { type: "fee_confirm",    order_id }       -> called by the admin dashboard (admin login required)
//  { type: "order_ready",     order_id }       -> pickup order is ready (admin login required)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, json } from "../_shared/cors.ts";
import {
  sendEmail,
  orderReceivedEmail,
  feeConfirmEmail,
  orderReadyEmail,
  teamAlertEmail,
} from "../_shared/email.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (body.type === "order_received") {
      const { data: o } = await db
        .from("orders")
        .select("*, order_items(*), customers(customer_code)")
        .eq("public_token", body.public_token)
        .single();
      if (!o) return json({ error: "Order not found" }, 404);

      // Anti-spam: only for brand-new orders.
      const ageMin = (Date.now() - new Date(o.created_at).getTime()) / 60000;
      if (ageMin > 15) return json({ error: "Too late" }, 400);

      await sendEmail({ to: o.customer_email, ...orderReceivedEmail(o, o.order_items) });
      const team = Deno.env.get("TEAM_EMAIL");
      if (team) await sendEmail({ to: team, ...teamAlertEmail(o, o.order_items, "new") });
      return json({ ok: true });
    }

    if (body.type === "fee_confirm") {
      // Verify the caller is a logged-in admin using THEIR token.
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
      );
      const { data: isAdmin } = await userClient.rpc("is_admin");
      if (!isAdmin) return json({ error: "Not authorised" }, 403);

      const { data: o } = await db
        .from("orders")
        .select("*, order_items(*), customers(customer_code)")
        .eq("id", body.order_id)
        .single();
      if (!o || o.fee_status !== "confirmed") {
        return json({ error: "Set the delivery fee first" }, 400);
      }
      await sendEmail({ to: o.customer_email, ...feeConfirmEmail(o, o.order_items) });
      return json({ ok: true });
    }

    if (body.type === "order_ready") {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
      );
      const { data: isAdmin } = await userClient.rpc("is_admin");
      if (!isAdmin) return json({ error: "Not authorised" }, 403);

      const { data: o } = await db
        .from("orders")
        .select("*, order_items(*), customers(customer_code)")
        .eq("id", body.order_id)
        .single();
      if (!o || o.fulfilment !== "pickup" || o.order_status !== "ready_for_pickup") {
        return json({ error: "Order is not ready for pickup" }, 400);
      }
      await sendEmail({ to: o.customer_email, ...orderReadyEmail(o, o.order_items) });
      return json({ ok: true });
    }

    return json({ error: "Unknown type" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong" }, 500);
  }
});