export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { resolveFarmNum } from "@/lib/farm-mapper";

// Minimum useful screenshot size (bytes) — anything smaller is likely blank/error
const MIN_SCREENSHOT_BYTES = 5000;

export async function GET(req: Request) {
  const t0 = Date.now();
  try {
    const url = new URL(req.url);
    const farm_id = url.searchParams.get("farm_id");
    if (!farm_id)
      return NextResponse.json({ error: "farm_id required" }, { status: 400 });

    const HETZNER = process.env.HETZNER_IP || "cloud.vrbot.me";
    const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";

    // ── Resolve farm name → number ──
    // Priority: explicit ?num= param > farm-mapper Supabase lookup > fallback 1
    const explicitNum = url.searchParams.get("num");
    let num: number;
    if (explicitNum && /^\d+$/.test(explicitNum)) {
      num = parseInt(explicitNum);
    } else {
      num = (await resolveFarmNum(farm_id)) ?? 1;
    }
    const device = `172.17.0.${num + 1}:5555`;

    // ── Strategy 1: Hetzner screenshot endpoint ──────────────────
    let imageBuffer: ArrayBuffer | null = null;
    let source = "hetzner";

    try {
      const res = await fetch(
        `https://${HETZNER}/api/screenshot/${num}?t=${Date.now()}`,
        {
          headers: { "X-API-Key": API_KEY },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (res.ok) {
        imageBuffer = await res.arrayBuffer();
        if (imageBuffer.byteLength < MIN_SCREENSHOT_BYTES) {
          console.log(
            `[SCREENSHOT] ${farm_id} → farm${num} | hetzner returned small image (${imageBuffer.byteLength}B) — retrying`
          );
          imageBuffer = null; // trigger fallback
        }
      } else {
        console.log(
          `[SCREENSHOT] ${farm_id} → farm${num} | hetzner returned ${res.status}`
        );
      }
    } catch (e: any) {
      console.log(
        `[SCREENSHOT] ${farm_id} → farm${num} | hetzner error: ${e?.message}`
      );
    }

    // ── Strategy 2: ADB exec-out screencap fallback ──────────────
    if (!imageBuffer) {
      source = "adb-exec-out";
      try {
        const adbRes = await fetch(
          `https://${HETZNER}/api/farms/adb`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": API_KEY,
            },
            body: JSON.stringify({
              farm_id,
              command: `screencap:${device}`,
            }),
            signal: AbortSignal.timeout(10000),
          }
        );
        if (adbRes.ok) {
          const contentType = adbRes.headers.get("content-type") || "";
          if (contentType.includes("image")) {
            imageBuffer = await adbRes.arrayBuffer();
          } else {
            // ADB endpoint might return JSON with base64
            const data = await adbRes.json();
            if (data.screenshot) {
              const b64 = data.screenshot.replace(
                /^data:image\/\w+;base64,/,
                ""
              );
              const binary = Buffer.from(b64, "base64");
              imageBuffer = binary.buffer.slice(
                binary.byteOffset,
                binary.byteOffset + binary.byteLength
              );
            }
          }
        }
      } catch (e: any) {
        console.log(
          `[SCREENSHOT] ${farm_id} → farm${num} | adb fallback error: ${e?.message}`
        );
      }
    }

    // ── Strategy 3: Retry Hetzner once more (device may have been waking up) ─
    if (!imageBuffer || imageBuffer.byteLength < MIN_SCREENSHOT_BYTES) {
      source = "hetzner-retry";
      try {
        const res2 = await fetch(
          `https://${HETZNER}/api/screenshot/${num}?t=${Date.now()}&retry=1`,
          {
            headers: { "X-API-Key": API_KEY },
            signal: AbortSignal.timeout(8000),
          }
        );
        if (res2.ok) {
          const buf = await res2.arrayBuffer();
          if (buf.byteLength >= MIN_SCREENSHOT_BYTES) {
            imageBuffer = buf;
          }
        }
      } catch {}
    }

    const elapsed = Date.now() - t0;

    if (!imageBuffer || imageBuffer.byteLength < MIN_SCREENSHOT_BYTES) {
      console.log(
        `[SCREENSHOT] ${farm_id} → farm${num} | FAILED all strategies | ${elapsed}ms`
      );
      return NextResponse.json(
        { error: "Screenshot failed — blank or unavailable", farm_id, num, device },
        { status: 502 }
      );
    }

    console.log(
      `[SCREENSHOT] ${farm_id} → farm${num} | ${source} | ${imageBuffer.byteLength}B | ${elapsed}ms`
    );

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, no-cache, max-age=0",
        "X-Farm": farm_id,
        "X-Num": String(num),
        "X-Device": device,
        "X-Source": source,
        "X-Duration-Ms": String(elapsed),
        "X-Bytes": String(imageBuffer.byteLength),
      },
    });
  } catch (e: any) {
    const elapsed = Date.now() - t0;
    console.error(`[SCREENSHOT] error after ${elapsed}ms:`, e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
