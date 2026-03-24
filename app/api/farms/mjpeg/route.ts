// app/api/farms/mjpeg/route.ts
// Streams MJPEG directly from Hetzner to the browser
export const dynamic = "force-dynamic";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const farm_id = url.searchParams.get("farm_id") || "";

  // Calculate farm number
  let num = 1;
  const directMatch = farm_id.match(/farm[_-]?0*(\d+)/i);
  if (directMatch) {
    num = parseInt(directMatch[1]);
  } else {
    try {
      const service = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );
      const { data } = await service
        .from("cloud_farms")
        .select("container_id, adb_port")
        .eq("farm_name", farm_id)
        .single();
      if (data?.container_id) {
        const m = String(data.container_id).match(/\d+/);
        if (m) num = parseInt(m[0]);
      } else if (data?.adb_port) {
        num = data.adb_port - 5554;
      }
    } catch {}
  }

  const HETZNER_IP = "88.99.64.19";
  const mjpegPort  = 8080 + num; // farm_001=8081, farm_002=8082, ...

  try {
    const res = await fetch(`http://${HETZNER_IP}:${mjpegPort}/`, {
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok && res.body) {
      const contentType = res.headers.get("Content-Type") || "multipart/x-mixed-replace; boundary=frame";
      return new Response(res.body, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Access-Control-Allow-Origin": "*",
          "X-Farm": farm_id,
          "X-Port": String(mjpegPort),
        },
      });
    }
  } catch (e) {
    console.log(`MJPEG not available on port ${mjpegPort}, falling back to screenshot`);
  }

  // Fallback: regular screenshot
  const API_KEY = process.env.VRBOT_API_KEY || "";
  const HETZNER = process.env.HETZNER_IP || "cloud.vrbot.me";

  try {
    const res = await fetch(
      `https://${HETZNER}/api/screenshot/${num}?t=${Date.now()}`,
      { headers: { "X-API-Key": API_KEY }, signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) {
      const buf = await res.arrayBuffer();
      return new Response(buf, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-store",
        },
      });
    }
  } catch {}

  return new Response("Stream unavailable", { status: 503 });
}
