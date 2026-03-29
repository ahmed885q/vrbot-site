// ═══════════════════════════════════════════════════════════════════
// REDIS CLIENT — Production-grade with graceful fallback
// ═══════════════════════════════════════════════════════════════════
// If REDIS_URL is set → connects to Redis (Upstash, Railway, etc.)
// If not set → falls back to an in-memory Map that mimics Redis
// semantics. This means the app works identically in dev and prod.
//
// ENV: REDIS_URL=redis://user:pass@host:6379
// ═══════════════════════════════════════════════════════════════════

import type Redis from 'ioredis'

let redisClient: Redis | null = null
let redisAvailable = false
let connectionAttempted = false

/**
 * Get or create the Redis client singleton.
 * Returns null if REDIS_URL is not configured.
 */
export function getRedis(): Redis | null {
  if (connectionAttempted) return redisClient

  connectionAttempted = true
  const url = process.env.REDIS_URL

  if (!url) {
    console.log('[REDIS] No REDIS_URL — using in-memory fallback')
    return null
  }

  try {
    // Dynamic require to avoid bundling ioredis when not needed
    const IoRedis = require('ioredis') as typeof import('ioredis').default
    redisClient = new IoRedis(url, {
      maxRetriesPerRequest: 2,
      retryStrategy(times: number) {
        if (times > 3) return null // stop retrying
        return Math.min(times * 200, 2000)
      },
      connectTimeout: 5000,
      lazyConnect: false,
      enableReadyCheck: true,
    })

    redisClient.on('connect', () => {
      redisAvailable = true
      console.log('[REDIS] Connected')
    })

    redisClient.on('error', (err: Error) => {
      redisAvailable = false
      console.error('[REDIS] Error:', err.message)
    })

    redisClient.on('close', () => {
      redisAvailable = false
    })

    return redisClient
  } catch (e) {
    console.error('[REDIS] Failed to initialize:', e)
    return null
  }
}

export function isRedisAvailable(): boolean {
  return redisAvailable
}

// ═══════════════════════════════════════════════════════════════════
// IN-MEMORY FALLBACK — mimics Redis SET NX EX for single-instance
// ═══════════════════════════════════════════════════════════════════

const memStore = new Map<string, { value: string; expiresAt: number }>()
let lastMemCleanup = Date.now()

function memCleanup() {
  const now = Date.now()
  if (now - lastMemCleanup < 30_000) return
  lastMemCleanup = now
  Array.from(memStore.entries()).forEach(([k, v]) => {
    if (v.expiresAt < now) memStore.delete(k)
  })
  // Hard cap
  if (memStore.size > 5000) {
    const sorted = Array.from(memStore.entries()).sort((a, b) => a[1].expiresAt - b[1].expiresAt)
    sorted.slice(0, sorted.length - 3000).forEach(([k]) => memStore.delete(k))
  }
}

/**
 * SET key value NX EX ttlSeconds — atomic "set if not exists" with TTL.
 * Uses Redis if available, else in-memory Map.
 * Returns 'OK' if set (key was new), null if key already existed (duplicate).
 */
export async function setNxEx(key: string, value: string, ttlSeconds: number): Promise<'OK' | null> {
  const redis = getRedis()

  if (redis && redisAvailable) {
    try {
      const result = await redis.set(key, value, 'EX', ttlSeconds, 'NX')
      return result as 'OK' | null
    } catch (e) {
      console.error('[REDIS] SET NX EX failed, falling back to memory:', e)
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  memCleanup()
  const now = Date.now()
  const existing = memStore.get(key)
  if (existing && existing.expiresAt > now) {
    return null // key exists — duplicate
  }
  memStore.set(key, { value, expiresAt: now + ttlSeconds * 1000 })
  return 'OK'
}

/**
 * GET key — retrieve value.
 */
export async function getKey(key: string): Promise<string | null> {
  const redis = getRedis()

  if (redis && redisAvailable) {
    try {
      return await redis.get(key)
    } catch {
      // Fall through
    }
  }

  const entry = memStore.get(key)
  if (entry && entry.expiresAt > Date.now()) return entry.value
  return null
}

/**
 * SET key value EX ttlSeconds — unconditional set with TTL.
 */
export async function setEx(key: string, value: string, ttlSeconds: number): Promise<void> {
  const redis = getRedis()

  if (redis && redisAvailable) {
    try {
      await redis.set(key, value, 'EX', ttlSeconds)
      return
    } catch {
      // Fall through
    }
  }

  memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

/**
 * Get current server timestamp (for time authority).
 */
export function serverTimestamp(): number {
  return Date.now()
}

/**
 * Stats for monitoring.
 */
export function getRedisStats() {
  return {
    redisAvailable,
    memoryFallbackSize: memStore.size,
    backend: redisAvailable ? 'redis' : 'memory',
  }
}
