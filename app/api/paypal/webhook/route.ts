export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getPayPalAccessToken, getPayPalBaseUrl } from "@/lib/paypal";
import { createClient } from "@supabase/supabase-js";

function getDB() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

async function verifyWebhookSignature(req: Request, body: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) { console.error("Missing PAYPAL_WEBHOOK_ID"); return false; }
  try {
    const accessToken = await getPayPalAccessToken();
    const base = getPayPalBaseUrl();
    const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        auth_algo: req.headers.get("paypal-auth-algo") || "",
        cert_url: req.headers.get("paypal-cert-url") || "",
        transmission_id: req.headers.get("paypal-transmission-id") || "",
        transmission_sig: req.headers.get("paypal-transmission-sig") || "",
        transmission_time: req.headers.get("paypal-transmission-time") || "",
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });
    const data = await res.json();
    return data.verification_status === "SUCCESS";
  } catch (e) { console.error("Webhook verify error:", e); return false; }
}

export async function POST(req: Request) {
  const body = await req.text();
  const verified = await verifyWebhookSignature(req, body);
  if (!verified) {
    console.error("Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const eventType = event.event_type;
  const resource = event.resource || {};
  const db = getDB();

  console.log(`[PayPal Webhook] ${eventType}`, resource.id);

  switch (eventType) {
    case "PAYMENT.CAPTURE.COMPLETED": {
      const captureId = resource.id;
      const orderId = resource.supplementary_data?.related_ids?.order_id || null;
      const amount = resource.amount?.value || "0";
      await db.from("payment_logs").update({ status: "confirmed", transaction_id: captureId }).eq("paypal_order_id", orderId);
      console.log(`[Webhook] Payment confirmed: ${captureId}, order: ${orderId}, amount: $${amount}`);
      break;
    }
    case "PAYMENT.CAPTURE.DENIED": {
      const orderId = resource.supplementary_data?.related_ids?.order_id || null;
      if (orderId) {
        const { data: log } = await db.from("payment_logs").select("user_id, farms_purchased").eq("paypal_order_id", orderId).single();
        if (log) {
          await db.from("payment_logs").update({ status: "denied" }).eq("paypal_order_id", orderId);
          await db.rpc("refund_token", { p_user_id: log.user_id });
          console.log(`[Webhook] Payment denied, tokens refunded for user: ${log.user_id}`);
        }
      }
      break;
    }
    case "PAYMENT.CAPTURE.REFUNDED": {
      const parentId = resource.links?.find((l: any) => l.rel === "up")?.href?.split("/").pop();
      if (parentId) {
        const { data: log } = await db.from("payment_logs").select("user_id, farms_purchased").eq("transaction_id", parentId).single();
        if (log) {
          await db.from("payment_logs").update({ status: "refunded" }).eq("transaction_id", parentId);
          await db.rpc("refund_token", { p_user_id: log.user_id });
          console.log(`[Webhook] Refund processed, tokens refunded for user: ${log.user_id}`);
        }
      }
      break;
    }
    case "CUSTOMER.DISPUTE.CREATED": {
      const disputedTxn = resource.disputed_transactions?.[0]?.seller_transaction_id;
      if (disputedTxn) {
        await db.from("payment_logs").update({ status: "disputed" }).eq("transaction_id", disputedTxn);
        console.log(`[Webhook] Dispute created for transaction: ${disputedTxn}`);
      }
      break;
    }
    default:
      console.log(`[Webhook] Unhandled event: ${eventType}`);
  }

  return NextResponse.json({ received: true, event_type: eventType });
}
