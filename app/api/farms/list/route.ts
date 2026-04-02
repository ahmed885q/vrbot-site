export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";


// Per-user in-memory cache (keyed by user ID)
const _cacheMap = new Map<string, { data: any; time: number }>();
const CACHE_TTL = 10000; // 10 seconds

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

    // Per-user cache check
    const now = Date.now()
    const cached = _cacheMap.get(user.id);
    if (cached && now - cached.time < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    // جلب مزارع المستخدم + الحالة الحية بالتوازي (أسرع ~40%)
    const [supabaseResult, hetznerResult] = await Promise.allSettled([
      service
        .from("cloud_farms")
        .select("farm_name, status, game_account, game_password, container_id, adb_port, created_at")
        .eq("user_id", user.id)
        .neq("status", "deleted")
        .order("farm_name", { ascending: true }),
      fetch(`https://${HETZNER()}/api/farms/status`, {
        headers: { "X-API-Key": API_KEY() },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      }).then(r => r.ok ? r.json() : { farms: [] }).catch(() => ({ farms: [] })),
    ]);

    const { data: farms, error } =
      supabaseResult.status === "fulfilled" ? supabaseResult.value : { data: null, error: { message: "Supabase fetch failed" } };

    if (error) {
      console.error("[FARMS-LIST] Supabase error:", error.message);
      return NextResponse.json({ farms: [], error: error.message }, { status: 500 });
    }

    if (!farms?.length) return NextResponse.json({ farms: [], total: 0 });

    const liveFarms: any[] =
      hetznerResult.status === "fulfilled" ? (hetznerResult.value?.farms || []) : [];

    const merged = farms.map((f: any) => {
      // ابحث عن حالة هذه المزرعة من Hetzner
      const liveData = liveFarms.find(
        (l: any) => l.farm_id === f.farm_name || l.container_id === f.container_id
      ) || ({} as any);

      const isOnline = liveData.live_status === "online" || liveData.is_online === true;
      return {
        ...f,
        game_password: undefined,          // لا ترجع الباسورد أبداً
        has_password:  !!f.game_password,   // فقط هل موجود أم لا
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

    const result = { farms: merged, total: merged.length }
    _cacheMap.set(user.id, { data: result, time: Date.now() })
    // Evict stale entries to prevent memory leak
    for (const [uid, entry] of _cacheMap) {
      if (now - entry.time > CACHE_TTL * 6) _cacheMap.delete(uid);
    }
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[FARMS-LIST] error:", e?.message);
    return NextResponse.json({ farms: [], error: e?.message }, { status: 500 });
  }
}
