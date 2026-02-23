import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSubscriptionExpiring, sendAutoRenewLink } from "@/lib/email";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FARM_PRICE = 3;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.vrbot.me";

async function createPayPalOrder(farms: number, userId: string): Promise<string | null> {
  try {
    const res = await fetch(`${APP_URL}/api/billing/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ farms, userId }),
    });
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const results = { reminders: 0, autoRenew: 0, errors: 0 };

    // Send reminders for 3 and 7 days
    for (const days of [3, 7]) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      const dateStr = targetDate.toISOString().split("T")[0];

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("user_id, expires_at")
        .eq("status", "active")
        .gte("expires_at", `${dateStr}T00:00:00`)
        .lte("expires_at", `${dateStr}T23:59:59`);

      if (!subs || subs.length === 0) continue;

      const userIds = subs.map((s) => s.user_id);
      const { data: users } = await supabase.from("users").select("id, email").in("id", userIds);
      if (!users) continue;

      for (const user of users) {
        try {
          await sendSubscriptionExpiring(user.email, days);
          results.reminders++;
        } catch { results.errors++; }
      }
    }

    // Auto-renew for expiring in 1 day
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: expiringSubs } = await supabase
      .from("subscriptions")
      .select("user_id, farms_count, expires_at")
      .eq("status", "active")
      .gte("expires_at", `${tomorrowStr}T00:00:00`)
      .lte("expires_at", `${tomorrowStr}T23:59:59`);

    if (expiringSubs && expiringSubs.length > 0) {
      const userIds = expiringSubs.map((s) => s.user_id);
      const { data: users } = await supabase
        .from("users")
        .select("id, email, auto_renew")
        .in("id", userIds);

      if (users) {
        for (const user of users) {
          const sub = expiringSubs.find((s) => s.user_id === user.id);
          if (!sub) continue;
          const farms = sub.farms_count || 1;

          if (user.auto_renew) {
            // Create PayPal order and send direct link
            const payUrl = await createPayPalOrder(farms, user.id);
            if (payUrl) {
              await sendAutoRenewLink(user.email, farms, (farms * FARM_PRICE).toFixed(2), payUrl);
              results.autoRenew++;
            } else {
              await sendSubscriptionExpiring(user.email, 1);
              results.reminders++;
            }
          } else {
            await sendSubscriptionExpiring(user.email, 1);
            results.reminders++;
          }
        }
      }
    }

    console.log(`[Cron] Results: ${results.reminders} reminders, ${results.autoRenew} auto-renew, ${results.errors} errors`);
    return NextResponse.json({ ok: true, ...results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Cron] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
