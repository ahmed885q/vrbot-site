export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

function getDB() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const db = getDB();
    const now = new Date().toISOString();

    // 1. Find expired trials that haven't been notified yet
    const { data: expiredTrials } = await db
      .from("cloud_farms")
      .select("id, user_id, farm_name, trial_ends_at, status")
      .eq("is_trial", true)
      .lt("trial_ends_at", now)
      .neq("status", "deleted")
      .neq("status", "suspended");

    if (!expiredTrials?.length) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    let notified = 0;
    let suspended = 0;

    for (const farm of expiredTrials) {
      const trialEnd = new Date(farm.trial_ends_at);
      const gracePeriodEnd = new Date(trialEnd.getTime() + 24 * 60 * 60 * 1000); // +24h
      const isPastGrace = new Date() > gracePeriodEnd;

      if (isPastGrace) {
        // Suspend the farm
        await db
          .from("cloud_farms")
          .update({ status: "suspended" })
          .eq("id", farm.id);

        // Notify user
        await db.from("farm_alerts").insert({
          user_id: farm.user_id,
          farm_id: farm.id,
          type: "trial_suspended",
          severity: "error",
          message: `تم إيقاف مزرعة ${farm.farm_name} لانتهاء التجربة المجانية. اشترك لإعادة التفعيل.`,
        }).catch(() => {});

        suspended++;
      } else {
        // Send warning notification
        await db.from("farm_alerts").insert({
          user_id: farm.user_id,
          farm_id: farm.id,
          type: "trial_expiring",
          severity: "warning",
          message: `انتهت تجربتك المجانية. اشترك للاستمرار أو ستُوقف مزرعتك خلال 24 ساعة.`,
        }).catch(() => {});

        notified++;
      }
    }

    // 2. Send expiring-soon notifications (< 3 days left)
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: expiringSoon } = await db
      .from("cloud_farms")
      .select("id, user_id, farm_name, trial_ends_at")
      .eq("is_trial", true)
      .gt("trial_ends_at", now)
      .lt("trial_ends_at", threeDaysFromNow)
      .neq("status", "deleted")
      .neq("status", "suspended");

    let warned = 0;
    for (const farm of (expiringSoon || [])) {
      const daysLeft = Math.ceil((new Date(farm.trial_ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      await db.from("farm_alerts").insert({
        user_id: farm.user_id,
        farm_id: farm.id,
        type: "trial_warning",
        severity: "warning",
        message: `تجربتك المجانية تنتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}. اشترك الآن للاستمرار!`,
      }).catch(() => {});
      warned++;
    }

    return NextResponse.json({
      ok: true,
      processed: expiredTrials.length,
      notified,
      suspended,
      warned,
    });
  } catch (e: any) {
    console.error("[check-trials]", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
