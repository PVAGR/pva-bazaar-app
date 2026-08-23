/**
 * Stripe Webhook handler (Supabase Edge Function).
 * Use when backend is Supabase: point Stripe webhook to this function's URL.
 * On checkout.session.completed: insert physical_fulfillment row and log.
 * Email/certificate can be sent via Resend or another service called from here.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    return new Response(`Webhook signature verification failed: ${e.message}`, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.client_reference_id || session.metadata?.orderId;
    const itemId = session.metadata?.itemId || "";
    const itemName = session.metadata?.itemName || "";
    const email = session.customer_details?.email || "";
    const name = session.customer_details?.name || "";

    if (orderId) {
      try {
        await supabase.from("physical_fulfillment").insert({
          order_id: orderId,
          item_id: itemId,
          item_name: itemName,
          customer_email: email,
          customer_name: name,
          status: "pending",
        });
      } catch (err) {
        console.error("physical_fulfillment insert error:", err);
        return new Response(JSON.stringify({ error: "Fulfillment insert failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        await supabase.from("fulfillment_transaction_log").insert({
          event_id: event.id,
          order_id: orderId,
          action: "payment_completed",
          payload: { type: event.type },
          success: true,
        });
      } catch (e) {
        console.warn("Log insert warning:", e);
      }
    }
  }

  if (event.type === "checkout.session.async_payment_failed") {
    try {
      await supabase.from("fulfillment_transaction_log").insert({
        event_id: event.id,
        order_id: null,
        action: "payment_failed",
        payload: { type: event.type },
        success: false,
      });
    } catch (e) {
      console.warn("Log insert warning:", e);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
