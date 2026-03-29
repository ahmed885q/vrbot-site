'use client'
import { useRef, useState, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════
// SYSTEM 7 — MULTI-FARM SCALING MANAGER
// ═══════════════════════════════════════════════════════════════════
// Manages scheduling and execution across 50+ farms with:
// - Active farm limit (max concurrent operations)
// - Round-robin scheduler for fair distribution
// - Per-farm ADB queues (isolated)
// - Overload protection
// ═══════════════════════════════════════════════════════════════════

export type FarmEntry = {
  farmId: string
  status: 'queued' | 'active' | 'idle' | 'error' | 'cooldown'
  lastActiveTs: number
  taskQueue: string[]
  errorCount: number
  priority: number              // higher = scheduled sooner
  cooldownUntil: number         // timestamp when farm can be activated again
}

export type SchedulerStats = {
  totalFarms: number
  activeFarms: number
  queuedFarms: number
  errorFarms: number
  tasksCompleted: number
  currentRound: number
}

type FarmManagerConfig = {
  /** Max farms running simultaneously */
  maxActiveFarms: number
  /** Time each farm stays active before rotation (ms) */
  farmRotationMs: number
  /** Cooldown after a farm finishes its tasks (ms) */
  farmCooldownMs: number
  /** Max errors before skipping a farm */
  maxFarmErrors: number
  /** Scheduler tick interval (ms) */
  scheduleIntervalMs: number
}

const DEFAULT_CONFIG: FarmManagerConfig = {
  maxActiveFarms: 5,
  farmRotationMs: 120_000,   // 2 min per farm
  farmCooldownMs: 30_000,    // 30s cooldown between rotations
  maxFarmErrors: 3,
  scheduleIntervalMs: 5000,
}

export function useFarmManager(config: Partial<FarmManagerConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const [farms, setFarms] = useState<FarmEntry[]>([])
  const [stats, setStats] = useState<SchedulerStats>({
    totalFarms: 0, activeFarms: 0, queuedFarms: 0,
    errorFarms: 0, tasksCompleted: 0, currentRound: 0,
  })
  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false)

  const farmsRef = useRef<Map<string, FarmEntry>>(new Map())
  const schedulerTimerRef = useRef<NodeJS.Timeout | null>(null)
  const roundRef = useRef(0)
  const tasksCompletedRef = useRef(0)
  const rotationIndexRef = useRef(0)
  const onActivateFarmRef = useRef<((farmId: string, tasks: string[]) => Promise<boolean>) | null>(null)
  const onDeactivateFarmRef = useRef<((farmId: string) => void) | null>(null)

  // ── Register/update farms ───────────────────────────────────────
  const registerFarms = useCallback((farmIds: string[]) => {
    for (const farmId of farmIds) {
      if (!farmsRef.current.has(farmId)) {
        farmsRef.current.set(farmId, {
          farmId,
          status: 'idle',
          lastActiveTs: 0,
          taskQueue: [],
          errorCount: 0,
          priority: 5,
          cooldownUntil: 0,
        })
      }
    }
    // Remove farms that no longer exist
    Array.from(farmsRef.current.keys()).forEach(id => {
      if (!farmIds.includes(id)) {
        farmsRef.current.delete(id)
      }
    })
    syncState()
  }, [])

  // ── Queue tasks for a specific farm ─────────────────────────────
  const queueTasks = useCallback((farmId: string, tasks: string[]) => {
    const farm = farmsRef.current.get(farmId)
    if (!farm) return
    farm.taskQueue.push(...tasks)
    if (farm.status === 'idle') farm.status = 'queued'
    syncState()
  }, [])

  // ── Queue tasks for ALL farms ───────────────────────────────────
  const queueTasksAll = useCallback((tasks: string[]) => {
    Array.from(farmsRef.current.values()).forEach(farm => {
      farm.taskQueue.push(...tasks)
      if (farm.status === 'idle') farm.status = 'queued'
    })
    syncState()
  }, [])

  // ── Set farm priority ───────────────────────────────────────────
  const setFarmPriority = useCallback((farmId: string, priority: number) => {
    const farm = farmsRef.current.get(farmId)
    if (farm) farm.priority = Math.max(1, Math.min(10, priority))
  }, [])

  // ── Scheduler tick (round-robin) ────────────────────────────────
  const scheduleTick = useCallback(async () => {
    const now = Date.now()
    const allFarms = Array.from(farmsRef.current.values())

    // 1. Deactivate farms that have exceeded their rotation time
    for (const farm of allFarms) {
      if (farm.status === 'active' && now - farm.lastActiveTs > cfg.farmRotationMs) {
        farm.status = 'cooldown'
        farm.cooldownUntil = now + cfg.farmCooldownMs
        onDeactivateFarmRef.current?.(farm.farmId)
      }
    }

    // 2. Move cooled-down farms back to queued (if they have tasks)
    for (const farm of allFarms) {
      if (farm.status === 'cooldown' && now >= farm.cooldownUntil) {
        farm.status = farm.taskQueue.length > 0 ? 'queued' : 'idle'
      }
    }

    // 3. Count active farms
    const activeFarms = allFarms.filter(f => f.status === 'active')
    const slotsAvailable = cfg.maxActiveFarms - activeFarms.length

    if (slotsAvailable > 0) {
      // 4. Get queued farms sorted by priority (desc) then last-active (asc = least recently active first)
      const candidates = allFarms
        .filter(f => f.status === 'queued' && f.errorCount < cfg.maxFarmErrors)
        .sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority
          return a.lastActiveTs - b.lastActiveTs
        })

      // 5. Activate up to slotsAvailable farms
      for (let i = 0; i < Math.min(slotsAvailable, candidates.length); i++) {
        const farm = candidates[i]
        const tasks = farm.taskQueue.splice(0, farm.taskQueue.length) // take all queued tasks
        farm.status = 'active'
        farm.lastActiveTs = now

        try {
          const ok = await onActivateFarmRef.current?.(farm.farmId, tasks)
          if (!ok) {
            farm.errorCount++
            farm.status = 'error'
          } else {
            farm.errorCount = 0
            tasksCompletedRef.current += tasks.length
          }
        } catch {
          farm.errorCount++
          farm.status = 'error'
        }
      }

      if (candidates.length > 0) {
        roundRef.current++
      }
    }

    syncState()
  }, [cfg])

  // ── Sync ref state to React state ──────────────────────────────
  const syncState = useCallback(() => {
    const allFarms = Array.from(farmsRef.current.values())
    setFarms([...allFarms])
    setStats({
      totalFarms: allFarms.length,
      activeFarms: allFarms.filter(f => f.status === 'active').length,
      queuedFarms: allFarms.filter(f => f.status === 'queued').length,
      errorFarms: allFarms.filter(f => f.status === 'error').length,
      tasksCompleted: tasksCompletedRef.current,
      currentRound: roundRef.current,
    })
  }, [])

  // ── Report task completion from a farm ──────────────────────────
  const reportFarmComplete = useCallback((farmId: string) => {
    const farm = farmsRef.current.get(farmId)
    if (farm) {
      farm.status = farm.taskQueue.length > 0 ? 'queued' : 'idle'
      farm.cooldownUntil = Date.now() + cfg.farmCooldownMs
      if (farm.taskQueue.length === 0) farm.status = 'cooldown'
    }
    syncState()
  }, [cfg.farmCooldownMs, syncState])

  // ── Report farm error ───────────────────────────────────────────
  const reportFarmError = useCallback((farmId: string) => {
    const farm = farmsRef.current.get(farmId)
    if (farm) {
      farm.errorCount++
      if (farm.errorCount >= cfg.maxFarmErrors) {
        farm.status = 'error'
      }
    }
    syncState()
  }, [cfg.maxFarmErrors, syncState])

  // ── Reset farm errors ───────────────────────────────────────────
  const resetFarmErrors = useCallback((farmId: string) => {
    const farm = farmsRef.current.get(farmId)
    if (farm) {
      farm.errorCount = 0
      farm.status = farm.taskQueue.length > 0 ? 'queued' : 'idle'
    }
    syncState()
  }, [syncState])

  // ── Start/Stop scheduler ────────────────────────────────────────
  const startScheduler = useCallback(() => {
    if (schedulerTimerRef.current) return
    setIsSchedulerRunning(true)
    schedulerTimerRef.current = setInterval(scheduleTick, cfg.scheduleIntervalMs)
    scheduleTick() // run immediately
  }, [cfg.scheduleIntervalMs, scheduleTick])

  const stopScheduler = useCallback(() => {
    if (schedulerTimerRef.current) {
      clearInterval(schedulerTimerRef.current)
      schedulerTimerRef.current = null
    }
    setIsSchedulerRunning(false)
  }, [])

  // ── Register callbacks ──────────────────────────────────────────
  const onActivate = useCallback((fn: (farmId: string, tasks: string[]) => Promise<boolean>) => {
    onActivateFarmRef.current = fn
  }, [])

  const onDeactivate = useCallback((fn: (farmId: string) => void) => {
    onDeactivateFarmRef.current = fn
  }, [])

  // ── Cleanup ─────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (schedulerTimerRef.current) {
      clearInterval(schedulerTimerRef.current)
      schedulerTimerRef.current = null
    }
    farmsRef.current.clear()
  }, [])

  return {
    farms,
    stats,
    isSchedulerRunning,

    registerFarms,
    queueTasks,
    queueTasksAll,
    setFarmPriority,

    reportFarmComplete,
    reportFarmError,
    resetFarmErrors,

    startScheduler,
    stopScheduler,

    onActivate,
    onDeactivate,

    cleanup,
  }
}
