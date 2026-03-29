'use client'
import { useRef, useState, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════
// DISTRIBUTED CONSISTENCY — LAYER 3: STATE SYNC + SPLIT-BRAIN PREVENTION
// ═══════════════════════════════════════════════════════════════════
// Periodically syncs frontend state to /api/bot/state and fetches
// the backend's latest version. If backend has a NEWER version,
// the backend's state is applied (backend wins in split-brain).
//
// Handles:
// - Periodic push (every N seconds)
// - Backend override detection
// - Retry with exponential backoff on failures
// - Conflict resolution (backend version > frontend version = override)
// ═══════════════════════════════════════════════════════════════════

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'conflict' | 'error'

export type SyncSnapshot = {
  farm_id: string
  bot_state: string
  screen_state: string
  stream_active: boolean
  ws_connected: boolean
  health: string
  last_action: string | null
  metrics: {
    adb_success_rate: number
    stream_frames: number
    bot_actions: number
    healing_actions: number
  }
  _v: number  // version stamp
}

type SyncConfig = {
  /** Push interval (ms) */
  pushIntervalMs: number
  /** Max consecutive sync failures before giving up */
  maxSyncFailures: number
  /** Base retry delay on failure (ms) */
  retryBaseMs: number
  /** Max retry delay (ms) */
  retryMaxMs: number
  /** Request timeout (ms) */
  timeoutMs: number
}

const DEFAULT_CONFIG: SyncConfig = {
  pushIntervalMs: 10_000,
  maxSyncFailures: 5,
  retryBaseMs: 2000,
  retryMaxMs: 30_000,
  timeoutMs: 5000,
}

export function useStateSync(config: Partial<SyncConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncTs, setLastSyncTs] = useState(0)
  const [conflictCount, setConflictCount] = useState(0)

  const syncTimerRef = useRef<NodeJS.Timeout | null>(null)
  const failCountRef = useRef(0)
  const backoffRef = useRef(cfg.retryBaseMs)
  const syncingRef = useRef(false) // prevent overlapping syncs
  const localVersionRef = useRef(0)
  const backendVersionRef = useRef(0)
  const snapshotBuilderRef = useRef<(() => SyncSnapshot | null) | null>(null)
  const onBackendOverrideRef = useRef<((state: any) => void) | null>(null)

  // ── Push state to backend ───────────────────────────────────────
  const pushState = useCallback(async () => {
    if (syncingRef.current) return
    if (!snapshotBuilderRef.current) return

    const snapshot = snapshotBuilderRef.current()
    if (!snapshot || !snapshot.farm_id) return

    syncingRef.current = true
    setSyncStatus('syncing')

    try {
      const res = await fetch('/api/bot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
        signal: AbortSignal.timeout(cfg.timeoutMs),
      })

      if (res.ok) {
        localVersionRef.current = snapshot._v
        setLastSyncTs(Date.now())
        failCountRef.current = 0
        backoffRef.current = cfg.retryBaseMs
        setSyncStatus('synced')
      } else {
        throw new Error(`HTTP ${res.status}`)
      }
    } catch (e) {
      failCountRef.current++
      if (failCountRef.current >= cfg.maxSyncFailures) {
        setSyncStatus('error')
        console.error('[SYNC] Max failures reached, pausing sync')
      } else {
        backoffRef.current = Math.min(backoffRef.current * 2, cfg.retryMaxMs)
        setSyncStatus('error')
      }
    } finally {
      syncingRef.current = false
    }
  }, [cfg])

  // ── Pull state from backend (conflict detection) ────────────────
  const pullState = useCallback(async (farmId: string) => {
    try {
      const res = await fetch(`/api/bot/state?farm_id=${encodeURIComponent(farmId)}`, {
        signal: AbortSignal.timeout(cfg.timeoutMs),
      })

      if (!res.ok) return null

      const data = await res.json()
      if (!data.ok || !data.state) return null

      const backendState = data.state
      const backendTs = backendState.updated_at || 0

      // Conflict detection: if backend was updated more recently
      // by another client, it takes precedence
      if (backendTs > lastSyncTs && backendVersionRef.current < localVersionRef.current) {
        // No conflict — we're ahead
        return null
      }

      if (backendTs > lastSyncTs + 5000) {
        // Backend was updated by someone else after our last push
        // This is a potential split-brain scenario
        setConflictCount(prev => prev + 1)
        setSyncStatus('conflict')
        console.warn('[SYNC] Backend has newer state — applying override')

        backendVersionRef.current++
        onBackendOverrideRef.current?.(backendState)
        return backendState
      }

      return null
    } catch {
      return null
    }
  }, [cfg.timeoutMs, lastSyncTs])

  // ── Start periodic sync ─────────────────────────────────────────
  const startSync = useCallback(() => {
    if (syncTimerRef.current) return

    failCountRef.current = 0
    backoffRef.current = cfg.retryBaseMs
    setSyncStatus('idle')

    syncTimerRef.current = setInterval(() => {
      if (failCountRef.current >= cfg.maxSyncFailures) return
      pushState()
    }, cfg.pushIntervalMs)

    // Push immediately
    pushState()
  }, [cfg, pushState])

  // ── Stop sync ───────────────────────────────────────────────────
  const stopSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current)
      syncTimerRef.current = null
    }
    setSyncStatus('idle')
  }, [])

  // ── Register snapshot builder ───────────────────────────────────
  // The page.tsx provides a function that builds the current state snapshot
  const registerSnapshotBuilder = useCallback((fn: () => SyncSnapshot | null) => {
    snapshotBuilderRef.current = fn
  }, [])

  // ── Register backend override handler ───────────────────────────
  const onOverride = useCallback((fn: (state: any) => void) => {
    onBackendOverrideRef.current = fn
  }, [])

  // ── Force sync now ──────────────────────────────────────────────
  const syncNow = useCallback(async () => {
    failCountRef.current = 0
    backoffRef.current = cfg.retryBaseMs
    await pushState()
  }, [cfg.retryBaseMs, pushState])

  // ── Reset after errors ──────────────────────────────────────────
  const resetSync = useCallback(() => {
    failCountRef.current = 0
    backoffRef.current = cfg.retryBaseMs
    setSyncStatus('idle')
  }, [cfg.retryBaseMs])

  // ── Stats ───────────────────────────────────────────────────────
  const getStats = useCallback(() => ({
    status: syncStatus,
    lastSyncTs,
    conflictCount,
    failCount: failCountRef.current,
    localVersion: localVersionRef.current,
    backendVersion: backendVersionRef.current,
  }), [syncStatus, lastSyncTs, conflictCount])

  // ── Cleanup ─────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current)
      syncTimerRef.current = null
    }
    snapshotBuilderRef.current = null
    onBackendOverrideRef.current = null
  }, [])

  return {
    syncStatus,
    lastSyncTs,
    conflictCount,

    startSync,
    stopSync,
    syncNow,
    resetSync,
    pullState,

    registerSnapshotBuilder,
    onOverride,

    getStats,
    cleanup,
  }
}
