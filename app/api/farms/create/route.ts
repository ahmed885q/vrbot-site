export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getAvailableContainer, loginFarm } from "@/lib/hetzner";

// دالة مشتركة للـ auth
async function getUser(req: Request) {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Bearer token
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (token && token !== "undefined" && token !== "null") {
    const { data } = await service.auth.getUser(token);
    if (data?.user) return { user: data.user, service };
  }

  // Cookies
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c: any[]) => { try { c.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)) } catch {} },
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

    const body = await req.json().catch(() => ({}));
    const name         = String(body?.name ?? "").trim();
    const igg_email    = String(body?.igg_email ?? "").trim() || null;
    const igg_password = String(body?.igg_password ?? "").trim() || null;

    if (!name) return NextResponse.json({ error: "اسم المزرعة مطلوب" }, { status: 400 });

    // تحقق من تكرار الاسم
    const { data: existing } = await service
      .from("cloud_farms")
      .select("id")
      .eq("user_id", user.id)
      .eq("farm_name", name)
      .single();

    if (existing) return NextResponse.json({ error: "اسم المزرعة مستخدم مسبقاً" }, { status: 409 });

    // تحقق من الحد الأقصى
    const { count } = await service
      .from("cloud_farms")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "deleted");

    if ((count || 0) >= 50) {
      return NextResponse.json({ error: "وصلت للحد الأقصى (50 مزرعة)" }, { status: 403 });
    }

    // احصل على container فارغ من Hetzner
    let container_id: string | null = null;
    let adb_port: number | null = null;

    if (igg_email && igg_password) {
      container_id = await getAvailableContainer();
      if (!container_id) {
        return NextResponse.json({
          error: "لا يوجد containers متاحة حالياً — السيرفر ممتلئ",
          code: "NO_CONTAINER"
        }, { status: 503 });
      }
      // احسب الـ port من الـ container_id
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
        adb_port:     adb_port || null,
        game_account: igg_email || "",
        status:       container_id ? "provisioning" : "pending",
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
        if (result.ok) {
          await service.from("cloud_farms").update({
            status:         "running",
            last_heartbeat: new Date().toISOString(),
          }).eq("id", farm.id);
          try {
            await service.from("farm_events").insert({
              user_id:    user.id,
              farm_name:  name,
              event_type: "farm_started",
              message:    `IGG login success — container ${container_id}`,
              tasks:      [],
            });
          } catch {}
        } else {
          await service.from("cloud_farms").update({
            status: "error",
          }).eq("id", farm.id);
          try {
            await service.from("farm_events").insert({
              user_id:    user.id,
              farm_name:  name,
              event_type: "error",
              message:    `IGG login failed: ${result.error}`,
              tasks:      [],
            });
          } catch {}
        }
      }).catch(console.error);
    }

    return NextResponse.json({
      ok:          true,
      farm,
      container:   container_id,
      message:     container_id
        ? `جارٍ تسجيل الدخول على container ${container_id}...`
        : "المزرعة مُنشأة — أضف IGG credentials لتفعيلها",
    });
  } catch (e: any) {
    console.error("FARMS CREATE EXCEPTION:", e?.message);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
