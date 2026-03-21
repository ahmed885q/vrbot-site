export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { runFarmTasks } from "@/lib/hetzner";

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
      .select("farm_name, container_id, status")
      .eq("user_id", user.id)
      .eq("farm_name", farm_id)
      .single();

    if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });

    if (action === "reset") {
      await service
        .from("cloud_farms")
        .update({ status: "stopped", updated_at: new Date().toISOString() })
        .eq("farm_name", farm_id)
        .eq("user_id", user.id);
      try {
        await service.from("farm_events").insert({
          user_id: user.id, farm_name: farm_id,
          event_type: "farm_reset",
          message: `Reset ${farm_id} from error → stopped`,
          tasks: [],
        });
      } catch {}
      return NextResponse.json({ ok: true, message: `تم إعادة تعيين ${farm_id} إلى stopped` });
    }

    // ── FIX: تأكد أن target_id دائماً بصيغة "farm_001" ──────────
    const raw = farm.container_id || "";
    const target_id = raw
      ? (raw.startsWith("farm_") ? raw : `farm_${raw}`)
      : farm_id;

    if (farm.status !== "running" && action !== "stop") {
      return NextResponse.json({
        ok: false,
        error: `المزرعة ${farm_id} غير مفعّلة (الحالة: ${farm.status}). فعّلها أولاً.`,
        farm_id,
        status: farm.status,
      }, { status: 400 });
    }

    const result = await runFarmTasks({
      container_id: target_id,
      tasks:        tasks || [],
      action,
    });

    if (!result.ok) {
      try {
        await service.from("farm_events").insert({
          user_id: user.id, farm_name: farm_id,
          event_type: "error",
          message: `Task failed on ${farm_id} (container: ${target_id}): ${result.error || "Hetzner error"}`,
          tasks: tasks || [],
        });
      } catch {}
      return NextResponse.json({
        ok: false,
        error: result.error || "فشل تشغيل المهام — السيرفر لم يستجب",
        farm_id,
        container_id: target_id,
      });
    }

    try {
      await service.from("farm_events").insert({
        user_id: user.id, farm_name: farm_id,
        event_type: action === "stop" ? "farm_stopped" : "farm_started",
        message: action === "stop"
          ? `Stopped ${farm_id} (container: ${target_id})`
          : `Running ${tasks?.length || 0} tasks on ${farm_id} (container: ${target_id})`,
        tasks: tasks || [],
      });
    } catch {}

    try {
      await service.from("cloud_farms")
        .update({ last_heartbeat: new Date().toISOString() })
        .eq("farm_name", farm_id)
        .eq("user_id", user.id);
    } catch {}

    return NextResponse.json({
      ok:           result.ok,
      farm_id,
      container_id: target_id,
      action:       action || "run_tasks",
      tasks:        tasks || [],
      hetzner:      result.result,
    });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
