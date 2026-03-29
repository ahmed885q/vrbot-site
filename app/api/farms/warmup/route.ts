export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  setCachedPackage,
  detectPackage,
  buildAdbUrl,
  adbHeaders,
  getHetznerConfig,
  getCacheStats,
  prioritizeFarms,
  DEFAULT_PACKAGE,
} from "@/lib/launch-cache";

// ═══════════════════════════════════════════════════════════════════
// SMART WARMUP — Prioritized background package pre-detection
// ═══════════════════════════════════════════════════════════════════
// Accepts farm IDs + optional last-used hints from the frontend.
// Scores farms by: (1) cache miss → highest priority, (2) recency
// of last use → exponential decay bonus. Only warms the top N.
//
// POST /api/farms/warmup
// Body: {
//   farm_ids: ["farm_1", "farm_2"],
//   hints?: { "farm_1": 1711234567890 }  // optional client-side last_used_ts
// }
// ═══════════════════════════════════════════════════════════════════

// Rate limit: 1 warmup per 60s per process
let lastWarmupTs = 0;
const WARMUP_COOLDOWN_MS = 60_000;

// Max farms to warm per request
const MAX_WARMUP_BATCH = 5;

// Min priority score to bother warming (skip never-used + already-cached)
const MIN_PRIORITY_THRESHOLD = 5;

export async function POST(req: Request) {
  try {
    // ── Auth ──
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data } = await service.auth.getUser(token);
    if (!data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Rate limit ──
    const now = Date.now();
    if (now - lastWarmupTs < WARMUP_COOLDOWN_MS) {
      const stats = getCacheStats();
      return NextResponse.json({
        ok: true,
        warmed: 0,
        skipped: "cooldown",
        cached: stats.memoryEntries,
      });
    }
    lastWarmupTs = now;

    // ── Parse request ──
    const body = await req.json().catch(() => ({}));
    const farmIds: string[] = body.farm_ids || [];
    const hints: Record<string, number> | undefined = body.hints;

    if (!Array.isArray(farmIds) || farmIds.length === 0) {
      return NextResponse.json({ ok: true, warmed: 0, reason: "no farms" });
    }

    // ── Prioritize farms ──
    const ranked = await prioritizeFarms(farmIds, hints);

    // Filter: skip farms that already have cache AND have low priority
    const toWarm = ranked
      .filter((c) => !c.hasCached || c.priority >= MIN_PRIORITY_THRESHOLD)
      .filter((c) => !c.hasCached) // only warm uncached
      .slice(0, MAX_WARMUP_BATCH);

    const alreadyCached = ranked.filter((c) => c.hasCached).length;
    const belowThreshold = ranked.length - alreadyCached - toWarm.length;

    console.log(
      `[WARMUP] Ranked ${ranked.length} farms: ` +
      `${toWarm.length} to detect, ${alreadyCached} cached, ${belowThreshold} skipped (low priority)`
    );

    if (toWarm.length === 0) {
      return NextResponse.json({
        ok: true,
        warmed: 0,
        alreadyCached,
        belowThreshold,
        total: farmIds.length,
      });
    }

    // ── Detect in parallel ──
    const { host, apiKey } = getHetznerConfig();
    const adbUrl = buildAdbUrl(host);
    const hdrs = adbHeaders(apiKey);

    const results = await Promise.allSettled(
      toWarm.map(async (candidate) => {
        const detected = await detectPackage(adbUrl, hdrs, candidate.farmId);
        const pkg = detected || DEFAULT_PACKAGE;
        await setCachedPackage(candidate.farmId, pkg);
        console.log(
          `[WARMUP] ${candidate.farmId}: ${pkg} (detected: ${!!detected}, priority: ${candidate.priority.toFixed(1)})`
        );
        return { farmId: candidate.farmId, pkg, detected: !!detected };
      })
    );

    const warmed = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(
      `[WARMUP] Done: ${warmed} warmed, ${failed} failed, ${alreadyCached} already cached`
    );

    return NextResponse.json({
      ok: true,
      warmed,
      failed,
      alreadyCached,
      belowThreshold,
      total: farmIds.length,
    });
  } catch (e: any) {
    console.error("[WARMUP] Error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
