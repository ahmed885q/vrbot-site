export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_KEY = process.env.VRBOT_API_KEY || "";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) =>
    v.replace(/[^0-9.]/g, "").split(".").map(Number);
  const [la, lb, lc] = parse(latest);
  const [ca, cb, cc] = parse(current);
  if (la !== ca) return la > ca;
  if (lb !== cb) return lb > cb;
  return lc > cc;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientVersion = searchParams.get("version") || "0.0.0";

  const supabase = db();

  const { data: release, error } = await supabase
    .from("vrbot_releases")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !release) {
    return NextResponse.json({ update_available: false });
  }

  if (!isNewer(release.version, clientVersion)) {
    return NextResponse.json({ update_available: false, version: release.version });
  }

  const files = (release.files || []).map((f: any) => {
    const { data: urlData } = supabase.storage
      .from("vrbot-updates")
      .getPublicUrl(`${release.version}/${f.name}`);
    return { name: f.name, url: urlData.publicUrl, md5: f.md5 || null };
  });

  return NextResponse.json({
    update_available: true,
    version: release.version,
    notes:   release.notes || "",
    files,
  });
}

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key") || "";
  if (!ADMIN_KEY || apiKey !== ADMIN_KEY) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { version, notes, files } = body;
  if (!version || !files?.length) {
    return NextResponse.json({ error: "version and files[] required" }, { status: 400 });
  }

  const supabase = db();

  // Deactivate old releases
  await supabase.from("vrbot_releases").update({ active: false }).eq("active", true);

  // Insert new release
  const { data, error } = await supabase
    .from("vrbot_releases")
    .insert({ version, notes: notes || "", files, active: true })
    .select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: `v${version} published`, release: data });
}
