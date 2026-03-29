'use client'
import { useRef, useState, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════
// SYSTEM 5 — METRICS + OBSERVABILITY
// ═══════════════════════════════════════════════════════════════════
// Tracks performance metrics across all subsystems: ADB command
// success rates, latency percentiles, stream health, WS reliability,
// and bot efficiency. Exposes structured logs for debugging.
// ═══════════════════════════════════════════════════════════════════

export type MetricEntry = {
  ts: number
  category: 'adb' | 'stream' | 'ws' | 'bot' | 'heal' | 'system'
  event: string
  durationMs?: number
  ok?: boolean
  meta?: Record<string, any>
}

export type AggregatedMetrics = {
  // ADB
  adbTotal: number
  adbSuccess: number
  adbFailed: number
  adbSuccessRate: number          // 0-100
  adbAvgLatencyMs: number
  adbP95LatencyMs: number

  // Stream
  streamRestarts: number
  streamTotalFrames: number
  streamFrozenEvents: number
  streamUptimeMs: number

  // WebSocket
  wsReconnects: number
  wsMessagesReceived: number
  wsFallbackEvents: number
  wsAvgLatencyMs: number

  // Bot
  botActionsExecuted: number
  botActionsFailed: number
  botEfficiency: number            // 0-100 (success rate)

  // Healing
  healingActions: number
  healingSuccessful: number

  // Session
  sessionStartTs: number
  sessionDurationMs: number
}

type MetricsConfig = {
  /** Max raw entries to keep */
  maxEntries: number
  /** Max latency samples per category */
  maxLatencySamples: number
  /** Aggregation refresh interval (ms) */
  refreshIntervalMs: number
}

const DEFAULT_CONFIG: MetricsConfig = {
  maxEntries: 500,
  maxLatencySamples: 100,
  refreshIntervalMs: 5000,
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length)
}

export function useMetrics(config: Partial<MetricsConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const [aggregated, setAggregated] = useState<AggregatedMetrics>({
    adbTotal: 0, adbSuccess: 0, adbFailed: 0, adbSuccessRate: 100,
    adbAvgLatencyMs: 0, adbP95LatencyMs: 0,
    streamRestarts: 0, streamTotalFrames: 0, streamFrozenEvents: 0, streamUptimeMs: 0,
    wsReconnects: 0, wsMessagesReceived: 0, wsFallbackEvents: 0, wsAvgLatencyMs: 0,
    botActionsExecuted: 0, botActionsFailed: 0, botEfficiency: 100,
    healingActions: 0, healingSuccessful: 0,
    sessionStartTs: Date.now(), sessionDurationMs: 0,
  })

  const entriesRef = useRef<MetricEntry[]>([])
  const adbLatenciesRef = useRef<number[]>([])
  const wsLatenciesRef = useRef<number[]>([])
  const countersRef = useRef({
    adbTotal: 0, adbSuccess: 0, adbFailed: 0,
    streamRestarts: 0, streamTotalFrames: 0, streamFrozenEvents: 0,
    wsReconnects: 0, wsMessagesReceived: 0, wsFallbackEvents: 0,
    botActionsExecuted: 0, botActionsFailed: 0,
    healingActions: 0, healingSuccessful: 0,
  })
  const sessionStartRef = useRef(Date.now())
  const streamStartRef = useRef(0)
  const streamUptimeAccRef = useRef(0)

  // ── Record raw metric entry ─────────────────────────────────────
  const record = useCallback((entry: Omit<MetricEntry, 'ts'>) => {
    const full: MetricEntry = { ...entry, ts: Date.now() }
    entriesRef.current.push(full)
    if (entriesRef.current.length > cfg.maxEntries) {
      entriesRef.current = entriesRef.current.slice(-Math.floor(cfg.maxEntries * 0.8))
    }
  }, [cfg.maxEntries])

  // ── ADB metrics ─────────────────────────────────────────────────
  const recordAdbCommand = useCallback((ok: boolean, latencyMs: number, command?: string) => {
    const c = countersRef.current
    c.adbTotal++
    if (ok) c.adbSuccess++
    else c.adbFailed++

    adbLatenciesRef.current.push(latencyMs)
    if (adbLatenciesRef.current.length > cfg.maxLatencySamples) {
      adbLatenciesRef.current = adbLatenciesRef.current.slice(-cfg.maxLatencySamples)
    }

    record({
      category: 'adb',
      event: ok ? 'command_ok' : 'command_fail',
      durationMs: latencyMs,
      ok,
      meta: command ? { command } : undefined,
    })
  }, [cfg.maxLatencySamples, record])

  // ── Stream metrics ──────────────────────────────────────────────
  const recordFrame = useCallback(() => {
    countersRef.current.streamTotalFrames++
  }, [])

  const recordStreamStart = useCallback(() => {
    streamStartRef.current = Date.now()
    record({ category: 'stream', event: 'start', ok: true })
  }, [record])

  const recordStreamStop = useCallback(() => {
    if (streamStartRef.current > 0) {
      streamUptimeAccRef.current += Date.now() - streamStartRef.current
      streamStartRef.current = 0
    }
    record({ category: 'stream', event: 'stop', ok: true })
  }, [record])

  const recordStreamRestart = useCallback(() => {
    countersRef.current.streamRestarts++
    record({ category: 'stream', event: 'restart', ok: true })
  }, [record])

  const recordStreamFrozen = useCallback(() => {
    countersRef.current.streamFrozenEvents++
    record({ category: 'stream', event: 'frozen', ok: false })
  }, [record])

  // ── WebSocket metrics ───────────────────────────────────────────
  const recordWsMessage = useCallback(() => {
    countersRef.current.wsMessagesReceived++
  }, [])

  const recordWsReconnect = useCallback(() => {
    countersRef.current.wsReconnects++
    record({ category: 'ws', event: 'reconnect', ok: true })
  }, [record])

  const recordWsFallback = useCallback(() => {
    countersRef.current.wsFallbackEvents++
    record({ category: 'ws', event: 'fallback', ok: false })
  }, [record])

  const recordWsLatency = useCallback((ms: number) => {
    wsLatenciesRef.current.push(ms)
    if (wsLatenciesRef.current.length > cfg.maxLatencySamples) {
      wsLatenciesRef.current = wsLatenciesRef.current.slice(-cfg.maxLatencySamples)
    }
  }, [cfg.maxLatencySamples])

  // ── Bot metrics ─────────────────────────────────────────────────
  const recordBotAction = useCallback((ok: boolean, actionName?: string) => {
    const c = countersRef.current
    c.botActionsExecuted++
    if (!ok) c.botActionsFailed++
    record({
      category: 'bot',
      event: ok ? 'action_ok' : 'action_fail',
      ok,
      meta: actionName ? { action: actionName } : undefined,
    })
  }, [record])

  // ── Healing metrics ─────────────────────────────────────────────
  const recordHealingAction = useCallback((successful: boolean, action?: string) => {
    const c = countersRef.current
    c.healingActions++
    if (successful) c.healingSuccessful++
    record({
      category: 'heal',
      event: successful ? 'heal_ok' : 'heal_fail',
      ok: successful,
      meta: action ? { action } : undefined,
    })
  }, [record])

  // ── Aggregate (call periodically or on demand) ──────────────────
  const aggregate = useCallback((): AggregatedMetrics => {
    const c = countersRef.current
    const now = Date.now()

    const currentStreamUptime = streamStartRef.current > 0
      ? streamUptimeAccRef.current + (now - streamStartRef.current)
      : streamUptimeAccRef.current

    const agg: AggregatedMetrics = {
      adbTotal: c.adbTotal,
      adbSuccess: c.adbSuccess,
      adbFailed: c.adbFailed,
      adbSuccessRate: c.adbTotal > 0 ? Math.round((c.adbSuccess / c.adbTotal) * 100) : 100,
      adbAvgLatencyMs: average(adbLatenciesRef.current),
      adbP95LatencyMs: percentile(adbLatenciesRef.current, 95),

      streamRestarts: c.streamRestarts,
      streamTotalFrames: c.streamTotalFrames,
      streamFrozenEvents: c.streamFrozenEvents,
      streamUptimeMs: currentStreamUptime,

      wsReconnects: c.wsReconnects,
      wsMessagesReceived: c.wsMessagesReceived,
      wsFallbackEvents: c.wsFallbackEvents,
      wsAvgLatencyMs: average(wsLatenciesRef.current),

      botActionsExecuted: c.botActionsExecuted,
      botActionsFailed: c.botActionsFailed,
      botEfficiency: c.botActionsExecuted > 0
        ? Math.round(((c.botActionsExecuted - c.botActionsFailed) / c.botActionsExecuted) * 100)
        : 100,

      healingActions: c.healingActions,
      healingSuccessful: c.healingSuccessful,

      sessionStartTs: sessionStartRef.current,
      sessionDurationMs: now - sessionStartRef.current,
    }

    setAggregated(agg)
    return agg
  }, [])

  // ── Get recent entries (for debugging) ──────────────────────────
  const getRecentEntries = useCallback((count = 20, category?: MetricEntry['category']): MetricEntry[] => {
    let entries = entriesRef.current
    if (category) entries = entries.filter(e => e.category === category)
    return entries.slice(-count)
  }, [])

  // ── Cleanup ─────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    entriesRef.current = []
    adbLatenciesRef.current = []
    wsLatenciesRef.current = []
  }, [])

  return {
    // Aggregated snapshot
    aggregated,
    aggregate,

    // ADB
    recordAdbCommand,

    // Stream
    recordFrame,
    recordStreamStart,
    recordStreamStop,
    recordStreamRestart,
    recordStreamFrozen,

    // WebSocket
    recordWsMessage,
    recordWsReconnect,
    recordWsFallback,
    recordWsLatency,

    // Bot
    recordBotAction,

    // Healing
    recordHealingAction,

    // Debug
    getRecentEntries,

    // Lifecycle
    cleanup,
  }
}
