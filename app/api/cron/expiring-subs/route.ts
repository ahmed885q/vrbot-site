import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSubscriptionExpiring } from "@/lib/email";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const results = { sent: 0, errors: 0 };

    // Check for subs expiring in 1, 3, and 7 days
    for (const days of [1, 3, 7]) {
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

      // Get user emails
      const userIds = subs.map((s) => s.user_id);
      const { data: users } = await supabase
        .from("users")
        .select("id, email")
        .in("id", userIds);

      if (!users) continue;

      for (const user of users) {
        try {
          await sendSubscriptionExpiring(user.email, days);
          results.sent++;
        } catch {
          results.errors++;
        }
      }
    }

    console.log(`[Cron] Expiring subs: ${results.sent} sent, ${results.errors} errors`);
    return NextResponse.json({ ok: true, ...results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Cron] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
