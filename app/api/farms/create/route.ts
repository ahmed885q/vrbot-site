export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Helper: احصل على المستخدم من الـ request
async function getUserFromRequest(req: Request) {
  // طريقة 1: Authorization header (الأفضل للـ SPA)
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token && token !== "undefined" && token !== "null") {
      const service = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );
      const { data, error } = await service.auth.getUser(token);
      if (!error && data?.user) {
        return { user: data.user, service };
      }
    }
  }

  // طريقة 2: Cookies (SSR fallback)
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }: any) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      const service = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );
      return { user, service };
    }
  } catch {}

  return null;
}

export async function POST(req: Request) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user, service } = auth;

    const body = await req.json().catch(() => ({}));
    const name         = String(body?.name ?? "").trim();
    const igg_email    = String(body?.igg_email ?? "").trim() || null;
    const igg_password = String(body?.igg_password ?? "").trim() || null;

    if (!name) {
      return NextResponse.json({ error: "Missing farm name" }, { status: 400 });
    }

    // تحقق إذا كان الاسم مستخدماً
    const { data: existing } = await service
      .from("cloud_farms")
      .select("id")
      .eq("user_id", user.id)
      .eq("farm_name", name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "اسم المزرعة مستخدم مسبقاً" },
        { status: 409 }
      );
    }

    // تحقق من عدد المزارع الحالية
    const { count } = await service
      .from("cloud_farms")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "deleted");

    const MAX_FARMS = 50;
    if ((count || 0) >= MAX_FARMS) {
      return NextResponse.json(
        { error: `وصلت للحد الأقصى (${MAX_FARMS} مزرعة)` },
        { status: 403 }
      );
    }

    // إنشاء المزرعة في Supabase
    const { data: farm, error } = await service
      .from("cloud_farms")
      .insert({
        user_id:      user.id,
        farm_name:    name,
        server_id:    "server-01",
        game_account: igg_email || "",
        status:       "provisioning",
      })
      .select("id, farm_name, server_id, created_at, status")
      .single();

    if (error) {
      console.error("FARM INSERT ERROR:", JSON.stringify(error));
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      );
    }

    // إرسال credentials لـ Hetzner (non-blocking)
    if (igg_email && igg_password) {
      fetch(
        `http://${process.env.HETZNER_IP || "88.99.64.19"}:8888/api/farms/login`,
        {
          method:  "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key":    process.env.VRBOT_API_KEY || "",
          },
          body: JSON.stringify({
            user_id:      user.id,
            nickname:     name,
            igg_email,
            igg_password,
          }),
        }
      ).catch((e) => console.error("Hetzner login error:", e));
    }

    // تسجيل الحدث
    await service.from("farm_alerts").insert({
      user_id:  user.id,
      farm_id:  "00000000-0000-0000-0000-000000000000",
      type:     "farm_created",
      severity: "info",
      message:  `تم إنشاء مزرعة ${name} ✅`,
    }).catch(() => {});

    return NextResponse.json({
      ok:               true,
      farm,
      tokens_remaining: 999,
      cloud:            { status: "provisioning" },
      agent:            null,
    });
  } catch (e: any) {
    console.error("FARMS CREATE EXCEPTION:", e?.message);
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}
