'use client'
import { useRef, useState, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════
// SYSTEM 1 — SMART BOT ENGINE (AI Decision Engine)
// ═══════════════════════════════════════════════════════════════════
// Pattern-based automation engine that cycles through game actions
// with intelligent cooldowns, priority scheduling, and safety guards.
//
// Uses the existing ADB command queue — never sends commands directly.
// ═══════════════════════════════════════════════════════════════════

export type BotState = 'idle' | 'running' | 'paused' | 'cooldown'

type BotAction = {
  name: string
  commands: string[]       // ADB commands to execute in sequence
  cooldownMs: number       // min time between executions
  priority: number         // higher = executed first
  lastRun: number          // timestamp of last execution
  failCount: number        // consecutive failures
  maxFails: number         // disable after this many consecutive fails
}

type BotLog = {
  ts: number
  level: 'info' | 'warn' | 'error'
  msg: string
}

type BotConfig = {
  /** Minimum gap between any two actions (ms) */
  globalCooldownMs: number
  /** Maximum actions per minute (safety throttle) */
  maxActionsPerMinute: number
  /** Stop bot after this many consecutive global errors */
  maxGlobalErrors: number
}

const DEFAULT_CONFIG: BotConfig = {
  globalCooldownMs: 3000,
  maxActionsPerMinute: 12,
  maxGlobalErrors: 5,
}

// ── Predefined Viking Rise action library ──────────────────────
const ACTION_LIBRARY: Omit<BotAction, 'lastRun' | 'failCount'>[] = [
  {
    name: 'collect_mail',
    commands: ['tap:1210,647', 'tap:640,360', 'key:BACK'],
    cooldownMs: 60_000,
    priority: 10,
    maxFails: 3,
  },
  {
    name: 'collect_rewards',
    commands: ['tap:1140,647', 'tap:640,400', 'key:BACK'],
    cooldownMs: 90_000,
    priority: 9,
    maxFails: 3,
  },
  {
    name: 'check_castle',
    commands: ['tap:640,360'],
    cooldownMs: 45_000,
    priority: 7,
    maxFails: 5,
  },
  {
    name: 'open_map',
    commands: ['tap:71,647'],
    cooldownMs: 30_000,
    priority: 5,
    maxFails: 5,
  },
  {
    name: 'alliance_help',
    commands: ['tap:71,467', 'tap:400,500', 'key:BACK'],
    cooldownMs: 120_000,
    priority: 8,
    maxFails: 3,
  },
  {
    name: 'go_home',
    commands: ['key:HOME', 'tap:640,360'],
    cooldownMs: 300_000,
    priority: 1,
    maxFails: 10,
  },
]

export function useBotEngine(
  sendAdb: (farmId: string, command: string) => void,
  config: BotConfig = DEFAULT_CONFIG,
) {
  const [botState, setBotState] = useState<BotState>('idle')
  const [botFarm, setBotFarm] = useState<string | null>(null)
  const [botLogs, setBotLogs] = useState<BotLog[]>([])
  const [actionsThisMinute, setActionsThisMinute] = useState(0)

  const actionsRef = useRef<BotAction[]>([])
  const tickTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastActionTimeRef = useRef(0)
  const globalErrorCountRef = useRef(0)
  const actionsInMinuteRef = useRef<number[]>([]) // timestamps
  const mountedRef = useRef(true)

  const log = useCallback((level: BotLog['level'], msg: string) => {
    const entry: BotLog = { ts: Date.now(), level, msg: `[BOT] ${msg}` }
    setBotLogs(prev => [...prev.slice(-99), entry]) // keep last 100
    if (level === 'error') console.error(entry.msg)
    else console.log(entry.msg)
  }, [])

  // ── Rate limiter: actions per minute ────────────────────────
  const canAct = useCallback((): boolean => {
    const now = Date.now()
    // Purge entries older than 60s
    actionsInMinuteRef.current = actionsInMinuteRef.current.filter(
      t => now - t < 60_000
    )
    setActionsThisMinute(actionsInMinuteRef.current.length)
    if (actionsInMinuteRef.current.length >= config.maxActionsPerMinute) {
      return false
    }
    // Global cooldown
    if (now - lastActionTimeRef.current < config.globalCooldownMs) {
      return false
    }
    return true
  }, [config])

  // ── Pick next action based on priority + cooldown ───────────
  const pickNextAction = useCallback((): BotAction | null => {
    const now = Date.now()
    const candidates = actionsRef.current
      .filter(a => {
        if (a.failCount >= a.maxFails) return false       // disabled
        if (now - a.lastRun < a.cooldownMs) return false  // cooldown
        return true
      })
      .sort((a, b) => b.priority - a.priority)            // highest first

    return candidates[0] || null
  }, [])

  // ── Execute one action (sequential commands via queue) ──────
  const executeAction = useCallback(async (farmId: string, action: BotAction) => {
    log('info', `▶ ${action.name} (${action.commands.length} cmds)`)
    action.lastRun = Date.now()
    lastActionTimeRef.current = Date.now()
    actionsInMinuteRef.current.push(Date.now())
    setActionsThisMinute(actionsInMinuteRef.current.length)

    for (const cmd of action.commands) {
      if (!mountedRef.current) return
      sendAdb(farmId, cmd)
      // Small delay between sequential commands in same action
      await new Promise(r => setTimeout(r, 800))
    }

    // Reset fail count on successful execution
    action.failCount = 0
    globalErrorCountRef.current = 0
  }, [sendAdb, log])

  // ── Main tick — runs every 2s ───────────────────────────────
  const tick = useCallback(async () => {
    if (!mountedRef.current) return
    const farmId = botFarm

    if (!farmId) {
      log('warn', 'No farm set, pausing')
      setBotState('paused')
      return
    }

    if (!canAct()) {
      setBotState('cooldown')
      return
    }

    const action = pickNextAction()
    if (!action) {
      setBotState('cooldown')
      return
    }

    setBotState('running')
    try {
      await executeAction(farmId, action)
    } catch (e: any) {
      action.failCount++
      globalErrorCountRef.current++
      log('error', `✗ ${action.name} failed (${action.failCount}/${action.maxFails}): ${e?.message || 'unknown'}`)

      if (globalErrorCountRef.current >= config.maxGlobalErrors) {
        log('error', `⛔ Too many errors (${globalErrorCountRef.current}), stopping bot`)
        stopBot()
        return
      }
    }

    if (mountedRef.current) setBotState('running')
  }, [botFarm, canAct, pickNextAction, executeAction, log, config])

  // ── Public API ──────────────────────────────────────────────
  const startBot = useCallback((farmId: string) => {
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current)
      tickTimerRef.current = null
    }

    mountedRef.current = true
    setBotFarm(farmId)
    setBotState('running')
    globalErrorCountRef.current = 0

    // Initialize actions with fresh state
    actionsRef.current = ACTION_LIBRARY.map(a => ({
      ...a,
      lastRun: 0,
      failCount: 0,
    }))

    log('info', `🤖 Bot started on ${farmId}`)
    tickTimerRef.current = setInterval(tick, 2000)
    // Run first tick immediately
    tick()
  }, [log, tick])

  const stopBot = useCallback(() => {
    mountedRef.current = false
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current)
      tickTimerRef.current = null
    }
    setBotState('idle')
    log('info', '⏹ Bot stopped')
  }, [log])

  const pauseBot = useCallback(() => {
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current)
      tickTimerRef.current = null
    }
    setBotState('paused')
    log('info', '⏸ Bot paused')
  }, [log])

  const resumeBot = useCallback(() => {
    if (!botFarm) return
    mountedRef.current = true
    setBotState('running')
    log('info', '▶ Bot resumed')
    tickTimerRef.current = setInterval(tick, 2000)
    tick()
  }, [botFarm, log, tick])

  // Cleanup
  const cleanup = useCallback(() => {
    mountedRef.current = false
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current)
      tickTimerRef.current = null
    }
  }, [])

  return {
    botState,
    botFarm,
    botLogs,
    actionsThisMinute,
    maxActionsPerMinute: config.maxActionsPerMinute,
    startBot,
    stopBot,
    pauseBot,
    resumeBot,
    cleanup,
  }
}
