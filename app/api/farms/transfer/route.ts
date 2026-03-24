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
    const { farm_id, target_name, resources, amount, max_marches, method } = body;

    if (!farm_id)          return NextResponse.json({ error: "farm_id required" }, { status: 400 });
    if (!target_name)      return NextResponse.json({ error: "target_name required" }, { status: 400 });
    if (!resources?.length) return NextResponse.json({ error: "resources required" }, { status: 400 });

    // تحقق من ملكية المزرعة + جلب container_id
    const { data: farm } = await service
      .from("cloud_farms")
      .select("farm_name, container_id, adb_port")
      .eq("user_id", user.id)
      .eq("farm_name", farm_id)
      .single();

    if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });

    // احسب farm_id الصحيح للـ orchestrator
    let hetzner_farm_id = farm_id;
    if (farm.container_id) {
      const m = String(farm.container_id).match(/\d+/);
      if (m) hetzner_farm_id = `farm_${String(m[0]).padStart(3, '0')}`;
    } else if (farm.adb_port) {
      const num = farm.adb_port - 5554;
      hetzner_farm_id = `farm_${String(num).padStart(3, '0')}`;
    }

    const result = await transferResources({
      farm_id:     hetzner_farm_id,
      target_name,
      resources,
      amount:      amount || "all",
      max_marches: max_marches || 1,
      method:      method || "tribe_hall",
    });

    // سجّل الحدث
    try {
      await service.from("farm_events").insert({
        user_id:    user.id,
        farm_name:  farm_id,
        event_type: "transfer_resources",
        message:    `Transfer ${resources.join("+")} → ${target_name} (${amount || "all"}) farm:${hetzner_farm_id}`,
      });
    } catch {}

    return NextResponse.json({
      ok:           result.ok,
      farm_id,
      hetzner_farm: hetzner_farm_id,
      container_id: farm.container_id,
      target_name,
      resources,
      amount,
      error:        result.error,
      result:       result.result,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}