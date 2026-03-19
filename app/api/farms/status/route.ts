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

    // Bearer token
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (token && token !== "undefined" && token !== "null") {
      const { data } = await service.auth.getUser(token);
      userId = data?.user?.id || null;
    }

    // Cookies
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

    // جلب كل مزارع المستخدم
    const { data: farms, error } = await service
      .from("cloud_farms")
      .select("farm_name, container_id, status, game_account, server_id, last_heartbeat, created_at")
      .eq("user_id", userId)
      .neq("status", "deleted")
      .order("farm_name", { ascending: true });

    if (error) {
      console.error("farms/status DB error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // جلب عدد المهام اليوم من farm_events
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    let taskCounts: Record<string, number> = {};
    try {
      const { data: events } = await service
        .from("farm_events")
        .select("farm_name, tasks")
        .eq("user_id", userId)
        .eq("event_type", "farm_started")
        .gte("created_at", todayStart.toISOString());
      for (const ev of events || []) {
        const count = Array.isArray(ev.tasks) ? ev.tasks.length : 0;
        taskCounts[ev.farm_name] = (taskCounts[ev.farm_name] || 0) + count;
      }
    } catch {}

    // جلب الحالة الحية من Hetzner
    const HETZNER = process.env.HETZNER_IP || "88.99.64.19";
    const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";
    let hetznerMap: Record<string, any> = {};

    try {
      const res = await fetch(`http://${HETZNER}:8888/api/farms/status`, {
        headers: { "X-API-Key": API_KEY },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const d = await res.json();
        (d.farms || []).forEach((f: any) => {
          // Map by all possible ID variants for flexible lookup
          const key = String(f.farm_id || f.name || f.id || "");
          if (key) {
            hetznerMap[key] = f;
            // Also store without "farm_" prefix and with it
            const numKey = key.replace("farm_", "");
            if (numKey !== key) hetznerMap[numKey] = f;
            if (!key.startsWith("farm_")) hetznerMap[`farm_${key}`] = f;
            // Zero-padded version: "1" → "001"
            if (/^\d+$/.test(numKey)) {
              hetznerMap[numKey.padStart(3, "0")] = f;
            }
          }
        });
      }
    } catch {}

    // دمج البيانات — ابحث بـ container_id, الرقم, farm_name
    const merged = (farms || []).map((f: any) => {
      const cid = f.container_id;
      const numId = cid?.replace("farm_", "") || f.farm_name?.replace("farm_", "");

      // ابحث بكل الأشكال الممكنة
      const live = hetznerMap[cid]
        || hetznerMap[`farm_${cid}`]
        || hetznerMap[numId]
        || hetznerMap[f.farm_name]
        || hetznerMap[f.farm_name?.replace("farm_", "")]
        || null;

      const isOnline = !!(live?.game_pid) || live?.live_status === "online"
        || live?.status === "running" || live?.status === "RUNNING";

      return {
        id:             f.farm_name,
        farm_name:      f.farm_name,
        name:           f.farm_name,
        container_id:   cid || numId || null,
        status:         f.status || "offline",
        game_account:   f.game_account || "",
        tasks_today:    (taskCounts[f.farm_name] || 0) + (live?.tasks_ok || live?.tasks_today || 0),
        live_status:    isOnline ? "online"
                        : f.status === "provisioning" ? "idle"
                        : f.status === "running" && !live ? "starting"
                        : "offline",
        current_task:   live?.current_task || null,
        is_online:      isOnline,
        game_pid:       live?.game_pid || null,
        server_id:      f.server_id,
        last_heartbeat: f.last_heartbeat,
      };
    });

    return NextResponse.json({
      farms:        merged,
      total:        merged.length,
      cloud_online: merged.some((f: any) => f.is_online),
      debug_userId: userId.substring(0, 8),
    });
  } catch (e: any) {
    console.error("farms/status error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
