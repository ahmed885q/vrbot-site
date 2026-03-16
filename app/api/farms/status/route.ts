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

    // طريقة 1: Bearer token
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (token && token !== "undefined" && token !== "null") {
      const { data } = await service.auth.getUser(token);
      userId = data?.user?.id || null;
    }

    // طريقة 2: Cookies (الأهم للمتصفح)
    if (!userId) {
      try {
        const cookieStore = cookies();
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll: () => cookieStore.getAll(),
              setAll: () => {},
            },
          }
        );
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id || null;
      } catch {}
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // جلب المزارع من Supabase
    const { data: farms, error } = await service
      .from("cloud_farms")
      .select("farm_name, status, game_account, server_id, last_heartbeat, created_at")
      .eq("user_id", userId)
      .neq("status", "deleted")
      .order("farm_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
          const id = f.farm_id || f.name || f.id;
          if (id) hetznerFarms[id] = f;
        });
      }
    } catch {}

    // دمج البيانات
    const merged = (farms || []).map((f: any) => {
      const live = hetznerFarms[f.farm_name] || null;
      return {
        id:           f.farm_name,
        farm_name:    f.farm_name,
        name:         f.farm_name,
        status:       live?.status || f.status || "offline",
        game_account: f.game_account || "",
        tasks_today:  live?.tasks_ok || 0,
        live_status:  live ? (live.status === "running" ? "online" : "idle") : f.status === "provisioning" ? "idle" : "offline",
        current_task: live?.current_task || null,
        is_online:    !!(live?.status === "running" || live?.status === "RUNNING"),
        server_id:    f.server_id,
        last_heartbeat: f.last_heartbeat,
      };
    });

    return NextResponse.json({
      farms: merged,
      total: merged.length,
      cloud_online: merged.some((f: any) => f.is_online),
    });
  } catch (e: any) {
    console.error("farms/status error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
