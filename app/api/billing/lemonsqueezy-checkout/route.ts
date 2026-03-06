export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY || "";
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || "";
const LEMONSQUEEZY_VARIANT_ID = process.env.LEMONSQUEEZY_VARIANT_ID || "";
const FARM_PRICE = 3.0;

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please login first" }, { status: 401 });
    }
    if (!LEMONSQUEEZY_API_KEY || !LEMONSQUEEZY_STORE_ID) {
      return NextResponse.json({ error: "Lemon Squeezy not configured" }, { status: 500 });
    }
    const body = await req.json();
    const { farms = 1 } = body;
    if (farms < 1 || farms > 500) {
      return NextResponse.json({ error: "Invalid farm count" }, { status: 400 });
    }
    const totalPrice = farms * FARM_PRICE * 100;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.vrbot.me";

    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: "Bearer " + LEMONSQUEEZY_API_KEY,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: user.email,
              name: user.user_metadata?.full_name || "",
              custom: { farm_count: String(farms), user_id: user.id, nifling: "false", building: "false" },
            },
            checkout_options: { embed: false, media: false, button_color: "#7c3aed" },
            product_options: {
              name: "VRBOT - " + farms + " Farm License",
              description: farms + " farm(s) automated 24/7 - Viking Rise Bot",
              redirect_url: appUrl + "/billing?checkout=success&farms=" + farms,
            },
            ...(LEMONSQUEEZY_VARIANT_ID ? {} : { custom_price: totalPrice }),
          },
          relationships: {
            store: { data: { type: "stores", id: LEMONSQUEEZY_STORE_ID } },
            variant: { data: { type: "variants", id: LEMONSQUEEZY_VARIANT_ID } },
          },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("LemonSqueezy checkout error:", errText);
      return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
    }
    const checkoutData = await response.json();
    const checkoutUrl = checkoutData.data?.attributes?.url;
    if (!checkoutUrl) {
      return NextResponse.json({ error: "No checkout URL returned" }, { status: 500 });
    }
    return NextResponse.json({ url: checkoutUrl, checkout_id: checkoutData.data.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("LemonSqueezy checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
