export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { transferResources } from "@/lib/hetzner";

async function getUser(req: Request) {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (token && token !== "undefined") {
    const { data } = await service.auth.getUser(token);
    if (data?.user) return { user: data.user, service };
  }
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
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
    const {
      farm_id,           // اسم المزرعة المصدر
      target_name,       // اسم اللاعب المستقبل
      resources,         // ["food", "wood", "stone", "gold"]
      amount,            // "all" | "half"
      max_marches,       // عدد الجيوش (1-4)
      method,            // "tribe_hall" | "world_map"
    } = body;

    if (!farm_id)     return NextResponse.json({ error: "farm_id required" }, { status: 400 });
    if (!target_name) return NextResponse.json({ error: "target_name required" }, { status: 400 });
    if (!resources?.length) return NextResponse.json({ error: "resources required" }, { status: 400 });

    // تحقق من ملكية المزرعة + جلب container_id
    const { data: farm } = await service
      .from("cloud_farms")
      .select("farm_name, container_id, server_id")
      .eq("user_id", user.id)
      .eq("farm_name", farm_id)
      .single();

    if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });

    // استخدم container_id إذا موجود
    const target_container = farm.container_id || farm.farm_name;

    const command = `run_tasks:transfer_resources`;
    const transferConfig = {
      transfer_target_name: target_name,
      transfer_resources:   resources,
      transfer_amount:      amount || "all",
      transfer_max_marches: max_marches || 1,
      transfer_method:      method || "tribe_hall",
    };

    const result = await transferResources({
      container_id: target_container,
      command,
      task_config:  transferConfig,
    });

    // سجّل الحدث في farm_events
    try {
      await service.from("farm_events").insert({
        user_id:    user.id,
        farm_name:  farm_id,
        event_type: "transfer_resources",
        message:    `Transfer ${resources.join("+")} to ${target_name} (${amount || "all"}) — container: ${target_container}`,
        tasks:      resources,
      });
    } catch {}

    return NextResponse.json({
      ok:           result.ok,
      farm_id,
      container_id: target_container,
      target_name,
      resources,
      amount,
      hetzner:      result.result,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
