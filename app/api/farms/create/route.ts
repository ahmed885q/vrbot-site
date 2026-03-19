export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { loginFarm } from "@/lib/hetzner";

const HETZNER_URL = process.env.ORCHESTRATOR_URL || "https://cloud.vrbot.me";
const API_KEY     = process.env.VRBOT_API_KEY    || "vrbot_admin_2026";
const MAX_FARMS   = 40; // max_farms in cloud_servers

// â”€â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getUser(req: Request) {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
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
          setAll: (c: any[]) => {
            try { c.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)); } catch {}
          },
        },
      }
    );
    const { data } = await supabase.auth.getUser();
    if (data?.user) return { user: data.user, service };
  } catch {}

  return null;
}

// â”€â”€â”€ Get truly available container â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getAvailableContainer(service: any): Promise<string | null> {
  try {
    // 1. Ø¬Ù„Ø¨ ÙƒÙ„ Ø§Ù„Ù…Ø²Ø§Ø±Ø¹ Ù…Ù† Hetzner
    const res = await fetch(`${HETZNER_URL}/api/farms/status`, {
      headers: { "X-API-Key": API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const hetznerFarms: any[] = d.farms || [];

    // 2. Ø¬Ù„Ø¨ Ø§Ù„Ù€ containers Ø§Ù„Ù…Ø­Ø¬ÙˆØ²Ø© ÙÙŠ Supabase
    const { data: assignedFarms } = await service
      .from("cloud_farms")
      .select("container_id")
      .neq("status", "deleted")
      .not("container_id", "is", null);

    const assignedSet = new Set(
      (assignedFarms || []).map((f: any) => f.container_id?.toString().trim())
    );

    // 3. Ø§Ø¨Ø­Ø« Ø¹Ù† container idle ÙˆØºÙŠØ± Ù…Ø­Ø¬ÙˆØ²
    for (const farm of hetznerFarms) {
      if (farm.live_status !== "idle") continue;
      if (farm.game_pid) continue;

      // normalize farm_id: "1" Ø£Ùˆ "001" â†’ "farm_001"
      const rawId  = farm.farm_id?.toString() || "";
      const numPad = rawId.replace(/\D/g, "").padStart(3, "0");
      const farmId = rawId.startsWith("farm_") ? rawId : `farm_${numPad}`;

      if (!assignedSet.has(farmId) && !assignedSet.has(rawId) && !assignedSet.has(numPad)) {
        return farmId;
      }
    }

    return null; // ÙƒÙ„ Ø§Ù„Ù€ containers Ù…Ø­Ø¬ÙˆØ²Ø©
  } catch (e) {
    console.error("getAvailableContainer error:", e);
    return null;
  }
}

// â”€â”€â”€ POST /api/farms/create â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function POST(req: Request) {
  try {
    const auth = await getUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, service } = auth;

    const body        = await req.json().catch(() => ({}));
    const name        = String(body?.name        ?? "").trim();
    const igg_email   = String(body?.igg_email   ?? "").trim() || null;
    const igg_password= String(body?.igg_password ?? "").trim() || null;

    if (!name) {
      return NextResponse.json({ error: "Ø§Ø³Ù… Ø§Ù„Ù…Ø²Ø±Ø¹Ø© Ù…Ø·Ù„ÙˆØ¨" }, { status: 400 });
    }

    // ØªØ­Ù‚Ù‚ Ù…Ù† ØªÙƒØ±Ø§Ø± Ø§Ù„Ø§Ø³Ù…
    const { data: existing } = await service
      .from("cloud_farms")
      .select("id")
      .eq("user_id", user.id)
      .eq("farm_name", name)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Ø§Ø³Ù… Ø§Ù„Ù…Ø²Ø±Ø¹Ø© Ù…Ø³ØªØ®Ø¯Ù… Ù…Ø³Ø¨Ù‚Ø§Ù‹" }, { status: 409 });
    }

    // ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù…
    const { count: userCount } = await service
      .from("cloud_farms")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "deleted");

    if ((userCount || 0) >= 50) {
      return NextResponse.json({ error: "ÙˆØµÙ„Øª Ù„Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ (50 Ù…Ø²Ø±Ø¹Ø©)" }, { status: 403 });
    }

    // ØªØ­Ù‚Ù‚ Ù…Ù† Ø³Ø¹Ø© Ø§Ù„Ø³ÙŠØ±ÙØ±
    const { data: serverData } = await service
      .from("cloud_servers")
      .select("current_farms, max_farms")
      .eq("server_id", "server-01")
      .single();

    const current = serverData?.current_farms || 0;
    const max     = serverData?.max_farms     || MAX_FARMS;

    if (current >= max) {
      return NextResponse.json({
        error: `Ø§Ù„Ø³ÙŠØ±ÙØ± Ù…Ù…ØªÙ„Ø¦ â€” ${current}/${max} Ù…Ø²Ø±Ø¹Ø©. ØªÙˆØ§ØµÙ„ Ù…Ø¹ Ø§Ù„Ø¯Ø¹Ù….`,
        code:  "SERVER_FULL",
      }, { status: 503 });
    }

    // Ø§Ø­ØµÙ„ Ø¹Ù„Ù‰ container ÙØ§Ø±Øº ÙˆØºÙŠØ± Ù…Ø­Ø¬ÙˆØ²
    let container_id: string | null = null;
    let adb_port: number | null = null;

    if (igg_email && igg_password) {
      const { data: assignedData } = await service.from("cloud_farms").select("container_id").neq("status","deleted").not("container_id","is",null); const assignedList = (assignedData||[]).map((f:any)=>f.container_id||""); container_id = await getAvailableContainer(assignedList);

      if (!container_id) {
        return NextResponse.json({
          error: `Ù„Ø§ ÙŠÙˆØ¬Ø¯ containers Ù…ØªØ§Ø­Ø© (${current}/${max} Ù…Ø³ØªØ®Ø¯Ù…) â€” Ø­Ø§ÙˆÙ„ Ù„Ø§Ø­Ù‚Ø§Ù‹`,
          code:  "NO_CONTAINER",
        }, { status: 503 });
      }

      // Ø§Ø­Ø³Ø¨ Ø§Ù„Ù€ port
      const num = parseInt(container_id.replace(/\D/g, ""));
      if (!isNaN(num)) adb_port = 5554 + num;
    }

    // Ø£Ù†Ø´Ø¦ Ø§Ù„Ù…Ø²Ø±Ø¹Ø© ÙÙŠ Supabase
    const { data: farm, error } = await service
      .from("cloud_farms")
      .insert({
        user_id:      user.id,
        farm_name:    name,
        server_id:    "server-01",
        container_id: container_id || null,
        adb_port:     adb_port     || null,
        game_account: igg_email    || "",
        status:       container_id ? "running" : "pending",
      })
      .select("id, farm_name, container_id, status, created_at")
      .single();

    if (error) {
      console.error("FARM INSERT ERROR:", JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ø³Ø¬Ù‘Ù„ Ø§Ù„Ø­Ø¯Ø«
    try {
      await service.from("farm_events").insert({
        user_id:    user.id,
        farm_name:  name,
        event_type: "farm_created",
        message:    `Created farm ${name} -> container ${container_id || "pending"}`,
        tasks:      [],
      });
    } catch {}

    // ØªØ³Ø¬ÙŠÙ„ Ø¯Ø®ÙˆÙ„ IGG Ø¨Ø´ÙƒÙ„ async
    if (container_id && igg_email && igg_password) {
      loginFarm({
        container_id,
        nickname:     name,
        igg_email,
        igg_password,
        user_id:      user.id,
      }).then(async (result) => {
        const status = result.ok ? "running" : "error";
        await service.from("cloud_farms")
          .update({ status, last_heartbeat: new Date().toISOString() })
          .eq("id", farm.id);
        try {
          await service.from("farm_events").insert({
            user_id:    user.id,
            farm_name:  name,
            event_type: result.ok ? "farm_started" : "error",
            message:    result.ok
              ? `IGG login success â€” container ${container_id}`
              : `IGG login failed: ${result.error}`,
            tasks: [],
          });
        } catch {}
      }).catch(console.error);
    }

    return NextResponse.json({
      ok:      true,
      farm,
      container: container_id,
      message: container_id
        ? `Ø¬Ø§Ø±Ù ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø¹Ù„Ù‰ container ${container_id}...`
        : "Ø§Ù„Ù…Ø²Ø±Ø¹Ø© Ù…Ù†Ø´Ø£Ø© â€” Ø£Ø¶Ù IGG credentials Ù„ØªÙØ¹ÙŠÙ„Ù‡Ø§",
    });

  } catch (e: any) {
    console.error("FARMS CREATE EXCEPTION:", e?.message);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

