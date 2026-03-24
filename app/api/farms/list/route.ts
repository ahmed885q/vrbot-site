export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const HETZNER = () => process.env.HETZNER_IP || "cloud.vrbot.me";
const API_KEY = () => process.env.VRBOT_API_KEY || "vrbot_admin_2026";

async function getUser(req: Request) {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (token && token !== "undefined" && token !== "null") {
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

export async function GET(req: Request) {
  try {
    const auth = await getUser(req);
    if (!auth) return NextResponse.json({ farms: [] }, { status: 401 });
    const { user, service } = auth;

    // جلب كل مزارع المستخدم — بدون limit
    const { data: farms, error } = await service
      .from("cloud_farms")
      .select("farm_name, status, game_account, container_id, adb_port, created_at")
      .eq("user_id", user.id)
      .neq("status", "deleted")
      .order("farm_name", { ascending: true });

    if (error) {
      console.error("[FARMS-LIST] Supabase error:", error.message);
      return NextResponse.json({ farms: [], error: error.message }, { status: 500 });
    }

    if (!farms?.length) return NextResponse.json({ farms: [], total: 0 });

    // جلب الحالة الحية من Hetzner — بدون ما نعلق لو فشل
    let liveFarms: any[] = [];
    try {
      const res = await fetch(`https://${HETZNER()}/api/farms/status`, {
        headers: { "X-API-Key": API_KEY() },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const live = await res.json();
        liveFarms = live.farms || [];
      }
    } catch {}

    const merged = farms.map((f: any) => {
      // ابحث عن حالة هذه المزرعة من Hetzner
      const liveData = liveFarms.find(
        (l: any) => l.farm_id === f.farm_name || l.container_id === f.container_id
      ) || ({} as any);

      const isOnline = liveData.live_status === "online" || liveData.is_online === true;
      return {
        ...f,
        farm_id:      f.farm_name,
        nickname:     f.farm_name,
        is_online:    isOnline,
        live_status:  isOnline ? "online" : f.status === "running" ? "idle" : "offline",
        tasks_today:  liveData.tasks_today || 0,
        success_rate: liveData.success_rate || 100,
        container_id: f.container_id || liveData.container_id || null,
        adb_port:     f.adb_port || liveData.adb_port || null,
      };
    });

    return NextResponse.json({ farms: merged, total: merged.length });
  } catch (e: any) {
    console.error("[FARMS-LIST] error:", e?.message);
    return NextResponse.json({ farms: [], error: e?.message }, { status: 500 });
  }
}
