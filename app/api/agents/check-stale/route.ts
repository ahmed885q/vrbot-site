import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Protect with a secret header
  const authHeader = req.headers.get("x-cron-secret");
  if (authHeader !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseService();
  const staleThreshold = new Date(Date.now() - 90 * 1000).toISOString(); // 90s ago

  // Mark agents as offline if no heartbeat for 90s
  const { data, error } = await supabase
    .from("agents")
    .update({
      status: "offline",
      disconnected_at: new Date().toISOString(),
    })
    .eq("status", "online")
    .lt("last_heartbeat", staleThreshold)
    .select("id, agent_id, user_id");

  if (error) {
    console.error("check-stale error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const count = data?.length || 0;

  return NextResponse.json({
    ok: true,
    stale_agents_marked: count,
    checked_at: new Date().toISOString(),
  });
}
