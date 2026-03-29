// ═══════════════════════════════════════════════════════════════════
// SERVER-SIDE IDEMPOTENCY GUARD — REDIS-BACKED
// ═══════════════════════════════════════════════════════════════════
// Uses Redis SET NX EX for atomic, distributed dedup:
//   - SET NX → only succeeds if key does NOT exist (atomic guard)
//   - EX 600 → auto-expires after 10 minutes (bounded memory)
//   - Multi-instance safe (all Vercel functions share one Redis)
//
// Falls back to in-memory Map if Redis is unavailable.
// ═══════════════════════════════════════════════════════════════════

import { setNxEx, setEx, getKey, serverTimestamp, getRedisStats } from './redis'

const ACTION_TTL_SECONDS = 600 // 10 minutes
const KEY_PREFIX = 'action:'

export type IdempotencyResult =
  | { allowed: true }
  | { allowed: false; reason: 'duplicate'; originalStatus: string }

/**
 * Check if an action_id is allowed to execute.
 *
 * Uses Redis SET NX EX — atomic "set if not exists" with TTL.
 * If the SET succeeds → first time seeing this ID → allowed.
 * If the SET fails → duplicate → rejected.
 *
 * This is globally consistent across all server instances.
 */
export async function checkIdempotency(actionId: string | undefined | null): Promise<IdempotencyResult> {
  // No action_id → allow (backward compat for untracked calls)
  if (!actionId) return { allowed: true }

  const key = `${KEY_PREFIX}${actionId}`

  // Atomic SET NX EX — the core of exactly-once
  const result = await setNxEx(key, JSON.stringify({
    status: 'pending',
    ts: serverTimestamp(),
  }), ACTION_TTL_SECONDS)

  if (result === 'OK') {
    // Key was new — this is the first execution
    return { allowed: true }
  }

  // Key already existed — duplicate
  const existing = await getKey(key)
  let originalStatus = 'unknown'
  try {
    if (existing) {
      const parsed = JSON.parse(existing)
      originalStatus = parsed.status || 'unknown'
    }
  } catch {}

  return {
    allowed: false,
    reason: 'duplicate',
    originalStatus,
  }
}

/**
 * Mark an action as executed or failed (phase 2 of two-phase commit).
 * Updates the Redis key value (refreshes TTL too).
 */
export async function resolveAction(actionId: string | undefined | null, status: 'executed' | 'failed'): Promise<void> {
  if (!actionId) return

  const key = `${KEY_PREFIX}${actionId}`
  await setEx(key, JSON.stringify({
    status,
    ts: serverTimestamp(),
    resolvedAt: serverTimestamp(),
  }), ACTION_TTL_SECONDS)
}

/**
 * Get stats for monitoring.
 */
export function getIdempotencyStats() {
  return {
    ...getRedisStats(),
    ttlSeconds: ACTION_TTL_SECONDS,
  }
}
