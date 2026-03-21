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
            try {
              c.forEach(({ name, value, options }: any) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );
    const { data } = await supabase.auth.getUser();
    if (data?.user) return { user: data.user, service };
  } catch {}

  return null;
}

// ─────────────────────────────────────────────────────────
// FIX 3: دالة تخصيص container تلقائياً من farm_001 → farm_020
// ─────────────────────────────────────────────────────────
async function assignContainer(service: any): Promise<{
  container_id: string;
  adb_port: number;
} | null> {
  // جلب كل containers المستخدمة حالياً
  const { data: usedFarms } = await service
    .from("cloud_farms")
    .select("container_id")
    .neq("status", "deleted")
    .not("container_id", "is", null);

  const used = new Set((usedFarms || []).map((f: any) => f.container_id));

  // ابحث عن أول container فارغ من 001 → 020
  for (let i = 1; i <= 20; i++) {
    const cid = String(i).padStart(3, "0"); // "001", "002" ...
    if (!used.has(cid)) {
      return {
        container_id: cid,
        adb_port: 5554 + i, // farm_001 → 5555, farm_002 → 5556 ...
      };
    }
  }

  return null; // كل الـ containers مشغولة
}

export async function POST(req: Request) {
  try {
    const auth = await getUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, service } = auth;

    const body         = await req.json().catch(() => ({}));
    const name         = String(body?.name         ?? "").trim();
    const igg_email    = String(body?.igg_email    ?? "").trim() || null;
    const igg_password = String(body?.igg_password ?? "").trim() || null;

    if (!name)
      return NextResponse.json({ error: "اسم المزرعة مطلوب" }, { status: 400 });

    // ── تحقق من تكرار الاسم ──────────────────────────────
    const { data: existing } = await service
      .from("cloud_farms")
      .select("id")
      .eq("user_id", user.id)
      .eq("farm_name", name)
      .single();
    if (existing)
      return NextResponse.json({ error: "اسم المزرعة مستخدم مسبقاً" }, { status: 409 });

    // ── FIX 1: تحقق من تكرار الإيميل (عالمياً) ──────────
    if (igg_email) {
      const { data: emailExists } = await service
        .from("cloud_farms")
        .select("id")
        .eq("game_account", igg_email)
        .neq("status", "deleted")
        .single();
      if (emailExists)
        return NextResponse.json(
          { error: "هذا الإيميل مسجّل بالفعل في مزرعة أخرى" },
          { status: 409 }
        );
    }

    // ── تحقق من حد المستخدم ──────────────────────────────
    const { count: userCount } = await service
      .from("cloud_farms")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "deleted");
    if ((userCount || 0) >= 50)
      return NextResponse.json({ error: "وصلت للحد الأقصى (50 مزرعة)" }, { status: 403 });

    // ── تحقق من سعة السيرفر ──────────────────────────────
    const { data: serverData } = await service
      .from("cloud_servers")
      .select("current_farms, max_farms")
      .eq("server_id", "server-01")
      .single();
    const current = serverData?.current_farms ?? 0;
    const max     = serverData?.max_farms     ?? 20;
    if (current >= max)
      return NextResponse.json(
        { error: `السيرفر ممتلئ (${current}/${max}) — تواصل مع الدعم`, code: "SERVER_FULL" },
        { status: 503 }
      );

    // ── FIX 3: خصّص container فوراً ──────────────────────
    const slot = await assignContainer(service);
    if (!slot)
      return NextResponse.json(
        { error: "لا يوجد containers متاحة حالياً — تواصل مع الدعم", code: "NO_CONTAINER" },
        { status: 503 }
      );

    const { container_id, adb_port } = slot;

    // ── FIX 2: حساب queue_position فقط بدون تأخير ────────
    const { count: queuePos } = await service
      .from("cloud_farms")
      .select("*", { count: "exact", head: true })
      .neq("status", "deleted");
    const position = (queuePos || 0) + 1;

    // ── أنشئ المزرعة مع container_id مخصص ───────────────
    const { data: farm, error: insertError } = await service
      .from("cloud_farms")
      .insert({
        user_id:        user.id,
        farm_name:      name,
        server_id:      "server-01",
        container_id:   container_id,   // FIX 3: لم يعد null
        adb_port:       adb_port,       // FIX 3: لم يعد null
        game_account:   igg_email    || "",
        igg_password:   igg_password || "",
        status:         "running",
        queue_position: position,
        cycle_count:    0,
        tasks_config:   {},
      })
      .select("id, farm_name, status, container_id, adb_port, created_at, queue_position")
      .single();

    if (insertError) {
      console.error("INSERT ERROR:", JSON.stringify(insertError));
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // ── FIX 4: أبلغ الـ Hetzner orchestrator بالمزرعة الجديدة ──
    try {
      const HETZNER = process.env.HETZNER_IP || "cloud.vrbot.me";
      const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";

      await fetch(`https://${HETZNER}/api/farms/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify({
          farm_id:      `farm_${container_id}`,
          container_id: container_id,
          adb_port:     adb_port,
          game_account: igg_email,
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (e) {
      // لا توقف الطلب إذا فشل إبلاغ Hetzner — سيلتقطه الـ scheduler
      console.warn("Hetzner notify failed (non-fatal):", e);
    }

    // ── سجّل الحدث ───────────────────────────────────────
    try {
      await service.from("farm_events").insert({
        user_id:    user.id,
        farm_name:  name,
        event_type: "farm_created",
        message:    `Farm ${name} → container farm_${container_id} (port ${adb_port})`,
        tasks:      [],
      });
    } catch {}

    return NextResponse.json({
      ok:             true,
      farm,
      container_id:   `farm_${container_id}`,
      adb_port,
      message:        `تمت إضافة المزرعة بنجاح (container: farm_${container_id})`,
      queue_position: position,
    });

  } catch (e: any) {
    console.error("FARMS CREATE:", e?.message);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
