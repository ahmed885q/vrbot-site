export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { resolveFarmNum } from "@/lib/farm-mapper";

/**
 * MJPEG stream proxy — forwards the Hetzner MJPEG stream to the browser.
 *
 * Usage: <img src="/api/farms/stream?farm_id=smz&quality=60&fps=4" />
 *
 * The browser natively renders multipart/x-mixed-replace as a live-updating
 * image — no JavaScript polling, no blob URLs, no React re-renders needed.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const farm_id = url.searchParams.get("farm_id");
    if (!farm_id)
      return new Response(JSON.stringify({ error: "farm_id required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });

    const quality = url.searchParams.get("quality") || "60";
    const fps = url.searchParams.get("fps") || "4";

    const HETZNER = process.env.HETZNER_IP || "cloud.vrbot.me";
    const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";

    // ── Resolve farm name → number (supports "smz", "farm_001", "3", etc.) ──
    const num = (await resolveFarmNum(farm_id)) ?? 1;

    // Connect to the Hetzner MJPEG stream using globalThis.fetch to bypass Next.js patching
    const streamUrl = `https://${HETZNER}/api/stream/${num}?quality=${quality}&fps=${fps}`;
    console.log(`[MJPEG] Proxying stream: ${streamUrl} (farm_id=${farm_id} → num=${num})`);

    const upstream = await globalThis.fetch(streamUrl, {
      headers: { "X-API-Key": API_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(120_000), // 2 min max per connection
    });

    if (!upstream.ok || !upstream.body) {
      console.error(`[MJPEG] Upstream failed: ${upstream.status}`);
      return new Response(
        JSON.stringify({ error: "Stream unavailable", status: upstream.status }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Pipe the MJPEG stream straight through to the browser
    return new Response(upstream.body as ReadableStream, {
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ||
          "multipart/x-mixed-replace; boundary=frame",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Farm": farm_id,
        "X-Num": String(num),
        "X-Quality": quality,
        "X-FPS": fps,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error(`[MJPEG] Error: ${msg}`);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
