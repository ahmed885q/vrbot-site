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

    // جلب المزرعة مع الـ container_id
    const { data: farm } = await service
      .from("cloud_farms")
      .select("farm_name, container_id, status")
      .eq("user_id", user.id)
      .eq("farm_name", farm_id)
      .single();

    if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });

    // استخدم container_id إذا موجود، وإلا farm_name
    const target_id = farm.container_id || farm_id;

    const result = await runFarmTasks({
      container_id: target_id,
      tasks:        tasks || [],
      action,
    });

    // سجّل الحدث
    await service.from("farm_events").insert({
      user_id:    user.id,
      farm_name:  farm_id,
      event_type: action === "stop" ? "farm_stopped" : "farm_started",
      message:    action === "stop"
        ? `⏹ إيقاف ${farm_id} (container: ${target_id})`
        : `▶ تشغيل ${tasks?.length || 0} مهمة على ${farm_id} (container: ${target_id})`,
      tasks: tasks || [],
    }).catch(() => {});

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
