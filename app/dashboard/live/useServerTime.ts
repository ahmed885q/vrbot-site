'use client'
import { useRef, useState, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════
// DISTRIBUTED CONSISTENCY — SERVER TIME AUTHORITY
// ═══════════════════════════════════════════════════════════════════
// The client clock can be wrong. The server's clock is authoritative.
// Every API response includes `_server_ts`. The client computes an
// offset and uses `serverNow()` for all TTL, expiry, and recovery
// decisions instead of raw `Date.now()`.
//
// offset = serverTs - clientTsAtReceive
// serverNow() = Date.now() + offset
// ═══════════════════════════════════════════════════════════════════

type TimeSyncConfig = {
  /** Min samples before offset is trusted */
  minSamples: number
  /** Max offset samples to keep */
  maxSamples: number
  /** Ignore offsets larger than this (ms) — likely bad measurement */
  maxAllowedDriftMs: number
}

const DEFAULT_CONFIG: TimeSyncConfig = {
  minSamples: 2,
  maxSamples: 20,
  maxAllowedDriftMs: 60_000, // ignore if >60s drift
}

export function useServerTime(config: Partial<TimeSyncConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const [offset, setOffset] = useState(0)      // ms to add to Date.now()
  const [synced, setSynced] = useState(false)

  const samplesRef = useRef<number[]>([])       // offset samples
  const computedOffsetRef = useRef(0)

  // ── Ingest a server timestamp from an API response ──────────────
  const ingestServerTs = useCallback((serverTs: number | undefined | null) => {
    if (!serverTs || typeof serverTs !== 'number') return
    if (serverTs < 1_000_000_000_000) return // not a unix ms timestamp

    const clientNow = Date.now()
    const sample = serverTs - clientNow // positive = server ahead

    // Reject absurd drift
    if (Math.abs(sample) > cfg.maxAllowedDriftMs) {
      console.warn(`[TIME] Ignored server timestamp with ${Math.round(sample / 1000)}s drift`)
      return
    }

    samplesRef.current.push(sample)
    if (samplesRef.current.length > cfg.maxSamples) {
      samplesRef.current = samplesRef.current.slice(-cfg.maxSamples)
    }

    // Compute median offset (robust against outliers)
    if (samplesRef.current.length >= cfg.minSamples) {
      const sorted = [...samplesRef.current].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      const median = sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
        : sorted[mid]

      computedOffsetRef.current = median
      setOffset(median)
      setSynced(true)
    }
  }, [cfg])

  // ── Get current time adjusted by server offset ──────────────────
  const serverNow = useCallback((): number => {
    return Date.now() + computedOffsetRef.current
  }, [])

  // ── Check if a timestamp is expired (using server time) ─────────
  const isExpired = useCallback((ts: number, ttlMs: number): boolean => {
    return serverNow() - ts > ttlMs
  }, [serverNow])

  // ── Stats ───────────────────────────────────────────────────────
  const getStats = useCallback(() => ({
    offsetMs: computedOffsetRef.current,
    synced,
    samples: samplesRef.current.length,
    driftDirection: computedOffsetRef.current > 0 ? 'server-ahead' : computedOffsetRef.current < 0 ? 'client-ahead' : 'in-sync',
  }), [synced])

  return {
    offset,
    synced,
    ingestServerTs,
    serverNow,
    isExpired,
    getStats,
  }
}
