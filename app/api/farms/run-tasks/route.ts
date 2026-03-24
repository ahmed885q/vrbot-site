export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

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

    // تحقق من ملكية المزرعة
    const { data: farm } = await service
      .from("cloud_farms")
      .select("farm_name, container_id, adb_port")
      .eq("user_id", user.id)
      .eq("farm_name", farm_id)
      .single();

    if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });

    // احسب hetzner farm_id
    let hetzner_farm_id = farm_id;
    if (farm.container_id) {
      const m = String(farm.container_id).match(/\d+/);
      if (m) hetzner_farm_id = `farm_${String(m[0]).padStart(3, "0")}`;
    } else if (farm.adb_port) {
      const num = farm.adb_port - 5554;
      hetzner_farm_id = `farm_${String(num).padStart(3, "0")}`;
    }

    const HETZNER = process.env.HETZNER_IP || "cloud.vrbot.me";
    const API_KEY = process.env.VRBOT_API_KEY || "";

    // إذا action = stop
    if (action === "stop") {
      const res = await fetch(`https://${HETZNER}/api/farms/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify({ farm_id: hetzner_farm_id, command: "stop" }),
        signal: AbortSignal.timeout(8000),
      });
      const d = await res.json().catch(() => ({}));
      return NextResponse.json({ ok: res.ok, farm_id, hetzner_farm: hetzner_farm_id, ...d });
    }

    // أرسل المهام للـ orchestrator وارجع فوراً بدون انتظار
    const taskList = Array.isArray(tasks) && tasks.length > 0
      ? tasks
      : ["Gather Resources"];

    const command = `run_tasks:${taskList.join(",")}`;

    // أرسل الأمر بدون await على النتيجة الكاملة
    const res = await fetch(`https://${HETZNER}/api/farms/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({ farm_id: hetzner_farm_id, command }),
      signal: AbortSignal.timeout(8000), // 8 ثواني فقط للـ dispatch
    });

    const d = await res.json().catch(() => ({}));

    return NextResponse.json({
      ok: res.ok && (d.ok !== false),
      farm_id,
      hetzner_farm: hetzner_farm_id,
      tasks: taskList,
      status: d.status || "dispatched",
      error: d.error,
    });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}