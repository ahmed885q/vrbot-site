export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const farm_id = url.searchParams.get("farm_id");
  if (!farm_id)
    return NextResponse.json({ error: "farm_id required" }, { status: 400 });

  const nums = farm_id.match(/\d+/);
  const target = nums ? String(parseInt(nums[0])).padStart(3, "0") : "001";

  // Redirect to cloud.vrbot.me directly (client-side fetch)
  return NextResponse.redirect(
    `https://cloud.vrbot.me/screenshot/${target}`,
    { status: 302 }
  );
}
