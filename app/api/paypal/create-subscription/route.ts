export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const PAYPAL_BASE = "https://api-m.paypal.com";

async function getPayPalToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("PayPal auth failed: " + JSON.stringify(data));
  return data.access_token;
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const farmCount  = Math.max(1, parseInt(body.farm_count || "1"));
    const totalPrice = (farmCount * 3.00).toFixed(2);

    const token = await getPayPalToken();

    // إنشاء product إذا لم يكن موجوداً
    await fetch(`${PAYPAL_BASE}/v1/catalogs/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "PayPal-Request-Id": "vrbot-product-001",
      },
      body: JSON.stringify({
        id: "VRBOT_FARMS",
        name: "VRBOT Cloud Farms",
        description: "Automated Viking Rise farming service",
        type: "SERVICE",
        category: "SOFTWARE",
      }),
    });
    // لا تتوقف إذا فشل (قد يكون موجوداً)

    // إنشاء Plan شهري
    const planRes = await fetch(`${PAYPAL_BASE}/v1/billing/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        product_id: "VRBOT_FARMS",
        name: `VRBOT — ${farmCount} Farm${farmCount > 1 ? "s" : ""} / Month`,
        description: `${farmCount} automated Viking Rise farm${farmCount > 1 ? "s" : ""} at $3/month each`,
        status: "ACTIVE",
        billing_cycles: [{
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: totalPrice, currency_code: "USD" },
          },
        }],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: { value: "0", currency_code: "USD" },
          setup_fee_failure_action: "CONTINUE",
          payment_failure_threshold: 3,
        },
      }),
    });

    const plan = await planRes.json();
    if (!plan.id) {
      console.error("Plan creation failed:", plan);
      return NextResponse.json({ error: "Failed to create plan", details: plan }, { status: 500 });
    }

    // إنشاء Subscription
    const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "PayPal-Request-Id": `vrbot-${session.user.id}-${Date.now()}`,
      },
      body: JSON.stringify({
        plan_id: plan.id,
        custom_id: `${session.user.id}|${farmCount}`,
        application_context: {
          brand_name: "VRBOT",
          locale: "ar-QA",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          return_url: "https://www.vrbot.me/billing/success",
          cancel_url: "https://www.vrbot.me/billing",
        },
      }),
    });

    const sub = await subRes.json();
    const approveLink = sub.links?.find((l: any) => l.rel === "approve")?.href;

    if (!approveLink) {
      console.error("No approve link:", sub);
      return NextResponse.json({ error: "No approval link", details: sub }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      subscription_id: sub.id,
      approve_url: approveLink,
      farm_count: farmCount,
      price: totalPrice,
    });
  } catch (e: any) {
    console.error("create-subscription error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
