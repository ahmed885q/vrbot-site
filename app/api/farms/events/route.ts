export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");

  // Use farm_alerts table (existing) — type = event_type
  const { data, error } = await service
    .from("farm_alerts")
    .select("id, user_id, farm_id, type, severity, message, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map to event format for frontend
  const events = (data || []).map((a: any) => ({
    id:         a.id,
    farm_name:  a.farm_id || "unknown",
    event_type: a.type || "info",
    message:    a.message || "",
    severity:   a.severity || "info",
    tasks:      extractTasks(a.message),
    created_at: a.created_at,
  }));

  return NextResponse.json({ events });
}

function extractTasks(message: string): string[] {
  // Extract task names from message like "Tasks: Gather Resources, Mail Rewards"
  const match = message?.match(/Tasks?:\s*(.+)/i);
  if (match) return match[1].split(",").map((t: string) => t.trim()).filter(Boolean);
  return [];
}
