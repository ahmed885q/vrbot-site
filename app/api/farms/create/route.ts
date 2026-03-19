export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { loginFarm } from "@/lib/hetzner";

const HETZNER_URL = process.env.ORCHESTRATOR_URL || "https://cloud.vrbot.me";
const API_KEY     = process.env.VRBOT_API_KEY    || "vrbot_admin_2026";
const MAX_FARMS   = 40; // max_farms in cloud_servers

// ─── Auth ─────────────────────────────────────────────────────────────────────
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
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c: any[]) => {
            try { c.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)); } catch {}
          },
        },
      }
    );
    const { data } = await supabase.auth.getUser();
    if (data?.user) return { user: data.user, service };
  } catch {}

  return null;
}

// ─── Get truly available container ────────────────────────────────────────────
async function getAvailableContainer(service: any): Promise<string | null> {
  try {
    // 1. جلب كل المزارع من Hetzner
    const res = await fetch(`${HETZNER_URL}/api/farms/status`, {
      headers: { "X-API-Key": API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const hetznerFarms: any[] = d.farms || [];

    // 2. جلب الـ containers المحجوزة في Supabase
    const { data: assignedFarms } = await service
      .from("cloud_farms")
      .select("container_id")
      .neq("status", "deleted")
      .not("container_id", "is", null);

    const assignedSet = new Set(
      (assignedFarms || []).map((f: any) => f.container_id?.toString().trim())
    );

    // 3. ابحث عن container idle وغير محجوز
    for (const farm of hetznerFarms) {
      if (farm.live_status !== "idle") continue;
      if (farm.game_pid) continue;

      // normalize farm_id: "1" أو "001" → "farm_001"
      const rawId  = farm.farm_id?.toString() || "";
      const numPad = rawId.replace(/\D/g, "").padStart(3, "0");
      const farmId = rawId.startsWith("farm_") ? rawId : `farm_${numPad}`;

      if (!assignedSet.has(farmId) && !assignedSet.has(rawId) && !assignedSet.has(numPad)) {
        return farmId;
      }
    }

    return null; // كل الـ containers محجوزة
  } catch (e) {
    console.error("getAvailableContainer error:", e);
    return null;
  }
}

// ─── POST /api/farms/create ───────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const auth = await getUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, service } = auth;

    const body        = await req.json().catch(() => ({}));
    const name        = String(body?.name        ?? "").trim();
    const igg_email   = String(body?.igg_email   ?? "").trim() || null;
    const igg_password= String(body?.igg_password ?? "").trim() || null;

    if (!name) {
      return NextResponse.json({ error: "اسم المزرعة مطلوب" }, { status: 400 });
    }

    // تحقق من تكرار الاسم
    const { data: existing } = await service
      .from("cloud_farms")
      .select("id")
      .eq("user_id", user.id)
      .eq("farm_name", name)
      .single();

    if (existing) {
      return NextResponse.json({ error: "اسم المزرعة مستخدم مسبقاً" }, { status: 409 });
    }

    // تحقق من الحد الأقصى للمستخدم
    const { count: userCount } = await service
      .from("cloud_farms")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "deleted");

    if ((userCount || 0) >= 50) {
      return NextResponse.json({ error: "وصلت للحد الأقصى (50 مزرعة)" }, { status: 403 });
    }

    // تحقق من سعة السيرفر
    const { data: serverData } = await service
      .from("cloud_servers")
      .select("current_farms, max_farms")
      .eq("server_id", "server-01")
      .single();

    const current = serverData?.current_farms || 0;
    const max     = serverData?.max_farms     || MAX_FARMS;

    if (current >= max) {
      return NextResponse.json({
        error: `السيرفر ممتلئ — ${current}/${max} مزرعة. تواصل مع الدعم.`,
        code:  "SERVER_FULL",
      }, { status: 503 });
    }

    // احصل على container فارغ وغير محجوز
    let container_id: string | null = null;
    let adb_port: number | null = null;

    if (igg_email && igg_password) {
      container_id = await getAvailableContainer(service);

      if (!container_id) {
        return NextResponse.json({
          error: `لا يوجد containers متاحة (${current}/${max} مستخدم) — حاول لاحقاً`,
          code:  "NO_CONTAINER",
        }, { status: 503 });
      }

      // احسب الـ port
      const num = parseInt(container_id.replace(/\D/g, ""));
      if (!isNaN(num)) adb_port = 5554 + num;
    }

    // أنشئ المزرعة في Supabase
    const { data: farm, error } = await service
      .from("cloud_farms")
      .insert({
        user_id:      user.id,
        farm_name:    name,
        server_id:    "server-01",
        container_id: container_id || null,
        adb_port:     adb_port     || null,
        game_account: igg_email    || "",
        status:       container_id ? "running" : "pending",
      })
      .select("id, farm_name, container_id, status, created_at")
      .single();

    if (error) {
      console.error("FARM INSERT ERROR:", JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // سجّل الحدث
    try {
      await service.from("farm_events").insert({
        user_id:    user.id,
        farm_name:  name,
        event_type: "farm_created",
        message:    `Created farm ${name} -> container ${container_id || "pending"}`,
        tasks:      [],
      });
    } catch {}

    // تسجيل دخول IGG بشكل async
    if (container_id && igg_email && igg_password) {
      loginFarm({
        container_id,
        nickname:     name,
        igg_email,
        igg_password,
        user_id:      user.id,
      }).then(async (result) => {
        const status = result.ok ? "running" : "error";
        await service.from("cloud_farms")
          .update({ status, last_heartbeat: new Date().toISOString() })
          .eq("id", farm.id);
        try {
          await service.from("farm_events").insert({
            user_id:    user.id,
            farm_name:  name,
            event_type: result.ok ? "farm_started" : "error",
            message:    result.ok
              ? `IGG login success — container ${container_id}`
              : `IGG login failed: ${result.error}`,
            tasks: [],
          });
        } catch {}
      }).catch(console.error);
    }

    return NextResponse.json({
      ok:      true,
      farm,
      container: container_id,
      message: container_id
        ? `جارٍ تسجيل الدخول على container ${container_id}...`
        : "المزرعة منشأة — أضف IGG credentials لتفعيلها",
    });

  } catch (e: any) {
    console.error("FARMS CREATE EXCEPTION:", e?.message);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
