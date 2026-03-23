export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow up to 120s for task sequences
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getTaskSequence } from "@/lib/task-sequences";
import { resolveFarmNum } from "@/lib/farm-mapper";

const HETZNER_BASE = () => `https://${process.env.HETZNER_IP || "cloud.vrbot.me"}`;
const API_KEY = () => process.env.VRBOT_API_KEY || "vrbot_admin_2026";

// Reduced delay between ADB commands — game processes taps quickly,
// long delays were causing Vercel function timeout
const STEP_DELAY_MS = 600;

async function getUser(req: Request) {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (token && token !== "undefined") {
    const { data } = await service.auth.getUser(token);
    if (data?.user) return { user: data.user, service };
  }
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data } = await supabase.auth.getUser();
    if (data?.user) return { user: data.user, service };
  } catch {}
  return null;
}

// ── Execute a single ADB command on Hetzner ──────────────────────
async function sendAdbCommand(
  farmId: string,
  command: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${HETZNER_BASE()}/api/farms/adb`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY() },
      body: JSON.stringify({ farm_id: farmId, command }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && (data.ok !== false), error: data.error };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

// ── Execute a full task sequence with minimal delays ─────────────
async function executeTaskSequence(
  farmId: string,
  taskName: string
): Promise<{ ok: boolean; steps: number; errors: string[] }> {
  const seq = getTaskSequence(taskName);
  if (!seq) return { ok: false, steps: 0, errors: [`Unknown task: ${taskName}`] };

  const errors: string[] = [];
  let stepsDone = 0;

  for (const step of seq.steps) {
    const result = await sendAdbCommand(farmId, step.cmd);
    stepsDone++;

    if (!result.ok) {
      errors.push(`Step ${stepsDone} (${step.desc || step.cmd}): ${result.error || "failed"}`);
    }

    // Use reduced fixed delay to prevent Vercel timeout
    // The ADB call itself takes ~200-400ms, so total per step ≈ 800-1000ms
    await new Promise(resolve => setTimeout(resolve, STEP_DELAY_MS));
  }

  return { ok: errors.length === 0, steps: stepsDone, errors };
}

// ── Resolve farm name → Hetzner farm_XXX id ──────────────────────
async function resolveTargetId(farm: any, farmId: string): Promise<string> {
  let num: number | null = null;
  if (farm.container_id) {
    const m = String(farm.container_id).match(/\d+/);
    if (m) num = parseInt(m[0]);
  }
  if (num === null && farm.adb_port) {
    num = Number(farm.adb_port) - 5554;
  }
  if (num === null) {
    num = (await resolveFarmNum(farmId)) ?? 1;
  }
  return `farm_${String(num).padStart(3, "0")}`;
}

export async function POST(req: Request) {
  try {
    const auth = await getUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, service } = auth;

    const body = await req.json().catch(() => ({}));
    const { farm_id, tasks, action } = body;

    if (!farm_id) return NextResponse.json({ error: "farm_id required" }, { status: 400 });

    const { data: farm } = await service
      .from("cloud_farms")
      .select("farm_name, container_id, adb_port, status")
      .eq("user_id", user.id)
      .eq("farm_name", farm_id)
      .single();

    if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });

    // ── Reset action ──
    if (action === "reset") {
      await service
        .from("cloud_farms")
        .update({ status: "stopped", updated_at: new Date().toISOString() })
        .eq("farm_name", farm_id)
        .eq("user_id", user.id);
      return NextResponse.json({ ok: true, message: `تم إعادة تعيين ${farm_id}` });
    }

    const target_id = await resolveTargetId(farm, farm_id);

    if (farm.status !== "running" && action !== "stop") {
      return NextResponse.json({
        ok: false,
        error: `المزرعة ${farm_id} غير مفعّلة (الحالة: ${farm.status}). فعّلها أولاً.`,
      }, { status: 400 });
    }

    // ── Stop action ──
    if (action === "stop") {
      await sendAdbCommand(target_id, "key:HOME");
      try {
        await service.from("farm_events").insert({
          user_id: user.id, farm_name: farm_id,
          event_type: "farm_stopped",
          message: `Stopped ${farm_id}`,
          tasks: [],
        });
      } catch {}
      return NextResponse.json({ ok: true, farm_id, action: "stop" });
    }

    // ── Execute tasks via ADB sequences ──
    const taskList: string[] = tasks || [];
    if (taskList.length === 0) {
      return NextResponse.json({ ok: false, error: "No tasks specified" }, { status: 400 });
    }

    console.log(`[RUN-TASKS] ${farm_id} → ${target_id} | Tasks: ${taskList.join(", ")}`);

    const results: Record<string, { ok: boolean; steps: number; errors: string[] }> = {};
    let allOk = true;

    for (const taskName of taskList) {
      const result = await executeTaskSequence(target_id, taskName);
      results[taskName] = result;
      if (!result.ok) allOk = false;
      console.log(
        `[RUN-TASKS] ${farm_id} | ${taskName}: ${result.ok ? "OK" : "FAIL"} (${result.steps} steps, ${result.errors.length} errors)`
      );
    }

    // ── Log event ──
    try {
      await service.from("farm_events").insert({
        user_id: user.id, farm_name: farm_id,
        event_type: "tasks_executed",
        message: `Executed ${taskList.length} tasks on ${farm_id} (${target_id}): ${allOk ? "all OK" : "some failed"}`,
        tasks: taskList,
      });
    } catch {}

    // ── Update heartbeat ──
    try {
      await service.from("cloud_farms")
        .update({ last_heartbeat: new Date().toISOString() })
        .eq("farm_name", farm_id)
        .eq("user_id", user.id);
    } catch {}

    return NextResponse.json({
      ok: allOk,
      farm_id,
      container_id: target_id,
      tasks_executed: taskList.length,
      results,
    });

  } catch (e: any) {
    console.error("[RUN-TASKS] Error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
