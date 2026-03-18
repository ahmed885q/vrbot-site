export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Resolve a farm_name to a valid Hetzner container ID.
 * Returns the numeric/padded container ID (e.g., "001", "002") or null.
 */
async function resolveContainerId(
  service: any,
  farm_id: string,
  hetznerFarms: any[]
): Promise<string | null> {
  // 1. Try DB lookup
  const { data: farm } = await service
    .from("cloud_farms")
    .select("container_id")
    .eq("farm_name", farm_id)
    .single();

  const cid = farm?.container_id;
  if (cid) {
    // Clean it: "farm_001" → "001", "1" → "001"
    const num = cid.replace(/\D/g, "");
    if (num) return num.padStart(3, "0");
    return cid; // non-numeric container_id, use as-is
  }

  // 2. Try matching by farm_name in Hetzner response
  const match = hetznerFarms.find(
    (f: any) =>
      f.farm_name === farm_id ||
      f.name === farm_id ||
      f.farm_id === farm_id
  );
  if (match) {
    const id = String(match.farm_id || match.id || "");
    const num = id.replace(/\D/g, "");
    return num ? num.padStart(3, "0") : id;
  }

  // 3. If farm_id itself looks like a number/farm_XXX
  const numMatch = farm_id.match(/(\d+)/);
  if (numMatch) return numMatch[1].padStart(3, "0");

  return null;
}

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

    // Check farm exists and status
    const { data: farm } = await service
      .from("cloud_farms")
      .select("container_id, farm_name, status")
      .eq("farm_name", farm_id)
      .single();

    if (!farm || farm.status === "provisioning" || farm.status === "pending") {
      return NextResponse.json(
        { status: "provisioning", message: "Farm is not ready yet" },
        {
          status: 202,
          headers: {
            "Retry-After": "30",
            "X-Farm-Status": farm?.status || "unknown",
          },
        }
      );
    }

    // No container_id and farm_name is not numeric → can't take screenshot
    if (!farm.container_id && !/\d/.test(farm_id)) {
      return NextResponse.json(
        {
          status: "no_container",
          message: "المزرعة لم تُعيّن لها container بعد — فعّلها أولاً",
          farm_id,
        },
        { status: 202, headers: { "Retry-After": "30" } }
      );
    }

    // Fetch Hetzner status to resolve container + check game
    let hetznerFarms: any[] = [];
    try {
      const statusRes = await fetch(`http://${HETZNER}:8888/api/farms/status`, {
        headers: { "X-API-Key": API_KEY },
        signal: AbortSignal.timeout(5000),
      });
      if (statusRes.ok) {
        const d = await statusRes.json();
        hetznerFarms = d.farms || [];
      }
    } catch {
      return NextResponse.json(
        { status: "offline", message: "Cloud server unreachable" },
        { status: 503, headers: { "Retry-After": "60" } }
      );
    }

    // Resolve container ID
    const target = await resolveContainerId(service, farm_id, hetznerFarms);

    if (!target) {
      return NextResponse.json(
        {
          status: "no_container",
          message: "لا يمكن تحديد container المزرعة",
          farm_id,
          container_id: farm.container_id,
        },
        { status: 202, headers: { "Retry-After": "15" } }
      );
    }

    // Check if container exists and game is running
    const containerInfo = hetznerFarms.find((f: any) => {
      const fid = String(f.farm_id || f.id || "");
      const fnum = fid.replace(/\D/g, "").padStart(3, "0");
      return fid === target || fnum === target || fid === `farm_${target}`;
    });

    if (!containerInfo) {
      return NextResponse.json(
        { status: "provisioning", message: "Container not found on server" },
        { status: 202, headers: { "Retry-After": "15" } }
      );
    }

    if (!containerInfo.game_pid) {
      // Auto-start game
      fetch(`http://${HETZNER}:8888/api/farms/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify({ farm_id: target }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});

      return NextResponse.json(
        { status: "starting", message: "Game is starting..." },
        { status: 202, headers: { "Retry-After": "10" } }
      );
    }

    // Try screenshot from fast server (port 8890) first, fall back to 8888
    let res: Response | null = null;
    const paddedTarget = target.padStart(3, "0");

    try {
      res = await fetch(`http://${HETZNER}:8890/screenshot/${paddedTarget}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) res = null;
    } catch {
      res = null;
    }

    // Fallback to port 8888 API
    if (!res) {
      try {
        res = await fetch(`http://${HETZNER}:8888/api/screenshot/${target}`, {
          headers: { "X-API-Key": API_KEY },
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        return NextResponse.json(
          { error: "Screenshot failed", target, farm_id },
          { status: 502 }
        );
      }
    }

    if (!res || !res.ok) {
      return NextResponse.json(
        { error: "Screenshot failed", target, farm_id },
        { status: res?.status === 404 ? 404 : 502 }
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
