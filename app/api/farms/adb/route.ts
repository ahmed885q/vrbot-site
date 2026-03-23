export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { resolveFarmNum } from "@/lib/farm-mapper";

async function getUser(req: Request) {
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
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

// ── Resolve farm name → farm_XXX format for Hetzner ──────────────
async function resolveTargetId(
  farmId: string,
  service: any,
  userId: string
): Promise<string> {
  // Already in farm_XXX format — pass through
  if (/^farm_\d+$/.test(farmId)) return farmId;

  // Try Supabase lookup for container_id / adb_port
  try {
    const { data: farm } = await service
      .from("cloud_farms")
      .select("container_id, adb_port")
      .eq("user_id", userId)
      .eq("farm_name", farmId)
      .single();

    if (farm?.container_id) {
      const m = String(farm.container_id).match(/\d+/);
      if (m) return `farm_${String(parseInt(m[0])).padStart(3, "0")}`;
    }
    if (farm?.adb_port) {
      const num = Number(farm.adb_port) - 5554;
      return `farm_${String(num).padStart(3, "0")}`;
    }
  } catch {}

  // Fallback: resolveFarmNum from farm-mapper
  const num = await resolveFarmNum(farmId);
  if (num !== null) return `farm_${String(num).padStart(3, "0")}`;

  // Last resort: return original (Hetzner will try its best)
  return farmId;
}

export async function POST(req: Request) {
  try {
    const auth = await getUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, service } = auth;

    const body = await req.json().catch(() => ({}));
    const { farm_id, command } = body;
    if (!farm_id || !command) return NextResponse.json({ error: "farm_id and command required" }, { status: 400 });

    // Resolve farm name → farm_XXX for Hetzner
    const target_id = await resolveTargetId(farm_id, service, user.id);

    const HETZNER = process.env.HETZNER_IP || "cloud.vrbot.me";
    const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";
    const res = await fetch(`https://${HETZNER}/api/farms/adb`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({ farm_id: target_id, command }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok && data.ok, ...data, resolved_farm: target_id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
