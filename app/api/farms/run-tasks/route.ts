export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { farm_id, tasks, action } = body;

    if (!farm_id) return NextResponse.json({ error: "farm_id required" }, { status: 400 });

    // تحقق من ملكية المزرعة
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: farm } = await service
      .from("cloud_farms")
      .select("farm_name, container_id, status")
      .eq("user_id", session.user.id)
      .eq("farm_name", farm_id)
      .single();

    if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });

    const HETZNER = process.env.HETZNER_IP || "88.99.64.19";
    const API_KEY = process.env.VRBOT_API_KEY || "";

    // أرسل الأمر لـ Hetzner
    let endpoint = "";
    let payload: any = { farm_id: farm.farm_name || farm_id };

    if (action === "stop") {
      endpoint = "/api/farms/stop";
    } else if (action === "start" || tasks?.length > 0) {
      endpoint = "/api/farms/command";
      payload.command = tasks?.length > 0
        ? `run_tasks:${tasks.join(",")}`
        : "start";
    } else {
      endpoint = "/api/farms/start";
    }

    const res = await fetch(`http://${HETZNER}:8888${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const result = await res.json().catch(() => ({ ok: res.ok }));

    return NextResponse.json({
      ok: res.ok,
      farm_id,
      action: action || "run_tasks",
      tasks: tasks || [],
      hetzner: result,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
