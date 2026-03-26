export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// ─── Auth helper ─────────────────────────────────────────────────────
async function getUser(req: Request) {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const token = req.headers
    .get("authorization")
    ?.replace("Bearer ", "")
    .trim();
  if (token && token !== "undefined" && token !== "null") {
    const { data } = await service.auth.getUser(token);
    if (data?.user) return { user: data.user, service };
  }
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
    if (data?.user) return { user: data.user, service };
  } catch {}
  return null;
}

// ─── Sync: Pull farms from Hetzner → upsert into Supabase ──────────
export async function POST(req: Request) {
  try {
    const auth = await getUser(req);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, service } = auth;

    const HETZNER = process.env.HETZNER_IP || "cloud.vrbot.me";
    const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";

    // 1) Fetch all farms from Hetzner orchestrator
    const res = await fetch(`https://${HETZNER}/api/farms/status`, {
      headers: { "X-API-Key": API_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Hetzner returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const hetznerFarms: any[] = data.farms || [];

    if (!hetznerFarms.length) {
      return NextResponse.json(
        { error: "No farms found on Hetzner" },
        { status: 404 }
      );
    }

    // 2) Fetch existing farms for this user from Supabase
    const { data: existing } = await service
      .from("cloud_farms")
      .select("farm_name, container_id, adb_port")
      .eq("user_id", user.id)
      .neq("status", "deleted");

    const existingMap = new Map(
      (existing || []).map((f: any) => [f.farm_name, f])
    );

    // 3) Upsert each Hetzner farm
    const results: any[] = [];
    for (const farm of hetznerFarms) {
      const farmNum = String(farm.farm_id || "")
        .replace(/\D/g, "")
        .padStart(3, "0");
      const farmName =
        farm.nickname || farm.farm_name || `farm${farmNum}`;
      const containerId = farmNum;
      const adbPort = farm.adb_port || 5554 + parseInt(farmNum);
      const gameAccount = farm.game_account || farm.igg_email || "";

      if (existingMap.has(farmName)) {
        // Update existing farm
        const { error } = await service
          .from("cloud_farms")
          .update({
            container_id: containerId,
            adb_port: adbPort,
            status: farm.status || "running",
            game_account: gameAccount || undefined,
          })
          .eq("user_id", user.id)
          .eq("farm_name", farmName);

        results.push({
          farm_name: farmName,
          action: "updated",
          error: error?.message,
        });
      } else {
        // Insert new farm
        const { error } = await service.from("cloud_farms").insert({
          user_id: user.id,
          farm_name: farmName,
          container_id: containerId,
          adb_port: adbPort,
          status: farm.status || "running",
          game_account: gameAccount,
        });

        results.push({
          farm_name: farmName,
          action: "created",
          error: error?.message,
        });
      }
    }

    const created = results.filter(
      (r) => r.action === "created" && !r.error
    ).length;
    const updated = results.filter(
      (r) => r.action === "updated" && !r.error
    ).length;
    const errors = results.filter((r) => r.error).length;

    return NextResponse.json({
      ok: true,
      hetzner_total: hetznerFarms.length,
      created,
      updated,
      errors,
      results,
    });
  } catch (e: any) {
    console.error("[FARMS-SYNC] error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
