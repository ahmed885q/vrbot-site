export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const farm_id = url.searchParams.get("farm_id");
    if (!farm_id)
      return NextResponse.json({ error: "farm_id required" }, { status: 400 });

    const HETZNER = process.env.HETZNER_IP || "cloud.vrbot.me";
    const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";

    const nums = farm_id.match(/\d+/);
    const num = nums ? parseInt(nums[0]) : 1;

    const res = await fetch(
      `https://${HETZNER}/api/screenshot/${num}?t=${Date.now()}`,
      {
        headers: { "X-API-Key": API_KEY },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Screenshot failed", num },
        { status: res.status }
      );
    }

    const imageBuffer = await res.arrayBuffer();
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, no-cache, max-age=0",
        "X-Farm": farm_id,
        "X-Num": String(num),
      },
    });
  } catch (e: any) {
    console.error("screenshot error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
