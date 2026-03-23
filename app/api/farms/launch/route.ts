export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_PACKAGE,
  getCachedPackage,
  setCachedPackage,
  invalidateCache,
  recordFarmUsed,
  buildAdbUrl,
  adbHeaders,
  sendAdb,
  isMonkeySuccess,
  extractOutput,
  detectPackage,
  verifyLaunch,
  checkAppReadiness,
  getHetznerConfig,
} from "@/lib/launch-cache";
import type { ReadinessResult } from "@/lib/launch-cache";

// ── Helper: build success response with readiness info ───────
function successResponse(
  fields: Record<string, any>,
  readiness: ReadinessResult | null,
  logs: string[]
) {
  return NextResponse.json({
    ...fields,
    readiness: readiness
      ? {
          ready: readiness.ready,
          state: readiness.state,
          reason: readiness.reason,
          attempts: readiness.attempts,
          frames: readiness.frames,
          byteSize: readiness.byteSize,
          avgBrightness: readiness.avgBrightness,
          variance: readiness.variance,
          frameDiff: readiness.frameDiff,
          regions: readiness.regions,
        }
      : null,
    logs,
  });
}

export async function POST(req: Request) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[LAUNCH] ${msg}`);
    logs.push(msg);
  };

  try {
    log("Launch request received");

    // ── Auth ──
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
    if (!token) {
      log("ERROR: No auth token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data } = await service.auth.getUser(token);
    if (!data?.user) {
      log("ERROR: Invalid user token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { farm_id } = body;
    if (!farm_id) {
      log("ERROR: No farm_id");
      return NextResponse.json({ error: "farm_id required" }, { status: 400 });
    }
    log(`Farm: ${farm_id}`);

    const { host, apiKey } = getHetznerConfig();
    const adbUrl = buildAdbUrl(host);
    const hdrs = adbHeaders(apiKey);

    // Record usage for warmup prioritization
    await recordFarmUsed(farm_id);

    // ══════════════════════════════════════════════════════════
    // FAST PATH — cached package → 1 ADB call + verify + readiness
    // ══════════════════════════════════════════════════════════
    const cached = await getCachedPackage(farm_id);
    if (cached) {
      log(`CACHE HIT (Redis/mem): ${cached}`);
      const cmd = `exec:am start -n ${cached}/com.gpc.sdk.unity.GPCSDKMainActivity`;
      const result = await sendAdb(adbUrl, hdrs, farm_id, cmd);

      if (result && result.res.ok && (result.data.ok || extractOutput(result.data).includes("Starting: Intent"))) {
        // ── Quick verify ──
        const qv = await verifyLaunch(adbUrl, hdrs, farm_id, cached, "quick");
        if (qv.valid) {
          // ── Readiness check (1 attempt, fast path) ──
          log("Checking app readiness...");
          const rd = await checkAppReadiness(farm_id, 1, 1200);
          if (rd.ready) {
            log(`FAST SUCCESS: ${qv.method} fg=${qv.foreground || "ok"}, screen ${rd.reason} (${rd.byteSize}B, var=${rd.variance})`);
            return successResponse({
              ok: true,
              method: "am_start_cached",
              package: cached,
              cache: true,
              verified: true,
              verifyMethod: qv.method,
              foreground: qv.foreground,
              verifyAttempts: qv.attempts,
              ...result.data,
            }, rd, logs);
          }
          // Screen looks dead — retry am start + longer readiness check
          log(`Screen not ready (${rd.reason}, avg=${rd.avgBrightness}, var=${rd.variance}) — retrying am start`);
          const retry = await sendAdb(adbUrl, hdrs, farm_id, cmd);
          if (retry && retry.res.ok && (retry.data.ok || extractOutput(retry.data).includes("Starting: Intent"))) {
            const rd2 = await checkAppReadiness(farm_id, 2, 1500);
            log(`Retry readiness: ${rd2.reason} (${rd2.byteSize}B, var=${rd2.variance})`);
            return successResponse({
              ok: true,
              method: "am_start_cached_retry",
              package: cached,
              cache: true,
              verified: true,
              verifyMethod: qv.method,
              foreground: qv.foreground,
              verifyAttempts: qv.attempts,
              ...retry.data,
            }, rd2, logs);
          }
          // Retry monkey also failed — still return ok (verify passed)
          log("Retry monkey failed — returning with original verify");
          return successResponse({
            ok: true,
            method: "monkey_cached",
            package: cached,
            cache: true,
            verified: true,
            verifyMethod: qv.method,
            foreground: qv.foreground,
            verifyAttempts: qv.attempts,
            ...result.data,
          }, rd, logs);
        }
        // Quick verify failed — escalate to full retry before invalidating
        log(`Quick verify mismatch (${qv.method}): fg=${qv.foreground} — escalating`);
        const fv = await verifyLaunch(adbUrl, hdrs, farm_id, cached, "full");
        if (fv.valid) {
          const rd = await checkAppReadiness(farm_id, 2, 1500);
          log(`Full verify recovered: ${fv.method} fg=${fv.foreground || "ok"}, screen ${rd.reason}`);
          return successResponse({
            ok: true,
            method: "monkey_cached",
            package: cached,
            cache: true,
            verified: true,
            verifyMethod: fv.method,
            foreground: fv.foreground,
            verifyAttempts: 1 + fv.attempts,
            ...result.data,
          }, rd, logs);
        }
        log(`VERIFY FAIL (${1 + fv.attempts} total): expected=${cached} got=${fv.foreground} — invalidating`);
        await invalidateCache(farm_id);
      } else {
        log("CACHE STALE: monkey failed — invalidating");
        await invalidateCache(farm_id);
      }
    } else {
      log("CACHE MISS: no cached package");
    }

    // ══════════════════════════════════════════════════════════
    // SLOW PATH — detect → launch → verify → readiness → cache
    // ══════════════════════════════════════════════════════════

    // Step 1: detect
    log("Detecting package...");
    const detected = await detectPackage(adbUrl, hdrs, farm_id);
    const pkg = detected || DEFAULT_PACKAGE;
    log(`Package: ${pkg} (detected: ${!!detected})`);

    // Step 2: am start (primary — works reliably on redroid)
    log("Launching via am start...");
    const amCmd = `exec:am start -n ${pkg}/com.gpc.sdk.unity.GPCSDKMainActivity`;
    const amResult = await sendAdb(adbUrl, hdrs, farm_id, amCmd);

    if (amResult && amResult.res.ok && (amResult.data.ok || extractOutput(amResult.data).includes("Starting: Intent"))) {
      const vf = await verifyLaunch(adbUrl, hdrs, farm_id, pkg, "full");
      if (vf.valid) {
        await setCachedPackage(farm_id, pkg);
        const rd = await checkAppReadiness(farm_id, 2, 1500);
        log(`SUCCESS: am start — ${vf.method} fg=${vf.foreground || "ok"} (${vf.attempts} checks), screen ${rd.reason} — cached`);
        return successResponse({
          ok: true,
          method: "am_start",
          package: pkg,
          detected: !!detected,
          cache: false,
          verified: true,
          verifyMethod: vf.method,
          foreground: vf.foreground,
          verifyAttempts: vf.attempts,
          ...amResult.data,
        }, rd, logs);
      }
      log(`VERIFY FAIL after am start (${vf.method}, ${vf.attempts} attempts): expected=${pkg} got=${vf.foreground}`);
    } else {
      log(amResult ? "am start did not confirm success" : "am start call failed");
    }

    // Step 3: monkey (fallback)
    log("Fallback: monkey...");
    const monkeyCmd = `exec:monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`;
    const monkeyResult = await sendAdb(adbUrl, hdrs, farm_id, monkeyCmd);

    if (monkeyResult && isMonkeySuccess(monkeyResult.res, monkeyResult.data)) {
      const vf = await verifyLaunch(adbUrl, hdrs, farm_id, pkg, "full");
      if (vf.valid) {
        await setCachedPackage(farm_id, pkg);
        const rd = await checkAppReadiness(farm_id, 2, 1500);
        log(`SUCCESS: monkey — ${vf.method} fg=${vf.foreground || "ok"} (${vf.attempts} checks), screen ${rd.reason} — cached`);
        return successResponse({
          ok: true,
          method: "monkey",
          package: pkg,
          cache: false,
          verified: true,
          verifyMethod: vf.method,
          foreground: vf.foreground,
          verifyAttempts: vf.attempts,
          ...monkeyResult.data,
        }, rd, logs);
      }
      log(`VERIFY FAIL after monkey (${vf.method}, ${vf.attempts} attempts): got=${vf.foreground}`);
    }

    // Step 3b: am start with resolve
    log("Fallback: am start (resolve-activity)...");
    const amResolve = `exec:am start $(cmd package resolve-activity --brief -c android.intent.category.LAUNCHER ${pkg} | tail -n1)`;
    const am2 = await sendAdb(adbUrl, hdrs, farm_id, amResolve);

    if (am2 && am2.res.ok && am2.data.ok) {
      const vf = await verifyLaunch(adbUrl, hdrs, farm_id, pkg, "full");
      if (vf.valid) {
        await setCachedPackage(farm_id, pkg);
        const rd = await checkAppReadiness(farm_id, 2, 1500);
        log(`SUCCESS: am start (resolved) — ${vf.method} fg=${vf.foreground || "ok"} (${vf.attempts} checks), screen ${rd.reason} — cached`);
        return successResponse({
          ok: true,
          method: "am_start_resolved",
          package: pkg,
          cache: false,
          verified: true,
          verifyMethod: vf.method,
          foreground: vf.foreground,
          verifyAttempts: vf.attempts,
          ...am2.data,
        }, rd, logs);
      }
      log(`VERIFY FAIL after am resolve (${vf.method}, ${vf.attempts} attempts): got=${vf.foreground}`);
    }

    // Step 4: legacy (no verify, no readiness)
    log("Last resort: legacy endpoint...");
    try {
      const oldRes = await fetch(`https://${host}/api/farms/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ farm_id, command: monkeyCmd }),
        signal: AbortSignal.timeout(20000),
      });
      const oldData = await oldRes.json().catch(() => ({}));
      if (oldRes.ok && oldData.ok) {
        await setCachedPackage(farm_id, pkg);
        log("SUCCESS: legacy (no verify)");
        return successResponse({
          ok: true,
          method: "legacy",
          package: pkg,
          cache: false,
          verified: false,
          ...oldData,
        }, null, logs);
      }
    } catch (e: any) {
      log(`Legacy failed: ${e?.message}`);
    }

    log("FAILED: all methods exhausted");
    return NextResponse.json({
      ok: false,
      error: "Game launch failed — all methods attempted",
      package: pkg,
      detected: !!detected,
      logs,
    });
  } catch (e: any) {
    log(`FATAL: ${e?.message}`);
    return NextResponse.json({ error: e?.message, logs }, { status: 500 });
  }
}
