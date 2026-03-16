export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      farm_id,           // اسم المزرعة المصدر
      target_name,       // اسم اللاعب المستقبل
      resources,         // ["food", "wood", "stone", "gold"]
      amount,            // "all" | "half"
      max_marches,       // عدد الجيوش (1-4)
      method,            // "tribe_hall" | "world_map"
    } = body;

    if (!farm_id)    return NextResponse.json({ error: "farm_id required" }, { status: 400 });
    if (!target_name) return NextResponse.json({ error: "target_name required" }, { status: 400 });
    if (!resources?.length) return NextResponse.json({ error: "resources required" }, { status: 400 });

    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // تحقق من ملكية المزرعة
    const { data: farm } = await service
      .from("cloud_farms")
      .select("farm_name, server_id")
      .eq("user_id", session.user.id)
      .eq("farm_name", farm_id)
      .single();

    if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });

    const HETZNER = process.env.HETZNER_IP || "88.99.64.19";
    const API_KEY = process.env.VRBOT_API_KEY || "";

    // أرسل config + command لـ Hetzner
    const command = `run_tasks:transfer_resources`;
    const transferConfig = {
      transfer_target_name: target_name,
      transfer_resources:   resources,
      transfer_amount:      amount || "all",
      transfer_max_marches: max_marches || 1,
      transfer_method:      method || "tribe_hall",
    };

    const res = await fetch(`http://${HETZNER}:8888/api/farms/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({
        farm_id:    farm.farm_name,
        command,
        task_config: transferConfig,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const result = await res.json().catch(() => ({ ok: res.ok }));

    // سجّل الحدث في farm_alerts
    await service.from("farm_alerts").insert({
      user_id:  session.user.id,
      farm_id:  "00000000-0000-0000-0000-000000000000",
      type:     "transfer_resources",
      severity: "info",
      message:  `نقل ${resources.join("+")} → ${target_name} (${amount || "all"})`,
    }).catch(() => {});

    return NextResponse.json({
      ok: res.ok,
      farm_id,
      target_name,
      resources,
      amount,
      hetzner: result,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
