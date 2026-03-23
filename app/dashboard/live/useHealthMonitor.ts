'use client'
import { useRef, useState, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════
// SYSTEM 3 — MONITORING + AUTO-HEALING
// ═══════════════════════════════════════════════════════════════════
// Tracks system health, detects failures, and triggers self-healing
// actions automatically — stream restart, queue flush, WS reconnect.
// ═══════════════════════════════════════════════════════════════════

export type HealthStatus = 'healthy' | 'degraded' | 'critical'

type HealthMetrics = {
  lastScreenshotTs: number
  lastCommandTs: number
  lastCommandOk: boolean
  commandFailStreak: number
  streamRestartCount: number
  wsReconnectCount: number
  healingActionsCount: number
}

type HealthLog = {
  ts: number
  level: 'info' | 'warn' | 'error' | 'heal'
  source: 'STREAM' | 'ADB' | 'WS' | 'BOT' | 'SYSTEM'
  msg: string
}

type HealingCallbacks = {
  restartStream: () => void
  clearAdbQueue: () => void
  reconnectWs: () => void
  stopBot: () => void
  goHome: () => void      // send HOME key as safe recovery action
}

type HealthConfig = {
  /** Stream frozen if no frame for this many ms */
  streamFrozenThresholdMs: number
  /** Command system unhealthy after this many consecutive failures */
  commandFailThreshold: number
  /** Check interval (ms) */
  checkIntervalMs: number
  /** Max automatic stream restarts before giving up */
  maxAutoRestarts: number
  /** Cooldown between healing actions (ms) */
  healingCooldownMs: number
}

const DEFAULT_CONFIG: HealthConfig = {
  streamFrozenThresholdMs: 8000,
  commandFailThreshold: 3,
  checkIntervalMs: 3000,
  maxAutoRestarts: 5,
  healingCooldownMs: 10_000,
}

export function useHealthMonitor(config: Partial<HealthConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const [health, setHealth] = useState<HealthStatus>('healthy')
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([])
  const [metrics, setMetrics] = useState<HealthMetrics>({
    lastScreenshotTs: 0,
    lastCommandTs: 0,
    lastCommandOk: true,
    commandFailStreak: 0,
    streamRestartCount: 0,
    wsReconnectCount: 0,
    healingActionsCount: 0,
  })

  const metricsRef = useRef<HealthMetrics>({
    lastScreenshotTs: 0,
    lastCommandTs: 0,
    lastCommandOk: true,
    commandFailStreak: 0,
    streamRestartCount: 0,
    wsReconnectCount: 0,
    healingActionsCount: 0,
  })
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastHealingTs = useRef(0)
  const callbacksRef = useRef<HealingCallbacks | null>(null)
  const mountedRef = useRef(true)
  const monitoringFarmRef = useRef<string | null>(null)
  const isStreamingRef = useRef(false)

  const log = useCallback((level: HealthLog['level'], source: HealthLog['source'], msg: string) => {
    const entry: HealthLog = { ts: Date.now(), level, source, msg }
    setHealthLogs(prev => [...prev.slice(-149), entry]) // keep last 150
    const prefix = `[${source}]`
    if (level === 'error') console.error(prefix, msg)
    else if (level === 'heal') console.warn(`${prefix} 🩹`, msg)
    else console.log(prefix, msg)
  }, [])

  // ── Metrics update functions (called by page.tsx) ──────────
  const reportScreenshot = useCallback(() => {
    metricsRef.current.lastScreenshotTs = Date.now()
  }, [])

  const reportCommand = useCallback((ok: boolean) => {
    metricsRef.current.lastCommandTs = Date.now()
    metricsRef.current.lastCommandOk = ok
    if (ok) {
      metricsRef.current.commandFailStreak = 0
    } else {
      metricsRef.current.commandFailStreak++
    }
  }, [])

  const reportStreamActive = useCallback((active: boolean) => {
    isStreamingRef.current = active
    if (active) {
      metricsRef.current.lastScreenshotTs = Date.now() // reset baseline
    }
  }, [])

  // ── Healing actions ───────────────────────────────────────
  const tryHeal = useCallback((action: string, fn: () => void) => {
    const now = Date.now()
    if (now - lastHealingTs.current < cfg.healingCooldownMs) {
      log('warn', 'SYSTEM', `Healing cooldown — skipping ${action}`)
      return false
    }
    lastHealingTs.current = now
    metricsRef.current.healingActionsCount++
    log('heal', 'SYSTEM', `🩹 Auto-healing: ${action}`)
    fn()
    return true
  }, [cfg.healingCooldownMs, log])

  // ── Health check tick ─────────────────────────────────────
  const healthCheck = useCallback(() => {
    if (!mountedRef.current) return
    const m = metricsRef.current
    const now = Date.now()
    const callbacks = callbacksRef.current
    let status: HealthStatus = 'healthy'

    // ── Check 1: Stream frozen ──────────────────────────────
    if (isStreamingRef.current && m.lastScreenshotTs > 0) {
      const gap = now - m.lastScreenshotTs
      if (gap > cfg.streamFrozenThresholdMs) {
        status = 'critical'
        log('error', 'STREAM', `Frozen — no frame for ${Math.round(gap / 1000)}s`)

        if (callbacks && m.streamRestartCount < cfg.maxAutoRestarts) {
          if (tryHeal('restart stream', () => {
            callbacks.restartStream()
            m.streamRestartCount++
          })) {
            log('info', 'STREAM', `Auto-restart #${m.streamRestartCount}`)
          }
        } else if (m.streamRestartCount >= cfg.maxAutoRestarts) {
          log('error', 'STREAM', `Max restarts (${cfg.maxAutoRestarts}) reached — manual intervention needed`)
        }
      }
    }

    // ── Check 2: Command failures ───────────────────────────
    if (m.commandFailStreak >= cfg.commandFailThreshold) {
      status = status === 'critical' ? 'critical' : 'degraded'
      log('warn', 'ADB', `${m.commandFailStreak} consecutive command failures`)

      if (callbacks) {
        tryHeal('clear ADB queue + HOME', () => {
          callbacks.clearAdbQueue()
          callbacks.goHome()
        })
      }
    }

    // ── Update state ────────────────────────────────────────
    setHealth(status)
    setMetrics({ ...m })
  }, [cfg, log, tryHeal])

  // ── Public API ────────────────────────────────────────────
  const startMonitoring = useCallback((farmId: string, callbacks: HealingCallbacks) => {
    if (checkTimerRef.current) clearInterval(checkTimerRef.current)
    mountedRef.current = true
    monitoringFarmRef.current = farmId
    callbacksRef.current = callbacks

    // Reset metrics
    metricsRef.current = {
      lastScreenshotTs: Date.now(),
      lastCommandTs: 0,
      lastCommandOk: true,
      commandFailStreak: 0,
      streamRestartCount: 0,
      wsReconnectCount: 0,
      healingActionsCount: 0,
    }
    setHealth('healthy')
    log('info', 'SYSTEM', `🟢 Health monitor started for ${farmId}`)

    checkTimerRef.current = setInterval(healthCheck, cfg.checkIntervalMs)
  }, [cfg.checkIntervalMs, healthCheck, log])

  const stopMonitoring = useCallback(() => {
    if (checkTimerRef.current) {
      clearInterval(checkTimerRef.current)
      checkTimerRef.current = null
    }
    callbacksRef.current = null
    monitoringFarmRef.current = null
    setHealth('healthy')
    log('info', 'SYSTEM', '⏹ Health monitor stopped')
  }, [log])

  const resetStreamRestarts = useCallback(() => {
    metricsRef.current.streamRestartCount = 0
  }, [])

  const cleanup = useCallback(() => {
    mountedRef.current = false
    if (checkTimerRef.current) {
      clearInterval(checkTimerRef.current)
      checkTimerRef.current = null
    }
    callbacksRef.current = null
  }, [])

  return {
    health,
    healthLogs,
    metrics,
    reportScreenshot,
    reportCommand,
    reportStreamActive,
    startMonitoring,
    stopMonitoring,
    resetStreamRestarts,
    cleanup,
  }
}
