export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import crypto from "crypto";

const ORCHESTRATOR_URL =
  process.env.ORCHESTRATOR_URL || "http://65.109.214.187:8080";
const WEBHOOK_SECRET =
  process.env.WEBHOOK_SECRET || "vrbot_webhook_secret_2026";
const LEMONSQUEEZY_WEBHOOK_SECRET =
  process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";

function verifySignature(payload: string, signature: string): boolean {
  if (!LEMONSQUEEZY_WEBHOOK_SECRET) return false;
  const hmac = crypto.createHmac("sha256", LEMONSQUEEZY_WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || "";
    if (!verifySignature(rawBody, signature)) {
      console.error("LemonSqueezy webhook: Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    const event = JSON.parse(rawBody);
    const eventName = event.meta?.event_name;
    const customData = event.meta?.custom_data || {};
    console.log("LemonSqueezy webhook: " + eventName, { order_id: event.data?.id, email: event.data?.attributes?.user_email });

    if (eventName === "order_created") {
      const attrs = event.data.attributes;
      const customerEmail = attrs.user_email;
      const customerName = attrs.user_name || attrs.first_name || "";
      const orderId = "ls_" + event.data.id;
      const farmCount = parseInt(customData.farm_count || "1", 10);
      const nifling = customData.nifling === "true";
      const building = customData.building === "true";
      const status = attrs.status;
      if (status !== "paid") {
        return NextResponse.json({ ok: true, skipped: true });
      }
      const service = supabaseService();
      await service.from("provision_logs").insert({ order_id: orderId, customer_email: customerEmail, customer_name: customerName, plan: "pro", farm_count: farmCount, nifling, status: "pending", payment_method: "lemonsqueezy", created_at: new Date().toISOString() });
      const res = await fetch(ORCHESTRATOR_URL + "/api/webhook/order", { method: "POST", headers: { "Content-Type": "application/json", "X-Webhook-Secret": WEBHOOK_SECRET }, body: JSON.stringify({ event: "order.created", customer_email: customerEmail, customer_name: customerName, plan: "pro", farm_count: farmCount, nifling, building, order_id: orderId }) });
      const result = await res.json();
      if (!res.ok) {
        await service.from("provision_logs").update({ status: "error", error_message: JSON.stringify(result) }).eq("order_id", orderId);
        return NextResponse.json({ error: "Orchestrator error", details: result }, { status: 500 });
      }
      await service.from("provision_logs").update({ status: "provisioning", job_id: result.job_id, customer_id: result.customer_id }).eq("order_id", orderId);
      return NextResponse.json({ ok: true, customer_id: result.customer_id, farm_count: farmCount });
    }

    if (eventName === "subscription_created") {
      const attrs = event.data.attributes;
      const customerEmail = attrs.user_email;
      const subscriptionId = "ls_sub_" + event.data.id;
      const farmCount = parseInt(customData.farm_count || "1", 10);
      const service = supabaseService();
      await service.from("provision_logs").insert({ order_id: subscriptionId, customer_email: customerEmail, customer_name: attrs.user_name || "", plan: "pro", farm_count: farmCount, nifling: customData.nifling === "true", status: "pending", payment_method: "lemonsqueezy_subscription", created_at: new Date().toISOString() });
      const res = await fetch(ORCHESTRATOR_URL + "/api/webhook/order", { method: "POST", headers: { "Content-Type": "application/json", "X-Webhook-Secret": WEBHOOK_SECRET }, body: JSON.stringify({ event: "order.created", customer_email: customerEmail, customer_name: attrs.user_name || "", plan: "pro", farm_count: farmCount, nifling: customData.nifling === "true", building: customData.building === "true", order_id: subscriptionId }) });
      const result = await res.json();
      if (res.ok) { await service.from("provision_logs").update({ status: "provisioning", job_id: result.job_id, customer_id: result.customer_id }).eq("order_id", subscriptionId); }
      return NextResponse.json({ ok: true });
    }

    if (eventName === "subscription_payment_success") { return NextResponse.json({ ok: true }); }
    if (eventName === "subscription_cancelled") { return NextResponse.json({ ok: true }); }
    if (eventName === "order_refunded") {
      const orderId = "ls_" + event.data.id;
      const service = supabaseService();
      await service.from("provision_logs").update({ status: "refunded" }).eq("order_id", orderId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("LemonSqueezy webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
