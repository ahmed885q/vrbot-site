/**
 * Farm ID Mapper — resolves farm_name (smz, jx, etc.) → farm number (1, 2, …)
 *
 * Resolution order:
 *   1. Direct numeric match: "farm_001" / "farm001" / "3" → number
 *   2. Supabase lookup: cloud_farms.container_id or adb_port → number
 *   3. Fallback: null (caller decides)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── In-memory cache (lives for the lifetime of the serverless function) ──
const cache = new Map<string, { num: number; ts: number }>();
const CACHE_TTL = 60_000; // 1 minute

/** Try to extract a farm number from the string directly */
export function farmNameToNum(farmId: string): number | null {
  // "farm_001", "farm-001", "farm001"
  const m = farmId.match(/^farm[_-]?0*(\d+)$/i);
  if (m) return parseInt(m[1]);

  // Pure number: "3", "17"
  if (/^\d+$/.test(farmId)) return parseInt(farmId);

  return null;
}

/** Resolve any farm identifier to a number, with Supabase fallback */
export async function resolveFarmNum(farmId: string): Promise<number | null> {
  // 1) Direct pattern match
  const direct = farmNameToNum(farmId);
  if (direct !== null) return direct;

  // 2) Cache hit?
  const cached = cache.get(farmId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.num;

  // 3) Supabase lookup
  try {
    const service = getServiceClient();
    const { data } = await service
      .from("cloud_farms")
      .select("container_id, adb_port")
      .eq("farm_name", farmId)
      .single();

    if (data) {
      let num: number | null = null;

      // container_id might be "farm_001", "redroid_3", etc.
      if (data.container_id) {
        const m = data.container_id.match(/\d+/);
        if (m) num = parseInt(m[0]);
      }

      // adb_port: 5555 → 1, 5556 → 2, …
      if (num === null && data.adb_port) {
        num = data.adb_port - 5554;
      }

      if (num !== null && num > 0) {
        cache.set(farmId, { num, ts: Date.now() });
        return num;
      }
    }
  } catch (e) {
    console.error(`[farm-mapper] Supabase lookup failed for "${farmId}":`, e);
  }

  return null;
}

// ── Singleton service client ─────────────────────────────────────────
let _service: SupabaseClient | null = null;
function getServiceClient(): SupabaseClient {
  if (!_service) {
    _service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return _service;
}
