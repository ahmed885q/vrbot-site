export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token || token === "undefined") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: userData } = await service.auth.getUser(token);
    if (!userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const farmName = url.searchParams.get("id") || url.searchParams.get("farm_id") || "";

    if (!farmName) {
      return NextResponse.json({ error: "farm_id required" }, { status: 400 });
    }

    // تحقق من الملكية — ابحث بـ farm_name أو id
    let farm: any = null;
    // Try by farm_name first
    const { data: byName } = await service
      .from("cloud_farms")
      .select("id, farm_name, status")
      .eq("user_id", userData.user.id)
      .eq("farm_name", farmName)
      .maybeSingle();
    farm = byName;

    // If not found, try by UUID id
    if (!farm) {
      const { data: byId } = await service
        .from("cloud_farms")
        .select("id, farm_name, status")
        .eq("user_id", userData.user.id)
        .eq("id", farmName)
        .maybeSingle();
      farm = byId;
    }

    if (!farm) {
      return NextResponse.json({ error: "Farm not found" }, { status: 404 });
    }

    // أوقف المزرعة على Hetzner أولاً (non-blocking)
    const HETZNER = process.env.HETZNER_IP || "cloud.vrbot.me";
    fetch(`https://${HETZNER}/api/farms/stop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.VRBOT_API_KEY || "",
      },
      body: JSON.stringify({ farm_id: farm.farm_name }),
    }).catch(() => {});

    // احذف من cloud_farms
    const { error } = await service
      .from("cloud_farms")
      .delete()
      .eq("id", farm.id)
      .eq("user_id", userData.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // احذف من user_farms أيضاً (إذا موجود)
    await service
      .from("user_farms")
      .delete()
      .eq("user_id", userData.user.id)
      .eq("name", farm.farm_name)
      .catch(() => {});

    // Invalidate the farms list cache for this user
    try {
      const { invalidateUserCache } = await import("@/app/api/farms/list/route");
      invalidateUserCache(userData.user.id);
    } catch {}

    // سجّل الحدث في farm_events
    try {
      await service.from("farm_events").insert({
        user_id:    userData.user.id,
        farm_name:  farm.farm_name,
        event_type: "farm_deleted",
        message:    `Deleted farm ${farm.farm_name}`,
        tasks:      [],
      });
    } catch {}

    return NextResponse.json({ ok: true, deleted: farm.farm_name });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
