export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data } = await service.auth.getUser(token);
    if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { farm_id } = body;
    if (!farm_id) return NextResponse.json({ error: "farm_id required" }, { status: 400 });

    // Resolve farm_name → farm_XXX via container_id
    let target = farm_id;
    if (!/^farm_\d+$/.test(farm_id)) {
      try {
        const { data: farm } = await service
          .from("cloud_farms")
          .select("container_id")
          .eq("user_id", data.user.id)
          .eq("farm_name", farm_id)
          .single();
        if (farm?.container_id) {
          const m = String(farm.container_id).match(/\d+/);
          if (m) target = `farm_${String(parseInt(m[0])).padStart(3, "0")}`;
        }
      } catch {}
    }

    const HETZNER = process.env.HETZNER_IP || "cloud.vrbot.me";
    const API_KEY = process.env.VRBOT_API_KEY || "";
    const res = await fetch(`https://${HETZNER}/api/farms/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({ farm_id: target }),
      signal: AbortSignal.timeout(15000),
    });
    const d = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok && d.ok, ...d });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
