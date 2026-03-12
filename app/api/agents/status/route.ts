import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

/**
 * POST /api/agents/status — Upsert agent status (from ws_hub or agent)
 * GET  /api/agents/status — List all agents for authenticated user
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      user_id, agent_id, device_id, status,
      bot_state, current_task, cycle,
      total_ok, total_fail, total_skip,
      uptime_seconds, game_restarts, captchas_detected,
      last_error, ip_address,
    } = body;

    if (!user_id || !agent_id) {
      return NextResponse.json({ error: "user_id and agent_id required" }, { status: 400 });
    }

    // Verify webhook secret for server-to-server calls
    const secret = req.headers.get("x-webhook-secret");
    const expected = process.env.WEBHOOK_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin.rpc("upsert_agent_status", {
      p_user_id: user_id,
      p_agent_id: agent_id,
      p_device_id: device_id || null,
      p_status: status || "online",
      p_bot_state: bot_state || null,
      p_current_task: current_task || null,
      p_cycle: cycle || null,
      p_total_ok: total_ok || null,
      p_total_fail: total_fail || null,
      p_total_skip: total_skip || null,
      p_uptime_seconds: uptime_seconds || null,
      p_game_restarts: game_restarts || null,
      p_captchas_detected: captchas_detected || null,
      p_last_error: last_error || null,
      p_ip_address: ip_address || null,
    });

    if (error) {
      console.error("upsert_agent_status error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, agent_db_id: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get user from auth header or query
    const userId = req.nextUrl.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("agents")
      .select("*")
      .eq("user_id", userId)
      .order("last_seen", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ agents: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
