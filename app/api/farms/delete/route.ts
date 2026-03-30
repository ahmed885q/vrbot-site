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

    // تحقق من الملكية
    const { data: farm } = await service
      .from("cloud_farms")
      .select("id, farm_name, status")
      .eq("user_id", userData.user.id)
      .eq("farm_name", farmName)
      .single();

    if (!farm) {
      return NextResponse.json({ error: "Farm not found" }, { status: 404 });
    }

    // أوقف المزرعة على Hetzner أولاً (non-blocking)
    const HETZNER = process.env.HETZNER_IP || "88.99.64.19";
    fetch(`https://${HETZNER}/api/farms/stop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.VRBOT_API_KEY || "",
      },
      body: JSON.stringify({ farm_id: farmName }),
    }).catch(() => {});

    // احذف من Supabase
    const { error } = await service
      .from("cloud_farms")
      .delete()
      .eq("id", farm.id)
      .eq("user_id", userData.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // سجّل الحدث في farm_events
    try {
      await service.from("farm_events").insert({
        user_id:    userData.user.id,
        farm_name:  farmName,
        event_type: "farm_deleted",
        message:    `Deleted farm ${farmName}`,
        tasks:      [],
      });
    } catch {}

    return NextResponse.json({ ok: true, deleted: farmName });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
