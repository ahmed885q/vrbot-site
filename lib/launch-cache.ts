// ═══════════════════════════════════════════════════════════════════
// LAUNCH CACHE — Distributed package cache (Redis → memory fallback)
// ═══════════════════════════════════════════════════════════════════
// Two-layer cache: L1 (in-memory Map) + L2 (Redis).
// Tracks last-used timestamp per farm for smart warmup prioritization.
// ═══════════════════════════════════════════════════════════════════

import { getKey, setEx } from "@/lib/redis";

// ── Constants ────────────────────────────────────────────────
export const DEFAULT_PACKAGE = "com.igg.android.vikingriseglobal";
export const PACKAGE_CANDIDATES = [
  "com.igg.android.vikingriseglobal",
  "com.igg.android.vikingrise",
  "com.igg.vikingrise",
  "com.igg.android.viking",
];

const CACHE_TTL_SECONDS = 30 * 60; // 30 min
const REDIS_PKG_PREFIX = "pkg:";
const REDIS_USED_PREFIX = "farm_used:";
const USED_TTL_SECONDS = 24 * 60 * 60; // 24h

// ── L1 in-memory (hot path, same process) ────────────────────
interface CacheEntry {
  pkg: string;
  ts: number;
}
const memCache = new Map<string, CacheEntry>();
const MEM_TTL_MS = CACHE_TTL_SECONDS * 1000;
const MEM_MAX = 200;

// ── Last-used tracking (L1 memory) ───────────────────────────
const lastUsedMem = new Map<string, number>();

// ═══════════════════════════════════════════════════════════════
// PACKAGE CACHE — read / write / invalidate
// ═══════════════════════════════════════════════════════════════

export async function getCachedPackage(farmId: string): Promise<string | null> {
  // L1
  const mem = memCache.get(farmId);
  if (mem && Date.now() - mem.ts < MEM_TTL_MS) {
    return mem.pkg;
  }

  // L2
  try {
    const val = await getKey(`${REDIS_PKG_PREFIX}${farmId}`);
    if (val && val.length > 0) {
      memCache.set(farmId, { pkg: val, ts: Date.now() });
      return val;
    }
  } catch {}

  if (mem) memCache.delete(farmId);
  return null;
}

export async function setCachedPackage(farmId: string, pkg: string): Promise<void> {
  // L1 — evict oldest if at capacity
  if (memCache.size >= MEM_MAX) {
    let oldestKey: string | null = null;
    let oldestTs = Infinity;
    memCache.forEach((v, k) => {
      if (v.ts < oldestTs) { oldestTs = v.ts; oldestKey = k; }
    });
    if (oldestKey) memCache.delete(oldestKey);
  }
  memCache.set(farmId, { pkg, ts: Date.now() });

  // L2
  try {
    await setEx(`${REDIS_PKG_PREFIX}${farmId}`, pkg, CACHE_TTL_SECONDS);
  } catch {}
}

export async function invalidateCache(farmId: string): Promise<void> {
  memCache.delete(farmId);
  try {
    await setEx(`${REDIS_PKG_PREFIX}${farmId}`, "", 1);
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
// LAST-USED TRACKING — used by smart warmup prioritization
// ═══════════════════════════════════════════════════════════════

export async function recordFarmUsed(farmId: string): Promise<void> {
  const now = Date.now();
  lastUsedMem.set(farmId, now);
  try {
    await setEx(`${REDIS_USED_PREFIX}${farmId}`, String(now), USED_TTL_SECONDS);
  } catch {}
}

export async function getFarmLastUsed(farmId: string): Promise<number> {
  // L1
  const mem = lastUsedMem.get(farmId);
  if (mem) return mem;

  // L2
  try {
    const val = await getKey(`${REDIS_USED_PREFIX}${farmId}`);
    if (val) {
      const ts = parseInt(val, 10);
      if (!isNaN(ts)) {
        lastUsedMem.set(farmId, ts);
        return ts;
      }
    }
  } catch {}

  return 0; // never used
}

// ═══════════════════════════════════════════════════════════════
// WARMUP PRIORITIZATION
// ═══════════════════════════════════════════════════════════════

export interface WarmupCandidate {
  farmId: string;
  lastUsed: number;   // 0 = never
  hasCached: boolean;
  priority: number;    // higher = warm first
}

/**
 * Score and sort farms for warmup. Higher priority = more important to warm.
 * - Recently used farms score higher (recency bonus decays over hours)
 * - Farms without a cache entry get a big boost
 * - Farms with hints from the frontend (last_used_ts) get their real timestamp
 */
export async function prioritizeFarms(
  farmIds: string[],
  hints?: Record<string, number> // farmId → client-side last_used_ts
): Promise<WarmupCandidate[]> {
  const now = Date.now();
  const candidates: WarmupCandidate[] = [];

  for (const fid of farmIds) {
    const cached = await getCachedPackage(fid);
    const serverLastUsed = await getFarmLastUsed(fid);
    const clientHint = hints?.[fid] || 0;
    const lastUsed = Math.max(serverLastUsed, clientHint);

    // Priority scoring:
    // +100 if no cache (needs warming most)
    // +recency bonus: 50 * e^(-hoursAgo/4) — decays with a 4h half-life
    const hoursAgo = lastUsed > 0 ? (now - lastUsed) / 3_600_000 : 999;
    const recencyBonus = lastUsed > 0 ? 50 * Math.exp(-hoursAgo / 4) : 0;
    const cacheMiss = cached ? 0 : 100;
    const priority = cacheMiss + recencyBonus;

    candidates.push({
      farmId: fid,
      lastUsed,
      hasCached: !!cached,
      priority,
    });
  }

  // Sort descending by priority
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates;
}

// ═══════════════════════════════════════════════════════════════
// POST-LAUNCH VERIFICATION — confirm correct app in foreground
// ═══════════════════════════════════════════════════════════════
// Two detection strategies:
//   1. "dumpsys activity top" — shows the RESUMED activity (strongest signal)
//   2. "dumpsys window"       — shows focused window (fallback)
// Two verification modes:
//   - "quick" — single check after 700ms (for cache-hit fast path)
//   - "full"  — up to 3 retries with delays (for slow-path launches)
// ═══════════════════════════════════════════════════════════════

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchesTarget(pkg: string, expectedPkg: string): boolean {
  return PACKAGE_CANDIDATES.includes(pkg) || pkg === expectedPkg;
}

/**
 * Strategy 1 (preferred): `dumpsys activity activities`
 * Returns the package of the mResumedActivity, or null.
 * Output line: "mResumedActivity: ActivityRecord{... com.igg.android.vikingriseglobal/...}"
 * Falls back to "Resumed:" line format as well.
 */
async function getTopActivity(
  adbUrl: string,
  hdrs: Record<string, string>,
  farmId: string
): Promise<string | null> {
  const result = await sendAdb(
    adbUrl, hdrs, farmId,
    "exec:dumpsys activity activities | grep -E 'mResumedActivity|Resumed:'",
    5000
  );
  if (!result) return null;

  const output = extractOutput(result.data);
  if (typeof output !== "string" || output.length === 0) return null;

  // Match "mResumedActivity: ActivityRecord{... com.pkg.name/com.pkg.Activity ...}"
  // or "Resumed: ActivityRecord{... com.pkg.name/com.pkg.Activity ...}"
  const activityMatch = output.match(
    /(?:mResumedActivity|Resumed):\s*ActivityRecord\{[^\s]*\s+\S+\s+([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*){2,})\//
  );
  if (activityMatch) return activityMatch[1];

  // Broader fallback: any package-looking string followed by /
  const fallback = output.match(
    /([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*){2,})\//
  );
  if (fallback) return fallback[1];
  return null;
}

/**
 * Strategy 2 (fallback): `dumpsys window`
 * Returns the package from mCurrentFocus / mFocusedApp, or null.
 */
async function getFocusedWindow(
  adbUrl: string,
  hdrs: Record<string, string>,
  farmId: string
): Promise<string | null> {
  const result = await sendAdb(
    adbUrl, hdrs, farmId,
    "exec:dumpsys window | grep -E 'mCurrentFocus|mFocusedApp'",
    5000
  );
  if (!result) return null;

  const output = extractOutput(result.data);
  if (typeof output !== "string" || output.length === 0) return null;

  for (const candidate of PACKAGE_CANDIDATES) {
    if (output.includes(candidate)) return candidate;
  }
  const match = output.match(
    /([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*){2,})\//
  );
  return match ? match[1] : null;
}

/**
 * Combined foreground detection: tries activity top first, falls back to window.
 */
export async function getForegroundPackage(
  adbUrl: string,
  hdrs: Record<string, string>,
  farmId: string
): Promise<string | null> {
  // Prefer activity-based detection (strongest signal)
  const activity = await getTopActivity(adbUrl, hdrs, farmId);
  if (activity) return activity;

  // Fallback: window focus
  return getFocusedWindow(adbUrl, hdrs, farmId);
}

// ── Verification results ─────────────────────────────────────
export interface VerifyResult {
  valid: boolean;
  foreground: string | null;
  attempts: number;
  method: "activity" | "window" | "inconclusive";
}

/**
 * Quick verify — single check after a short delay.
 * Used by the fast path (cached launches) to keep latency low.
 * On success → returns immediately.
 * On failure or inconclusive → caller should escalate to fullVerify.
 */
export async function quickVerify(
  adbUrl: string,
  hdrs: Record<string, string>,
  farmId: string,
  expectedPkg: string
): Promise<VerifyResult> {
  await sleep(700);

  // Try activity-based check first (most accurate)
  const activity = await getTopActivity(adbUrl, hdrs, farmId);
  if (activity) {
    return {
      valid: matchesTarget(activity, expectedPkg),
      foreground: activity,
      attempts: 1,
      method: "activity",
    };
  }

  // Fallback to window check
  const window = await getFocusedWindow(adbUrl, hdrs, farmId);
  if (window) {
    return {
      valid: matchesTarget(window, expectedPkg),
      foreground: window,
      attempts: 1,
      method: "window",
    };
  }

  // Can't determine — inconclusive, assume ok
  return { valid: true, foreground: null, attempts: 1, method: "inconclusive" };
}

/**
 * Full verify — retried check with delays.
 * Used by the slow path, or as escalation when quickVerify fails.
 * Only returns valid:false after confirmed mismatch across all retries.
 */
export async function fullVerify(
  adbUrl: string,
  hdrs: Record<string, string>,
  farmId: string,
  expectedPkg: string
): Promise<VerifyResult> {
  const RETRY_DELAY_MS = 600;
  const MAX_ATTEMPTS = 3;

  let lastFg: string | null = null;
  let lastMethod: VerifyResult["method"] = "inconclusive";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Try activity first, then window
    const activity = await getTopActivity(adbUrl, hdrs, farmId);
    if (activity) {
      lastFg = activity;
      lastMethod = "activity";
      if (matchesTarget(activity, expectedPkg)) {
        return { valid: true, foreground: activity, attempts: attempt, method: "activity" };
      }
    } else {
      const window = await getFocusedWindow(adbUrl, hdrs, farmId);
      if (window) {
        lastFg = window;
        lastMethod = "window";
        if (matchesTarget(window, expectedPkg)) {
          return { valid: true, foreground: window, attempts: attempt, method: "window" };
        }
      } else {
        // Both inconclusive → assume ok (safe fail)
        return { valid: true, foreground: null, attempts: attempt, method: "inconclusive" };
      }
    }

    // Mismatch on this attempt — wait before retry
    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS);
    }
  }

  // Confirmed mismatch across all retries
  return { valid: false, foreground: lastFg, attempts: MAX_ATTEMPTS, method: lastMethod };
}

/**
 * Main verify entry point.
 * - "quick" mode: single fast check (cache-hit fast path)
 * - "full" mode: retried check (slow path / escalation)
 */
export async function verifyLaunch(
  adbUrl: string,
  hdrs: Record<string, string>,
  farmId: string,
  expectedPkg: string,
  mode: "quick" | "full" = "full"
): Promise<VerifyResult> {
  if (mode === "quick") {
    return quickVerify(adbUrl, hdrs, farmId, expectedPkg);
  }
  // Full mode: initial delay then retries
  await sleep(800);
  return fullVerify(adbUrl, hdrs, farmId, expectedPkg);
}

// ═══════════════════════════════════════════════════════════════
// ADB HELPERS (shared by launch + warmup)
// ═══════════════════════════════════════════════════════════════

export function buildAdbUrl(hetzner: string) {
  return `https://${hetzner}/api/farms/adb`;
}

export function adbHeaders(apiKey: string) {
  return { "Content-Type": "application/json", "X-API-Key": apiKey } as Record<string, string>;
}

export async function sendAdb(
  url: string,
  headers: Record<string, string>,
  farmId: string,
  command: string,
  timeoutMs = 10000
): Promise<{ res: Response; data: any } | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ farm_id: farmId, command }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  } catch {
    return null;
  }
}

export function extractOutput(data: any): string {
  return data?.output || data?.stdout || data?.result || "";
}

export function isMonkeySuccess(res: Response, data: any): boolean {
  const output = extractOutput(data);
  const hasInjected =
    typeof output === "string" && output.includes("Events injected: 1");
  // monkey on redroid/Docker often exits 251 (ok:false) but still launches the app
  return (
    res.ok && (data.ok === true || hasInjected)
  ) || hasInjected;
}

// ── Package detection ────────────────────────────────────────
export async function detectPackage(
  adbUrl: string,
  hdrs: Record<string, string>,
  farmId: string
): Promise<string | null> {
  const result = await sendAdb(
    adbUrl, hdrs, farmId,
    "exec:pm list packages | grep -i viking"
  );
  if (!result) return null;

  const output = extractOutput(result.data);
  if (typeof output === "string") {
    for (const candidate of PACKAGE_CANDIDATES) {
      if (output.includes(candidate)) return candidate;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// APP READINESS — multi-frame analysis with state classification
// ═══════════════════════════════════════════════════════════════
// Captures 2–3 screenshots over ~1.5s. For each frame:
//   - Analyzes 5 regions (top, center, bottom, left edge, right edge)
//   - Checks brightness, variance, and region differences
// Across frames:
//   - Compares inter-frame variance to detect stuck/frozen screens
//   - Detects loading patterns (low center variance + static frames)
//
// States: ready | loading | blocked | unknown
// Never blocks launch — only reports richer state info.
// ═══════════════════════════════════════════════════════════════

export type ReadinessState = "ready" | "loading" | "blocked" | "unknown";

export interface ReadinessResult {
  ready: boolean;
  state: ReadinessState;
  reason: string;
  byteSize: number;
  avgBrightness: number;
  variance: number;
  regions: RegionStats | null;
  frameDiff: number;
  frames: number;
  attempts: number;
}

interface RegionStats {
  top:    { avg: number; var: number };
  center: { avg: number; var: number };
  bottom: { avg: number; var: number };
  left:   { avg: number; var: number };
  right:  { avg: number; var: number };
}

interface FrameAnalysis {
  byteSize: number;
  avgBrightness: number;
  variance: number;
  regions: RegionStats;
  fingerprint: number; // fast hash for inter-frame diff
}

// ── Screenshot fetch ─────────────────────────────────────────
async function fetchScreenshot(
  hetzner: string,
  apiKey: string,
  farmId: string,
  timeoutMs = 6000
): Promise<Uint8Array | null> {
  const nums = farmId.match(/\d+/);
  const num = nums ? parseInt(nums[0]) : 1;
  try {
    const res = await fetch(
      `https://${hetzner}/api/screenshot/${num}?t=${Date.now()}`,
      {
        headers: { "X-API-Key": apiKey },
        signal: AbortSignal.timeout(timeoutMs),
      }
    );
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

// ── Region-based byte analysis ───────────────────────────────
// Divides the byte stream into 5 logical regions based on position.
// For compressed PNG/JPEG, byte position roughly correlates with
// spatial position (top of image → early bytes, bottom → late bytes).

function sampleRegion(
  data: Uint8Array,
  startFrac: number,
  endFrac: number,
  step: number
): { avg: number; var: number } {
  const start = Math.floor(data.length * startFrac);
  const end = Math.floor(data.length * endFrac);
  let sum = 0, sumSq = 0, count = 0;
  for (let i = start; i < end; i += step) {
    const v = data[i];
    sum += v;
    sumSq += v * v;
    count++;
  }
  if (count === 0) return { avg: 0, var: 0 };
  const avg = sum / count;
  return { avg: Math.round(avg), var: Math.round((sumSq / count) - avg * avg) };
}

function analyzeFrame(data: Uint8Array): FrameAnalysis {
  const STEP = 31; // prime step for good sampling distribution
  const HEADER_FRAC = 0.02; // skip ~2% header

  // Global stats
  let sum = 0, sumSq = 0, count = 0, fp = 0;
  const start = Math.floor(data.length * HEADER_FRAC);
  for (let i = start; i < data.length; i += STEP) {
    const v = data[i];
    sum += v;
    sumSq += v * v;
    fp = ((fp * 31) + v) | 0; // rolling hash for fingerprint
    count++;
  }
  const avg = count > 0 ? sum / count : 0;
  const variance = count > 0 ? (sumSq / count) - avg * avg : 0;

  // Region sampling (approximate spatial mapping via byte position)
  // top: 2-20%, center: 35-65%, bottom: 80-98%, left: 2-15%, right: 85-98%
  const regions: RegionStats = {
    top:    sampleRegion(data, 0.02, 0.20, STEP),
    center: sampleRegion(data, 0.35, 0.65, STEP),
    bottom: sampleRegion(data, 0.80, 0.98, STEP),
    left:   sampleRegion(data, 0.02, 0.15, STEP * 3), // smaller region → wider step
    right:  sampleRegion(data, 0.85, 0.98, STEP * 3),
  };

  return {
    byteSize: data.length,
    avgBrightness: Math.round(avg),
    variance: Math.round(variance),
    regions,
    fingerprint: Math.abs(fp),
  };
}

// ── Thresholds ───────────────────────────────────────────────
const MIN_BYTES = 8_000;
const MIN_VARIANCE = 200;
const BLACK_THRESH = 30;
const WHITE_THRESH = 240;
const CENTER_SPINNER_VAR = 150;     // low center var = possible spinner
const EDGE_UI_VAR = 300;            // edges need variance for UI bars
const FRAME_DIFF_FROZEN = 50;       // fingerprint diff below = frozen

// ── Single-frame classification ──────────────────────────────
function classifySingle(f: FrameAnalysis): { state: ReadinessState; reason: string } {
  if (f.byteSize < MIN_BYTES) {
    return { state: "blocked", reason: "too_small" };
  }
  if (f.avgBrightness < BLACK_THRESH && f.variance < MIN_VARIANCE) {
    return { state: "blocked", reason: "black_screen" };
  }
  if (f.avgBrightness > WHITE_THRESH && f.variance < MIN_VARIANCE) {
    return { state: "loading", reason: "white_screen" };
  }
  // Loading spinner pattern: low center variance, some edge content
  if (f.regions.center.var < CENTER_SPINNER_VAR && f.variance < MIN_VARIANCE) {
    return { state: "loading", reason: "low_center_variance" };
  }
  // Solid color screen (not black/white but uniform)
  if (f.variance < MIN_VARIANCE) {
    return { state: "loading", reason: "low_variance" };
  }
  // Missing UI bars: top and bottom should have distinct content
  if (f.regions.top.var < 100 && f.regions.bottom.var < 100 && f.regions.center.var > EDGE_UI_VAR) {
    return { state: "loading", reason: "no_ui_bars" };
  }
  return { state: "ready", reason: "ok" };
}

// ── Multi-frame classification ───────────────────────────────
function classifyMultiFrame(
  frames: FrameAnalysis[]
): { state: ReadinessState; reason: string; frameDiff: number } {
  if (frames.length === 0) {
    return { state: "unknown", reason: "no_frames", frameDiff: 0 };
  }
  if (frames.length === 1) {
    const s = classifySingle(frames[0]);
    return { ...s, frameDiff: 0 };
  }

  // Compute inter-frame differences
  let totalDiff = 0;
  let diffCount = 0;
  for (let i = 1; i < frames.length; i++) {
    // Fingerprint diff — fast proxy for visual change between frames
    const fpDiff = Math.abs(frames[i].fingerprint - frames[i - 1].fingerprint);
    // Variance diff — structural change
    const varDiff = Math.abs(frames[i].variance - frames[i - 1].variance);
    // Size diff — compression change indicates visual change
    const sizeDiff = Math.abs(frames[i].byteSize - frames[i - 1].byteSize);
    totalDiff += fpDiff + varDiff + sizeDiff;
    diffCount++;
  }
  const avgDiff = diffCount > 0 ? Math.round(totalDiff / diffCount) : 0;

  // Use the latest frame for single-frame classification
  const latest = classifySingle(frames[frames.length - 1]);

  // If single-frame says ready but frames are frozen → loading/stuck
  if (latest.state === "ready" && avgDiff < FRAME_DIFF_FROZEN) {
    return { state: "loading", reason: "frozen_frames", frameDiff: avgDiff };
  }

  // If single-frame says loading but frames are changing → still loading (not blocked)
  if (latest.state === "loading" && avgDiff > FRAME_DIFF_FROZEN) {
    return { state: "loading", reason: latest.reason + "_changing", frameDiff: avgDiff };
  }

  // If single-frame says blocked and frames are frozen → confirmed blocked
  if (latest.state === "blocked" && avgDiff < FRAME_DIFF_FROZEN) {
    return { state: "blocked", reason: latest.reason + "_confirmed", frameDiff: avgDiff };
  }

  return { ...latest, frameDiff: avgDiff };
}

// ═══════════════════════════════════════════════════════════════
// MAIN READINESS CHECK — multi-frame with classification
// ═══════════════════════════════════════════════════════════════

/**
 * Capture multiple frames and classify app readiness state.
 *
 * @param farmId    - farm identifier
 * @param numFrames - frames to capture (2-3)
 * @param delayMs   - initial delay before first capture
 * @param gapMs     - gap between frame captures
 *
 * Safe fail: if screenshots can't be fetched, returns ready + unknown.
 * Never blocks launch — only reports richer state.
 */
export async function checkAppReadiness(
  farmId: string,
  numFrames = 2,
  delayMs = 1200,
  gapMs = 700
): Promise<ReadinessResult> {
  const { host, apiKey } = getHetznerConfig();

  // Initial wait for app to render
  await sleep(delayMs);

  const frames: FrameAnalysis[] = [];
  let fetchFails = 0;

  for (let i = 0; i < numFrames; i++) {
    if (i > 0) await sleep(gapMs);

    const data = await fetchScreenshot(host, apiKey, farmId);
    if (!data) {
      fetchFails++;
      continue;
    }
    frames.push(analyzeFrame(data));
  }

  // All fetches failed → safe fail, assume ready
  if (frames.length === 0) {
    return {
      ready: true,
      state: "unknown",
      reason: "fetch_unavailable",
      byteSize: 0,
      avgBrightness: 0,
      variance: 0,
      regions: null,
      frameDiff: 0,
      frames: 0,
      attempts: numFrames,
    };
  }

  const { state, reason, frameDiff } = classifyMultiFrame(frames);
  const latest = frames[frames.length - 1];

  return {
    ready: state === "ready",
    state,
    reason,
    byteSize: latest.byteSize,
    avgBrightness: latest.avgBrightness,
    variance: latest.variance,
    regions: latest.regions,
    frameDiff,
    frames: frames.length,
    attempts: numFrames,
  };
}

// ── Hetzner config ───────────────────────────────────────────
export function getHetznerConfig() {
  return {
    host: process.env.HETZNER_IP || "cloud.vrbot.me",
    apiKey: process.env.VRBOT_API_KEY || "vrbot_admin_2026",
  };
}

// ── Stats ────────────────────────────────────────────────────
export function getCacheStats() {
  return {
    memoryEntries: memCache.size,
    farms: Array.from(memCache.keys()),
    lastUsedEntries: lastUsedMem.size,
  };
}
