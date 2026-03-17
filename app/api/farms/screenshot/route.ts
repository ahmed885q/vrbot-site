export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const farm_id = url.searchParams.get("farm_id");
    if (!farm_id) return NextResponse.json({ error: "farm_id required" }, { status: 400 });

    const HETZNER = process.env.HETZNER_IP || "88.99.64.19";
    const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";

    // جلب container_id من Supabase
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: farm } = await service
      .from("cloud_farms")
      .select("container_id, farm_name")
      .eq("farm_name", farm_id)
      .single();

    const target = farm?.container_id
      ? farm.container_id.replace("farm_", "")
      : farm_id.replace("farm_", "");

    // جلب الصورة من Hetzner
    const res = await fetch(
      `http://${HETZNER}:8888/api/screenshot/${target}`,
      {
        headers: { "X-API-Key": API_KEY },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Screenshot failed" }, { status: 502 });
    }

    const imageBuffer = await res.arrayBuffer();
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
