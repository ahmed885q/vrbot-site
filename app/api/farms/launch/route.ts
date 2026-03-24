export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LaunchSchema, validateBody } from "@/lib/schemas";

export async function POST(req: Request) {
  try {
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data } = await service.auth.getUser(token);
    if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rawBody = await req.json().catch(() => ({}));
    const { data: body, error: validationError } = validateBody(LaunchSchema, rawBody);
    if (validationError) {
      return NextResponse.json({ error: `Validation failed: ${validationError}` }, { status: 400 });
    }
    const { farm_id } = body;
    const HETZNER = process.env.HETZNER_IP || "cloud.vrbot.me";
    const API_KEY = process.env.VRBOT_API_KEY || "";
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
