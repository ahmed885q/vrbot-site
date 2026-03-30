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

    // Auth: Bearer token first, then cookies
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (token && token !== "undefined" && token !== "null") {
      const { data } = await service.auth.getUser(token);
      userId = data?.user?.id || null;
    }

    if (!userId) {
      try {
        const cookieStore = cookies();
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
        );
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id || null;
      } catch {}
    }

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { farm_id } = body;

    if (!farm_id) return NextResponse.json({ error: "farm_id required" }, { status: 400 });

    // تحقق من ملكية المزرعة
    const { data: farm } = await service
      .from("cloud_farms")
      .select("id, farm_name, game_account, status")
      .eq("user_id", userId)
      .eq("farm_name", farm_id)
      .single();

    if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });

    const HETZNER = process.env.HETZNER_IP || "88.99.64.19";
    const API_KEY = process.env.VRBOT_API_KEY || "";

    // أرسل أمر provision لـ Hetzner
    const res = await fetch(`https://${HETZNER}/api/farms/provision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({
        farm_id:      farm.farm_name,
        game_account: farm.game_account,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const result = await res.json().catch(() => ({ ok: res.ok }));

    if (res.ok) {
      // حدّث الـ status في Supabase
      await service.from("cloud_farms").update({
        status: "running",
        last_heartbeat: new Date().toISOString(),
      }).eq("id", farm.id);
    }

    return NextResponse.json({ ok: res.ok, result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
