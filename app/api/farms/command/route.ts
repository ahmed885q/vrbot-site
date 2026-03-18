export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  try {
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    let userId: string | null = null;

    // Bearer token
    const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
    if (token && token !== "undefined" && token !== "null") {
      const { data } = await service.auth.getUser(token);
      userId = data?.user?.id || null;
    }

    // Cookies fallback
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

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { farm_id, command } = body;

    if (!farm_id || !command) {
      return NextResponse.json({ error: "farm_id and command required" }, { status: 400 });
    }

    // تحقق أن المزرعة تخص هذا المستخدم
    const { data: farm } = await service
      .from("cloud_farms")
      .select("container_id, farm_name")
      .eq("farm_name", farm_id)
      .eq("user_id", userId)
      .single();

    if (!farm) {
      return NextResponse.json({ error: "Farm not found" }, { status: 404 });
    }

    const HETZNER = process.env.HETZNER_IP || "88.99.64.19";
    const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";

    // Resolve container_id: extract numeric part and pad to 3 digits
    let target = farm.container_id || "";
    const num = target.replace(/\D/g, "");
    target = num ? num.padStart(3, "0") : target;
    if (!target || !/\d/.test(target)) {
      return NextResponse.json({ error: "المزرعة لم تُعيّن لها container" }, { status: 400 });
    }

    const res = await fetch(`http://${HETZNER}:8888/api/farms/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({ farm_id: target, command }),
      signal: AbortSignal.timeout(8000),
    });

    const result = await res.json().catch(() => ({ ok: res.ok }));
    return NextResponse.json({ ok: res.ok, farm_id, command, hetzner: result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
