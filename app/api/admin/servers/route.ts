export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_KEY = process.env.ADMIN_API_KEY || "vrbot_admin_2026";

export async function GET(req: Request) {
  const key = req.headers.get("X-Admin-Key");
  if (key !== ADMIN_KEY) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data } = await service.from("cloud_servers").select("*").order("created_at");
  return NextResponse.json({ servers: data || [] });
}

export async function POST(req: Request) {
  const key = req.headers.get("X-Admin-Key");
  if (key !== ADMIN_KEY) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { server_id, ip_address, max_farms, status: serverStatus, notes } = body;

  if (!server_id || !ip_address) {
    return NextResponse.json({ error: "server_id + ip_address required" }, { status: 400 });
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await service.from("cloud_servers").upsert({
    server_id,
    ip_address,
    max_farms: max_farms || 40,
    status: serverStatus || "online",
  }, { onConflict: "server_id" }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, server: data });
}
