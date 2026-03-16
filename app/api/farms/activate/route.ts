export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
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

    // طريقة 2: Cookies
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

    const body = await req.json().catch(() => ({}));
    const { farm_name } = body;
    if (!farm_name) {
      return NextResponse.json({ error: "farm_name required" }, { status: 400 });
    }

    // جلب بيانات المزرعة
    const { data: farm } = await service
      .from("cloud_farms")
      .select("farm_name, game_account, status")
      .eq("user_id", userId)
      .eq("farm_name", farm_name)
      .single();

    if (!farm) {
      return NextResponse.json({ error: "Farm not found" }, { status: 404 });
    }

    const HETZNER = process.env.HETZNER_IP || "88.99.64.19";

    // أرسل أمر provision لـ Hetzner
    const res = await fetch(`http://${HETZNER}:8888/api/farms/provision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.VRBOT_API_KEY || "",
      },
      body: JSON.stringify({
        farm_id: farm.farm_name,
        game_account: farm.game_account || "",
      }),
      signal: AbortSignal.timeout(30000),
    });

    const result = await res.json().catch(() => ({ ok: res.ok }));

    // حدّث الحالة في Supabase
    await service.from("cloud_farms").update({
      status: "running",
      last_heartbeat: new Date().toISOString(),
    }).eq("farm_name", farm_name).eq("user_id", userId);

    // تسجيل الحدث
    await service.from("farm_events").insert({
      user_id:    userId,
      farm_name:  farm_name,
      event_type: "farm_activated",
      message:    `تم تفعيل مزرعة ${farm_name} ⚡`,
      tasks:      [],
    }).catch(() => {});

    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    console.error("farms/activate error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
