export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

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

export async function POST(req: Request) {
  try {
    const auth = await getUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { farm_id, command } = body;
    if (!farm_id || !command) return NextResponse.json({ error: "farm_id and command required" }, { status: 400 });
    const HETZNER = process.env.HETZNER_IP || "cloud.vrbot.me";
    const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";
    const res = await fetch(`https://${HETZNER}/api/farms/adb`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({ farm_id, command }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok && data.ok, ...data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
