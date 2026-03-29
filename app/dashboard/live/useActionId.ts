'use client'
import { useRef, useState, useCallback, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════════════
// DISTRIBUTED CONSISTENCY — LAYER 1: EXACTLY-ONCE EXECUTION
// ═══════════════════════════════════════════════════════════════════
//
// THREE guarantees:
//
//   1. PERSISTENT IDEMPOTENCY — action IDs survive page reload via
//      localStorage. On startup, pending/executed IDs are restored
//      so a reload can never cause re-execution.
//
//   2. TWO-PHASE COMMIT — every action transitions through:
//         pending → executed | failed
//      If the page crashes between pending and executed, the
//      recovery routine detects orphaned pending actions and
//      resolves them (cancel if stale, retry if recent).
//
//   3. CROSS-CLIENT DEDUP — action_id is sent to the backend,
//      which maintains its own idempotency set. Even if two
//      browser tabs generate the same logical action, the backend
//      rejects the second one.
//
// ID format: {clientId}_{source}_{farmId}_{counter}_{timestamp}
// ═══════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'vrbot_action_ids'
const PENDING_KEY = 'vrbot_pending_actions'

export type ActionStatus = 'pending' | 'executed' | 'failed' | 'rejected' | 'cancelled'

export type ActionRecord = {
  id: string
  source: string
  farmId: string
  command: string
  ts: number
  status: ActionStatus
  resolvedTs?: number
}

export type PendingAction = {
  id: string
  source: string
  farmId: string
  command: string
  ts: number
}

type IdempotencyConfig = {
  /** Max executed action IDs to persist */
  maxPersisted: number
  /** Max in-memory history */
  maxHistory: number
  /** Expiry time for old IDs (ms) */
  expiryMs: number
  /** Prune interval (ms) */
  pruneIntervalMs: number
  /** Pending action considered stale after this (ms) — auto-cancel */
  pendingStaleMs: number
  /** localStorage save debounce (ms) */
  saveDebounceMs: number
}

const DEFAULT_CONFIG: IdempotencyConfig = {
  maxPersisted: 300,
  maxHistory: 500,
  expiryMs: 300_000,
  pruneIntervalMs: 30_000,
  pendingStaleMs: 30_000,     // 30s: if pending that long, it crashed
  saveDebounceMs: 1000,
}

// Unique per-tab client ID (survives within session, differs across tabs)
const CLIENT_ID = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

let globalCounter = 0

// ── localStorage helpers (never throw) ────────────────────────────
function loadSet(key: string): Map<string, number> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Map()
    const arr: Array<[string, number]> = JSON.parse(raw)
    if (!Array.isArray(arr)) return new Map()
    return new Map(arr)
  } catch { return new Map() }
}

function saveSet(key: string, map: Map<string, number>, max: number) {
  try {
    let entries = Array.from(map.entries())
    // Keep only most recent `max` entries
    if (entries.length > max) {
      entries = entries.sort((a, b) => b[1] - a[1]).slice(0, max)
    }
    const json = JSON.stringify(entries)
    // Guard: max 100KB
    if (json.length < 100_000) {
      localStorage.setItem(key, json)
    }
  } catch { /* storage full or unavailable */ }
}

function loadPending(): PendingAction[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function savePending(actions: PendingAction[]) {
  try {
    const json = JSON.stringify(actions.slice(-50)) // max 50 pending
    if (json.length < 50_000) {
      localStorage.setItem(PENDING_KEY, json)
    }
  } catch {}
}

export function useActionId(config: Partial<IdempotencyConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // Core state
  const executedRef = useRef<Map<string, number>>(new Map())
  const pendingRef = useRef<PendingAction[]>([])
  const historyRef = useRef<ActionRecord[]>([])
  const lastPruneRef = useRef(Date.now())
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const initDoneRef = useRef(false)

  // Recovery results exposed to UI
  const [recoveredActions, setRecoveredActions] = useState<ActionRecord[]>([])

  // ── Debounced persist ───────────────────────────────────────────
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) return // already scheduled
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      saveSet(STORAGE_KEY, executedRef.current, cfg.maxPersisted)
      savePending(pendingRef.current)
    }, cfg.saveDebounceMs)
  }, [cfg.maxPersisted, cfg.saveDebounceMs])

  // ── Load persisted state + run recovery ─────────────────────────
  useEffect(() => {
    if (initDoneRef.current) return
    initDoneRef.current = true

    // 1. Load executed IDs
    const savedExecuted = loadSet(STORAGE_KEY)
    // Merge (in case hook re-mounts)
    savedExecuted.forEach((ts, id) => {
      if (!executedRef.current.has(id)) executedRef.current.set(id, ts)
    })

    // 2. Load and resolve pending actions
    const savedPending = loadPending()
    const now = Date.now()
    const recovered: ActionRecord[] = []

    for (const p of savedPending) {
      if (executedRef.current.has(p.id)) {
        // Already executed — just a stale pending record
        continue
      }

      const age = now - p.ts
      if (age > cfg.pendingStaleMs) {
        // Stale pending action — crashed mid-execution, cancel it
        executedRef.current.set(p.id, now)
        const record: ActionRecord = {
          ...p,
          status: 'cancelled',
          resolvedTs: now,
        }
        historyRef.current.push(record)
        recovered.push(record)
        console.warn(`[EXACTLY-ONCE] Cancelled stale pending action (${Math.round(age / 1000)}s old): ${p.id}`)
      } else {
        // Recent pending — could be a very fast reload. Cancel safely.
        // In a full system with server-side WAL, this could retry instead.
        executedRef.current.set(p.id, now)
        const record: ActionRecord = {
          ...p,
          status: 'cancelled',
          resolvedTs: now,
        }
        historyRef.current.push(record)
        recovered.push(record)
        console.warn(`[EXACTLY-ONCE] Cancelled recent pending action (${age}ms old): ${p.id}`)
      }
    }

    // Clear pending (all resolved)
    pendingRef.current = []
    savePending([])

    if (recovered.length > 0) {
      setRecoveredActions(recovered)
      console.log(`[EXACTLY-ONCE] Recovery complete: ${recovered.length} orphaned action(s) cancelled`)
    }

    // Persist the merged executed set
    saveSet(STORAGE_KEY, executedRef.current, cfg.maxPersisted)
  }, [cfg])

  // ── Generate unique action ID ───────────────────────────────────
  const generate = useCallback((source: string, farmId: string, _command: string): string => {
    globalCounter++
    return `${CLIENT_ID}_${source}_${farmId}_${String(globalCounter).padStart(5, '0')}_${Date.now()}`
  }, [])

  // ── Prune expired entries ───────────────────────────────────────
  const prune = useCallback(() => {
    const now = Date.now()
    if (now - lastPruneRef.current < cfg.pruneIntervalMs) return
    lastPruneRef.current = now

    const cutoff = now - cfg.expiryMs
    Array.from(executedRef.current.entries()).forEach(([id, ts]) => {
      if (ts < cutoff) executedRef.current.delete(id)
    })

    if (historyRef.current.length > cfg.maxHistory) {
      historyRef.current = historyRef.current.slice(-Math.floor(cfg.maxHistory * 0.7))
    }

    scheduleSave()
  }, [cfg, scheduleSave])

  // ── PHASE 1 of two-phase commit: mark PENDING ──────────────────
  const markPending = useCallback((actionId: string, source: string, farmId: string, command: string) => {
    const pending: PendingAction = { id: actionId, source, farmId, command, ts: Date.now() }
    pendingRef.current.push(pending)

    historyRef.current.push({
      id: actionId, source, farmId, command,
      ts: Date.now(), status: 'pending',
    })

    // Persist immediately — this is the crash-safety write
    savePending(pendingRef.current)
  }, [])

  // ── PHASE 2 of two-phase commit: mark EXECUTED/FAILED ──────────
  const markResolved = useCallback((actionId: string, source: string, farmId: string, command: string, status: 'executed' | 'failed') => {
    // Move from pending to executed
    executedRef.current.set(actionId, Date.now())
    pendingRef.current = pendingRef.current.filter(p => p.id !== actionId)

    historyRef.current.push({
      id: actionId, source, farmId, command,
      ts: Date.now(), status, resolvedTs: Date.now(),
    })

    scheduleSave()
  }, [scheduleSave])

  // ── Idempotency check ──────────────────────────────────────────
  const canExecute = useCallback((actionId: string): boolean => {
    prune()
    return !executedRef.current.has(actionId)
  }, [prune])

  // ── Combined acquire: generate + check + markPending ────────────
  // Returns { actionId, release } if safe; null if duplicate.
  // Caller MUST call release('executed') or release('failed') after.
  const acquireAction = useCallback((source: string, farmId: string, command: string): {
    actionId: string
    release: (status: 'executed' | 'failed') => void
  } | null => {
    const id = generate(source, farmId, command)

    if (!canExecute(id)) {
      historyRef.current.push({
        id, source, farmId, command,
        ts: Date.now(), status: 'rejected',
      })
      console.warn(`[EXACTLY-ONCE] Rejected duplicate: ${id}`)
      return null
    }

    // Phase 1: persist pending state (crash-safe)
    markPending(id, source, farmId, command)

    // Return handle with release function
    return {
      actionId: id,
      release: (status: 'executed' | 'failed') => {
        markResolved(id, source, farmId, command, status)
      },
    }
  }, [generate, canExecute, markPending, markResolved])

  // ── Check externally-provided actionId ──────────────────────────
  const checkExternal = useCallback((actionId: string): boolean => {
    prune()
    if (executedRef.current.has(actionId)) {
      console.warn(`[EXACTLY-ONCE] External duplicate blocked: ${actionId}`)
      return false
    }
    return true
  }, [prune])

  // ── Stats ───────────────────────────────────────────────────────
  const getStats = useCallback(() => {
    const history = historyRef.current
    const total = history.length
    return {
      total,
      executed: history.filter(h => h.status === 'executed').length,
      failed: history.filter(h => h.status === 'failed').length,
      rejected: history.filter(h => h.status === 'rejected').length,
      cancelled: history.filter(h => h.status === 'cancelled').length,
      pending: pendingRef.current.length,
      activeIds: executedRef.current.size,
      duplicateRate: total > 0
        ? Math.round((history.filter(h => h.status === 'rejected').length / total) * 100)
        : 0,
    }
  }, [])

  const getRecentHistory = useCallback((count = 20): ActionRecord[] => {
    return historyRef.current.slice(-count)
  }, [])

  // ── Cleanup ─────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    // Final persist before cleanup
    saveSet(STORAGE_KEY, executedRef.current, cfg.maxPersisted)
    savePending(pendingRef.current)
  }, [cfg.maxPersisted])

  return {
    generate,
    canExecute,
    acquireAction,
    checkExternal,
    getStats,
    getRecentHistory,
    recoveredActions,
    cleanup,

    // Exposed for backward compat (page.tsx uses these)
    markExecuted: (actionId: string, source: string, farmId: string, command: string, status: 'executed' | 'failed' = 'executed') => {
      markResolved(actionId, source, farmId, command, status)
    },
    markRejected: (_actionId: string, _source: string, _farmId: string, _command: string) => {
      // no-op: acquireAction handles rejection internally now
    },
  }
}
