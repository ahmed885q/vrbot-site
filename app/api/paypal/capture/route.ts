// app/api/paypal/capture/route.ts
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function getPayPalToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const secret   = process.env.PAYPAL_SECRET!;
  const base     = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

export async function POST(req: Request) {
  try {
    // Check if PayPal is enabled
    const enabled = process.env.PAYPAL_ENABLED === "true";
    if (!enabled) {
      return NextResponse.json(
        { error: "PayPal is disabled for now (launch later)." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { orderID, userID, plan, farms } = body;

    if (!orderID || !userID) {
      return NextResponse.json({ error: "orderID and userID required" }, { status: 400 });
    }

    const base  = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
    const token = await getPayPalToken();

    // Capture the order
    const captureRes = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    const captureData = await captureRes.json();

    if (!captureRes.ok || captureData.status !== "COMPLETED") {
      console.error("PayPal capture failed:", captureData);
      return NextResponse.json(
        { error: "Payment capture failed", details: captureData },
        { status: 400 }
      );
    }

    // Update subscription in Supabase
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const { error: dbError } = await service
      .from("subscriptions")
      .upsert({
        user_id: userID,
        plan: plan || "basic",
        farms_allowed: farms || 1,
        status: "active",
        paypal_order_id: orderID,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error("DB update failed:", dbError);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      orderID,
      status: captureData.status,
      expires_at: expiresAt.toISOString(),
    });

  } catch (e: any) {
    console.error("PayPal capture error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
