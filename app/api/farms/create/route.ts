export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getAvailableContainer, loginFarm } from "@/lib/hetzner";

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

    const { data: existing } = await service.from("cloud_farms").select("id")
      .eq("user_id", user.id).eq("farm_name", name).single();

    if (existing) return NextResponse.json({ error: "اسم المزرعة مستخدم مسبقاً" }, { status: 409 });

    const { count: userCount } = await service.from("cloud_farms")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id).neq("status", "deleted");

    if ((userCount || 0) >= 50) return NextResponse.json({ error: "وصلت للحد الأقصى (50 مزرعة)" }, { status: 403 });

    const { data: serverData } = await service.from("cloud_servers")
      .select("current_farms, max_farms").eq("server_id", "server-01").single();

    const current = serverData?.current_farms || 0;
    const max     = serverData?.max_farms     || 20;

    if (current >= max) {
      return NextResponse.json({
        error: `السيرفر ممتلئ (${current}/${max}) — تواصل مع الدعم`,
        code: "SERVER_FULL"
      }, { status: 503 });
    }

    let container_id: string | null = null;
    let adb_port: number | null = null;

    if (igg_email && igg_password) {
      container_id = await getAvailableContainer();

      if (!container_id) {
        return NextResponse.json({
          error: `لا يوجد containers متاحة — حاول لاحقاً`,
          code: "NO_CONTAINER"
        }, { status: 503 });
      }

      const num = parseInt(container_id.replace(/\D/g, ""));
      if (!isNaN(num)) adb_port = 5554 + num;
    }

    const stored_container = container_id
      ? container_id.replace(/\D/g, "").padStart(3, "0")
      : null;

    const { data: farm, error } = await service.from("cloud_farms").insert({
      user_id:      user.id,
      farm_name:    name,
      server_id:    "server-01",
      container_id: stored_container,
      adb_port:     adb_port || null,
      game_account: igg_email || "",
      status:       container_id ? "running" : "pending",
    }).select("id, farm_name, container_id, status, created_at").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      await service.from("farm_events").insert({
        user_id: user.id, farm_name: name,
        event_type: "farm_created",
        message: `Farm ${name} container:${stored_container || "pending"}`,
        tasks: [],
      });
    } catch {}

    if (container_id && igg_email && igg_password) {
      loginFarm({ container_id, nickname: name, igg_email, igg_password, user_id: user.id })
        .then(async (result: { ok: boolean; error?: string }) => {
          await service.from("cloud_farms").update({
            status: result.ok ? "running" : "error",
            last_heartbeat: new Date().toISOString(),
          }).eq("id", farm.id);
        }).catch(console.error);
    }

    return NextResponse.json({
      ok: true, farm, container: container_id,
      message: container_id
        ? `جارٍ تسجيل الدخول على container ${stored_container}...`
        : "المزرعة منشأة",
    });

  } catch (e: any) {
    console.error("FARMS CREATE:", e?.message);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
