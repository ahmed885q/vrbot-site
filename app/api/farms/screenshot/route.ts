export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const farm_id = url.searchParams.get("farm_id");
    if (!farm_id)
      return NextResponse.json({ error: "farm_id required" }, { status: 400 });

    const HETZNER = process.env.HETZNER_IP || "88.99.64.19";

    // ?????? ????? ?? farm_id
    const nums = farm_id.match(/\d+/);
    const target = nums ? String(parseInt(nums[0])).padStart(3, "0") : "001";

    // ???? ?????? ?????? ?? screenshot server
    const res = await fetch(`https://cloud.vrbot.me/screenshot/${target}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Screenshot failed", target },
        { status: res.status }
      );
    }

    const imageBuffer = await res.arrayBuffer();
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store, no-cache, max-age=0",
        "X-Farm": farm_id,
        "X-Container": target,
      },
    });
  } catch (e: any) {
    console.error("screenshot error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

