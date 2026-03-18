/**
 * app/api/cron/run-tasks/route.ts
 * Vercel Cron Job — runs automatically every 6 hours
 * Sends Gather Resources + Mail Rewards to all active farms
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const HETZNER = process.env.HETZNER_IP || "88.99.64.19";
const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";
const SECRET = process.env.CRON_SECRET || "vrbot_cron_2026";

const AUTO_TASKS = ["Gather Resources", "Mail Rewards"];

export async function GET(req: Request) {
  // Auth check — Vercel sends Bearer token for cron jobs
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // 1. Get active farms from Hetzner
    const statusRes = await fetch(`http://${HETZNER}:8888/api/farms/status`, {
      headers: { "X-API-Key": API_KEY },
      signal: AbortSignal.timeout(10000),
    });

    if (!statusRes.ok) {
      return NextResponse.json(
        { error: "Hetzner unreachable", status: statusRes.status },
        { status: 503 }
      );
    }

    const statusData = await statusRes.json();
    const activeFarms: any[] = (statusData.farms || []).filter(
      (f: any) => f.game_pid
    );

    if (activeFarms.length === 0) {
      return NextResponse.json({ ok: true, message: "No active farms", farms: 0 });
    }

    // 2. Send tasks in parallel
    const results = await Promise.allSettled(
      activeFarms.map(async (farm: any) => {
        const farmId = farm.farm_id || farm.farm_name;
        const res = await fetch(`http://${HETZNER}:8888/api/farms/command`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
          },
          body: JSON.stringify({
            farm_id: farmId,
            command: `run_tasks:${AUTO_TASKS.join(",")}`,
          }),
          signal: AbortSignal.timeout(15000),
        });
        const data = await res.json().catch(() => ({}));
        return { farm_id: farmId, ok: res.ok, result: data };
      })
    );

    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && (r as any).value?.ok
    ).length;
    const failed = results.length - succeeded;

    // 3. Log event in Supabase
    try {
      await service.from("farm_events").insert({
        farm_name: "cron_auto",
        event_type: "auto_tasks",
        message: `[CRON] Tasks sent to ${succeeded}/${activeFarms.length} farms (${failed} failed)`,
        tasks: AUTO_TASKS,
      });
    } catch {}

    console.log(`[CRON] ${succeeded} ok | ${failed} failed`);

    return NextResponse.json({
      ok: true,
      total_farms: activeFarms.length,
      succeeded,
      failed,
      tasks: AUTO_TASKS,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("[CRON] Error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
