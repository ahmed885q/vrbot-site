export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const HETZNER = () => process.env.HETZNER_IP || "cloud.vrbot.me";
const API_KEY = () => process.env.VRBOT_API_KEY || "";

export async function POST(req: Request) {
  try {
    // Auth check
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { farm_name, action } = body;

    if (!farm_name || !["start", "stop"].includes(action)) {
      return NextResponse.json({ error: "farm_name and action (start/stop) required" }, { status: 400 });
    }

    // Forward to Hetzner orchestrator
    const endpoint = action === "start"
      ? `https://${HETZNER()}/api/v1/ultra/start`
      : `https://${HETZNER()}/api/v1/ultra/stop`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY(),
      },
      body: JSON.stringify({ farm_name }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok && data.ok, ...data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
