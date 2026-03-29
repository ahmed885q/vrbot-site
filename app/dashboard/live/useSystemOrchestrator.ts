'use client'
import { useRef, useState, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════
// SYSTEM 4 — SYSTEM ORCHESTRATOR (Single Source of Truth)
// ═══════════════════════════════════════════════════════════════════
// Central coordinator that prevents conflicts between Bot, WS,
// Health Monitor, and manual controls. Enforces system modes and
// ensures only one subsystem acts at a time.
//
// Modes:
//   idle        — nothing active, all systems standby
//   manual      — user is interacting (tap/swipe/ADB), bot paused
//   bot-active  — bot is running actions, manual controls locked
//   recovering  — health monitor triggered self-heal, everything paused
// ═══════════════════════════════════════════════════════════════════

export type SystemMode = 'idle' | 'manual' | 'bot-active' | 'recovering'

export type SystemState = {
  mode: SystemMode
  activeFarmId: string | null
  streamActive: boolean
  botActive: boolean
  wsConnected: boolean
  lastFrameTs: number
  lastCommandTs: number
  lastModeChangeTs: number
  modeHistory: Array<{ mode: SystemMode; ts: number; reason: string }>
}

type ModeTransition = {
  from: SystemMode
  to: SystemMode
  reason: string
  ts: number
}

type OrchestratorCallbacks = {
  pauseBot: () => void
  resumeBot: () => void
  stopBot: () => void
  disconnectWs: () => void
  connectWs: (farmId: string) => void
}

type OrchestratorConfig = {
  /** Time in manual mode before auto-returning to previous mode (ms) */
  manualTimeoutMs: number
  /** Minimum time in recovering mode before allowing transitions (ms) */
  recoveryMinDurationMs: number
  /** Max mode history entries */
  maxHistory: number
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  manualTimeoutMs: 15_000,
  recoveryMinDurationMs: 5_000,
  maxHistory: 50,
}

// ── Mode transition rules ─────────────────────────────────────────
// Defines which transitions are legal
const ALLOWED_TRANSITIONS: Record<SystemMode, SystemMode[]> = {
  'idle':       ['manual', 'bot-active', 'recovering'],
  'manual':     ['idle', 'bot-active', 'recovering'],
  'bot-active': ['idle', 'manual', 'recovering'],
  'recovering': ['idle', 'manual'],  // must recover before bot can resume
}

export function useSystemOrchestrator(config: Partial<OrchestratorConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const [state, setState] = useState<SystemState>({
    mode: 'idle',
    activeFarmId: null,
    streamActive: false,
    botActive: false,
    wsConnected: false,
    lastFrameTs: 0,
    lastCommandTs: 0,
    lastModeChangeTs: 0,
    modeHistory: [],
  })

  const stateRef = useRef<SystemState>(state)
  const callbacksRef = useRef<OrchestratorCallbacks | null>(null)
  const manualTimerRef = useRef<NodeJS.Timeout | null>(null)
  const previousModeRef = useRef<SystemMode>('idle')
  const lockRef = useRef(false) // prevents concurrent transitions

  // Keep ref in sync
  const updateState = useCallback((updater: (prev: SystemState) => SystemState) => {
    setState(prev => {
      const next = updater(prev)
      stateRef.current = next
      return next
    })
  }, [])

  // ── Mode transition with validation ─────────────────────────────
  const transitionTo = useCallback((to: SystemMode, reason: string): boolean => {
    // Prevent concurrent transitions
    if (lockRef.current) return false
    lockRef.current = true

    try {
      const current = stateRef.current.mode

      // Check if transition is allowed
      if (!ALLOWED_TRANSITIONS[current]?.includes(to)) {
        console.warn(`[ORCH] Blocked transition ${current} → ${to}: not allowed`)
        return false
      }

      // Enforce recovery minimum duration
      if (current === 'recovering') {
        const elapsed = Date.now() - stateRef.current.lastModeChangeTs
        if (elapsed < cfg.recoveryMinDurationMs) {
          console.warn(`[ORCH] Blocked exit from recovering: ${elapsed}ms < ${cfg.recoveryMinDurationMs}ms minimum`)
          return false
        }
      }

      const transition: ModeTransition = { from: current, to, reason, ts: Date.now() }
      console.log(`[ORCH] ${current} → ${to} (${reason})`)

      // Clear manual timeout if leaving manual mode
      if (manualTimerRef.current) {
        clearTimeout(manualTimerRef.current)
        manualTimerRef.current = null
      }

      previousModeRef.current = current

      // Execute side effects based on transition
      const callbacks = callbacksRef.current
      if (callbacks) {
        switch (to) {
          case 'manual':
            // Pause bot when entering manual mode
            if (stateRef.current.botActive) {
              callbacks.pauseBot()
            }
            // Auto-return to previous mode after timeout
            manualTimerRef.current = setTimeout(() => {
              manualTimerRef.current = null
              const prev = previousModeRef.current
              if (stateRef.current.mode === 'manual') {
                if (prev === 'bot-active' && stateRef.current.botActive) {
                  transitionTo('bot-active', 'manual timeout → resume bot')
                } else {
                  transitionTo('idle', 'manual timeout')
                }
              }
            }, cfg.manualTimeoutMs)
            break

          case 'bot-active':
            // Resume bot when entering bot-active mode
            if (stateRef.current.botActive) {
              callbacks.resumeBot()
            }
            break

          case 'recovering':
            // Pause bot and let health monitor take over
            if (stateRef.current.botActive) {
              callbacks.pauseBot()
            }
            break

          case 'idle':
            // Clean state
            break
        }
      }

      // Update state
      updateState(prev => ({
        ...prev,
        mode: to,
        lastModeChangeTs: transition.ts,
        modeHistory: [
          ...prev.modeHistory.slice(-(cfg.maxHistory - 1)),
          { mode: to, ts: transition.ts, reason },
        ],
      }))

      return true
    } finally {
      lockRef.current = false
    }
  }, [cfg, updateState])

  // ── Permission checks (conflict prevention) ──────────────────────
  const canSendCommand = useCallback((): boolean => {
    const mode = stateRef.current.mode
    // Commands allowed in manual and bot-active modes
    return mode === 'manual' || mode === 'bot-active' || mode === 'idle'
  }, [])

  const canBotAct = useCallback((): boolean => {
    return stateRef.current.mode === 'bot-active'
  }, [])

  const canManualAct = useCallback((): boolean => {
    const mode = stateRef.current.mode
    return mode === 'manual' || mode === 'idle'
  }, [])

  const canHeal = useCallback((): boolean => {
    // Health monitor can always request recovery
    return true
  }, [])

  // ── State reporters (called by subsystems) ──────────────────────
  const reportFrame = useCallback(() => {
    updateState(prev => ({ ...prev, lastFrameTs: Date.now() }))
  }, [updateState])

  const reportCommand = useCallback(() => {
    updateState(prev => ({ ...prev, lastCommandTs: Date.now() }))
  }, [updateState])

  const reportStreamActive = useCallback((active: boolean) => {
    updateState(prev => ({ ...prev, streamActive: active }))
  }, [updateState])

  const reportBotActive = useCallback((active: boolean) => {
    updateState(prev => ({ ...prev, botActive: active }))
  }, [updateState])

  const reportWsConnected = useCallback((connected: boolean) => {
    updateState(prev => ({ ...prev, wsConnected: connected }))
  }, [updateState])

  // ── Farm management ─────────────────────────────────────────────
  const setActiveFarm = useCallback((farmId: string | null) => {
    updateState(prev => ({ ...prev, activeFarmId: farmId }))
  }, [updateState])

  // ── Manual interaction signal ───────────────────────────────────
  // Call this whenever the user taps/swipes/sends manual ADB commands
  const signalManualInteraction = useCallback(() => {
    const mode = stateRef.current.mode
    if (mode === 'recovering') return // don't interrupt recovery

    if (mode !== 'manual') {
      transitionTo('manual', 'user interaction')
    } else {
      // Reset manual timeout
      if (manualTimerRef.current) {
        clearTimeout(manualTimerRef.current)
      }
      manualTimerRef.current = setTimeout(() => {
        manualTimerRef.current = null
        if (stateRef.current.mode === 'manual') {
          const prev = previousModeRef.current
          if (prev === 'bot-active' && stateRef.current.botActive) {
            transitionTo('bot-active', 'manual timeout → resume bot')
          } else {
            transitionTo('idle', 'manual timeout')
          }
        }
      }, cfg.manualTimeoutMs)
    }
  }, [cfg.manualTimeoutMs, transitionTo])

  // ── Recovery signal (called by health monitor) ──────────────────
  const signalRecovery = useCallback((reason: string) => {
    transitionTo('recovering', reason)
  }, [transitionTo])

  const signalRecoveryComplete = useCallback(() => {
    const prev = previousModeRef.current
    if (prev === 'bot-active' && stateRef.current.botActive) {
      transitionTo('bot-active', 'recovery complete → resume bot')
    } else {
      transitionTo('idle', 'recovery complete')
    }
  }, [transitionTo])

  // ── Bot control signals ─────────────────────────────────────────
  const signalBotStart = useCallback((farmId: string) => {
    setActiveFarm(farmId)
    reportBotActive(true)
    transitionTo('bot-active', `bot started on ${farmId}`)
  }, [setActiveFarm, reportBotActive, transitionTo])

  const signalBotStop = useCallback(() => {
    reportBotActive(false)
    if (stateRef.current.mode === 'bot-active') {
      transitionTo('idle', 'bot stopped')
    }
  }, [reportBotActive, transitionTo])

  // ── Public API ──────────────────────────────────────────────────
  const registerCallbacks = useCallback((callbacks: OrchestratorCallbacks) => {
    callbacksRef.current = callbacks
  }, [])

  const cleanup = useCallback(() => {
    if (manualTimerRef.current) {
      clearTimeout(manualTimerRef.current)
      manualTimerRef.current = null
    }
    callbacksRef.current = null
  }, [])

  return {
    // State
    state,
    mode: state.mode,
    activeFarmId: state.activeFarmId,

    // Permission checks
    canSendCommand,
    canBotAct,
    canManualAct,
    canHeal,

    // Mode transitions
    transitionTo,
    signalManualInteraction,
    signalRecovery,
    signalRecoveryComplete,
    signalBotStart,
    signalBotStop,

    // State reporters
    reportFrame,
    reportCommand,
    reportStreamActive,
    reportBotActive,
    reportWsConnected,
    setActiveFarm,

    // Setup
    registerCallbacks,
    cleanup,
  }
}
