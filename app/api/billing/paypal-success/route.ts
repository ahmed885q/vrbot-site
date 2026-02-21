export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getPayPalAccessToken } from "@/lib/paypal";
import { supabaseService } from "@/lib/supabase/server";

const PAYPAL_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.vrbot.me";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token"); // PayPal order ID
    const farms = parseInt(searchParams.get("farms") || "1");
    const userId = searchParams.get("user_id") || "";

    if (!token) {
      return NextResponse.redirect(`${APP_URL}/billing?error=missing_token`);
    }

    // Capture the payment
    const accessToken = await getPayPalAccessToken();
    const captureRes = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${token}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!captureRes.ok) {
      const errText = await captureRes.text();
      console.error("PayPal capture error:", errText);
      return NextResponse.redirect(`${APP_URL}/billing?error=payment_failed`);
    }

    const captureData = await captureRes.json();
    const paymentStatus = captureData.status;

    if (paymentStatus === "COMPLETED") {
      const transactionId =
        captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;

      // --- ADD TOKENS ---
      if (userId) {
        try {
          const service = supabaseService();
          const { data, error } = await service.rpc("add_paid_tokens", {
            p_user_id: userId,
            p_count: farms,
          });

          if (error) {
            console.error("Token add error:", error.message);
          } else {
            console.log(
              `Tokens added: ${farms} for user ${userId}`,
              data
            );
          }

          // Log the payment
          await service.from("payment_logs").insert({
            user_id: userId,
            paypal_order_id: token,
            transaction_id: transactionId,
            farms_purchased: farms,
            amount: farms * 2,
            status: "completed",
          }).catch(() => {});
        } catch (e) {
          console.error("Token grant error:", e);
        }
      }

      return NextResponse.redirect(
        `${APP_URL}/billing?checkout=success&farms=${farms}&txn=${transactionId || token}`
      );
    } else {
      return NextResponse.redirect(
        `${APP_URL}/billing?error=payment_incomplete&status=${paymentStatus}`
      );
    }
  } catch (err) {
    console.error("PayPal success handler error:", err);
    return NextResponse.redirect(`${APP_URL}/billing?error=unknown`);
  }
}
