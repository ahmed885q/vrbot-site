export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    let userId: string | null = null;

    // طريقة 1: Authorization header
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (token && token !== "undefined" && token !== "null") {
      const { data } = await service.auth.getUser(token);
      userId = data?.user?.id || null;
    }

    // طريقة 2: Cookies fallback
    if (!userId) {
      try {
        const cookieStore = cookies();
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
        );
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id || null;
      } catch {}
    }

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // جلب المزارع من Supabase
    const { data: farms } = await service
      .from("cloud_farms")
      .select("farm_name, status, game_account, server_id, last_heartbeat, created_at")
      .eq("user_id", userId)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });

    // جلب الحالة الحية من Hetzner
    const HETZNER = process.env.HETZNER_IP || "88.99.64.19";
    let hetznerFarms: Record<string, any> = {};

    try {
      const res = await fetch(`http://${HETZNER}:8888/api/farms/status`, {
        headers: { "X-API-Key": process.env.VRBOT_API_KEY || "" },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const d = await res.json();
        (d.farms || []).forEach((f: any) => {
          hetznerFarms[f.farm_id || f.name] = f;
        });
      }
    } catch {}

    // دمج البيانات
    const merged = (farms || []).map((f: any) => {
      const live = hetznerFarms[f.farm_name] || null;
      return {
        ...f,
        live_status:   live?.status || null,
        live_task:     live?.current_task || null,
        live_uptime:   live?.uptime || null,
        live_tasks_ok: live?.tasks_ok || 0,
        is_online:     live?.status === "running" || live?.status === "RUNNING",
      };
    });

    return NextResponse.json({ farms: merged, total: merged.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
