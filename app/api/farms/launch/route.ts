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
    const HETZNER = process.env.HETZNER_IP || "cloud.vrbot.me";
    const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";
    const res = await fetch(`https://${HETZNER}/api/farms/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({ farm_id, command: "" }),
      signal: AbortSignal.timeout(15000),
    });
    const d = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok && d.ok, ...d });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
