/**
 * app/api/cron/run-tasks/route.ts
 * Vercel Cron Job — runs every 6 hours
 * Sequential execution: checks last_heartbeat per farm (5.5h cooldown)
 * Only runs farms that are due, one at a time
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for sequential processing
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const HETZNER = process.env.HETZNER_IP || "88.99.64.19";
const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";
const SECRET = process.env.CRON_SECRET || "vrbot_cron_2026";

const AUTO_TASKS = ["Gather Resources", "Mail Rewards"];
const COOLDOWN_MS = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds

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
    const statusRes = await fetch(`https://${HETZNER}/api/farms/status`, {
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

    // 2. Get last_heartbeat for all farms from Supabase
    const farmIds = activeFarms.map((f: any) => f.farm_id || f.farm_name);
    const { data: dbFarms } = await service
      .from("cloud_farms")
      .select("farm_name, container_id, last_heartbeat")
      .in("farm_name", farmIds);

    // Build heartbeat map: farm_name → last_heartbeat
    const heartbeatMap: Record<string, string | null> = {};
    for (const f of dbFarms || []) {
      heartbeatMap[f.farm_name] = f.last_heartbeat;
      // Also map by container_id for flexible lookup
      if (f.container_id) {
        heartbeatMap[f.container_id] = f.last_heartbeat;
      }
    }

    // 3. Filter farms that are due (5.5h since last heartbeat)
    const now = Date.now();
    const dueFarms = activeFarms.filter((farm: any) => {
      const farmId = farm.farm_id || farm.farm_name;
      const lastHb = heartbeatMap[farmId] || heartbeatMap[`farm_${farmId}`];
      if (!lastHb) return true; // never run → due
      const elapsed = now - new Date(lastHb).getTime();
      return elapsed >= COOLDOWN_MS;
    });

    if (dueFarms.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No farms due (all ran within 5.5h)",
        total_active: activeFarms.length,
        due: 0,
      });
    }

    // 4. Run tasks SEQUENTIALLY — one farm at a time
    let succeeded = 0;
    let failed = 0;
    const results: any[] = [];

    for (const farm of dueFarms) {
      const farmId = farm.farm_id || farm.farm_name;
      try {
        const res = await fetch(`https://${HETZNER}/api/farms/command`, {
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

        if (res.ok) {
          succeeded++;
          // Update heartbeat so this farm won't run again for 5.5h
          try {
            await service
              .from("cloud_farms")
              .update({ last_heartbeat: new Date().toISOString() })
              .eq("farm_name", farmId);
          } catch {}
        } else {
          failed++;
        }

        results.push({ farm_id: farmId, ok: res.ok, detail: data });
      } catch (e: any) {
        failed++;
        results.push({ farm_id: farmId, ok: false, error: e?.message });
      }

      // Wait 2s between farms to avoid overwhelming Hetzner
      if (dueFarms.indexOf(farm) < dueFarms.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // 5. Log event in Supabase
    try {
      await service.from("farm_events").insert({
        farm_name: "cron_auto",
        event_type: "auto_tasks",
        message: `[CRON] Sequential: ${succeeded}/${dueFarms.length} ok (${activeFarms.length} active, ${dueFarms.length} due)`,
        tasks: AUTO_TASKS,
      });
    } catch {}

    console.log(`[CRON] ${succeeded}/${dueFarms.length} ok | ${failed} failed | ${activeFarms.length} total active`);

    return NextResponse.json({
      ok: true,
      total_active: activeFarms.length,
      due_farms: dueFarms.length,
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
