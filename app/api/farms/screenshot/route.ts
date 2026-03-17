export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const farm_id = url.searchParams.get("farm_id");
    if (!farm_id)
      return NextResponse.json({ error: "farm_id required" }, { status: 400 });

    const HETZNER = process.env.HETZNER_IP || "88.99.64.19";
    const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";

    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: farm } = await service
      .from("cloud_farms")
      .select("container_id, farm_name, status")
      .eq("farm_name", farm_id)
      .single();

    // ✅ FIX 1: إذا الفارم provisioning — ارجع 202 مع Retry-After
    // الـ frontend يقرأ هذا ويوقف الـ polling مؤقتاً
    if (!farm || farm.status === "provisioning" || farm.status === "pending") {
      return NextResponse.json(
        { status: "provisioning", message: "Farm is not ready yet" },
        {
          status: 202,
          headers: {
            "Retry-After": "30", // لا تحاول قبل 30 ثانية
            "X-Farm-Status": farm?.status || "unknown",
          },
        }
      );
    }

    const target = farm?.container_id
      ? farm.container_id.replace("farm_", "")
      : farm_id.replace("farm_", "");

    // تحقق من حالة الـ container
    try {
      const statusRes = await fetch(`http://${HETZNER}:8888/api/farms/status`, {
        headers: { "X-API-Key": API_KEY },
        signal: AbortSignal.timeout(5000),
      });

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const containerInfo = (statusData.farms || []).find(
          (f: any) => String(f.farm_id) === target || f.farm_id === target
        );

        // ✅ FIX 2: Container مش موجود أصلاً — ارجع 202 بدل 502
        if (!containerInfo) {
          return NextResponse.json(
            { status: "provisioning", message: "Container not found on server" },
            {
              status: 202,
              headers: { "Retry-After": "15" },
            }
          );
        }

        if (!containerInfo.game_pid) {
          fetch(`http://${HETZNER}:8888/api/farms/start`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": API_KEY,
            },
            body: JSON.stringify({ farm_id: target }),
            signal: AbortSignal.timeout(5000),
          }).catch(() => {});

          // ✅ FIX 3: اللعبة بتشتغل — ارجع 202 مع Retry-After
          return NextResponse.json(
            { status: "starting", message: "Game is starting..." },
            {
              status: 202,
              headers: { "Retry-After": "10" },
            }
          );
        }
      }
    } catch {
      // ✅ FIX 4: الـ orchestrator مش شغال — ارجع 503 بدل 502
      return NextResponse.json(
        { status: "offline", message: "Cloud server unreachable" },
        {
          status: 503,
          headers: { "Retry-After": "60" },
        }
      );
    }

    // جلب الصورة من Hetzner
    const res = await fetch(`http://${HETZNER}:8888/api/screenshot/${target}`, {
      headers: { "X-API-Key": API_KEY },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Screenshot failed", target, farm_id },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await res.json();
      if (!json.data) {
        return NextResponse.json({ error: "No screenshot data" }, { status: 502 });
      }
      const imageBuffer = Buffer.from(json.data, "base64");
      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-store, no-cache, max-age=0",
          "X-Container": target,
          "X-Farm": farm_id,
        },
      });
    }

    const imageBuffer = await res.arrayBuffer();
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType.includes("image") ? contentType : "image/jpeg",
        "Cache-Control": "no-store, no-cache, max-age=0",
        "X-Container": target,
        "X-Farm": farm_id,
      },
    });
  } catch (e: any) {
    console.error("screenshot error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
