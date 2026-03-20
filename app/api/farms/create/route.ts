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

export async function POST(req: Request) {
  try {
    const auth = await getUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, service } = auth;

    const body         = await req.json().catch(() => ({}));
    const name         = String(body?.name         ?? "").trim();
    const igg_email    = String(body?.igg_email    ?? "").trim() || null;
    const igg_password = String(body?.igg_password ?? "").trim() || null;

    if (!name) return NextResponse.json({ error: "اسم المزرعة مطلوب" }, { status: 400 });

    // تحقق من تكرار الاسم
    const { data: existing } = await service.from("cloud_farms")
      .select("id").eq("user_id", user.id).eq("farm_name", name).single();
    if (existing) return NextResponse.json({ error: "اسم المزرعة مستخدم مسبقاً" }, { status: 409 });

    // تحقق من حد المستخدم (50 مزرعة)
    const { count: userCount } = await service.from("cloud_farms")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id).neq("status", "deleted");
    if ((userCount || 0) >= 50)
      return NextResponse.json({ error: "وصلت للحد الأقصى (50 مزرعة)" }, { status: 403 });

    // تحقق من سعة السيرفر الكلية (200 مزرعة)
    const { data: serverData } = await service.from("cloud_servers")
      .select("current_farms, max_farms").eq("server_id", "server-01").single();
    const current = serverData?.current_farms ?? 0;
    const max     = serverData?.max_farms     ?? 200;
    if (current >= max)
      return NextResponse.json({
        error: `السيرفر ممتلئ (${current}/${max}) — تواصل مع الدعم`,
        code: "SERVER_FULL",
      }, { status: 503 });

    // احسب موقع في الطابور
    const { count: queuePos } = await service.from("cloud_farms")
      .select("*", { count: "exact", head: true })
      .neq("status", "deleted");
    const position = (queuePos || 0) + 1;

    // أنشئ المزرعة بدون container — الـ scheduler يخصص لاحقاً
    const { data: farm, error: insertError } = await service.from("cloud_farms").insert({
      user_id:       user.id,
      farm_name:     name,
      server_id:     "server-01",
      container_id:  null,
      adb_port:      null,
      game_account:  igg_email    || "",
      igg_password:  igg_password || "",
      status:        "running",
      queue_position: position,
      cycle_count:   0,
      tasks_config:  {},
    }).select("id, farm_name, status, created_at, queue_position").single();

    if (insertError) {
      console.error("INSERT ERROR:", JSON.stringify(insertError));
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // سجّل الحدث
    try {
      await service.from("farm_events").insert({
        user_id: user.id, farm_name: name,
        event_type: "farm_created",
        message: `Farm ${name} added to queue at position #${position}`,
        tasks: [],
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      farm,
      message: `تمت إضافة المزرعة في الطابور (#${position}) — ستبدأ خلال دورتها القادمة`,
      queue_position: position,
      estimated_wait_hours: Math.ceil(position / 20),
    });

  } catch (e: any) {
    console.error("FARMS CREATE:", e?.message);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
      }
