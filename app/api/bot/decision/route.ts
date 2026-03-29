import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════════
// Backend Orchestrator — /api/bot/decision
// ═══════════════════════════════════════════════════════════════════
// Receives screenshot metadata + bot state from the frontend,
// returns the next recommended action. This is the foundation for
// moving bot logic to the server side for scaling.
// ═══════════════════════════════════════════════════════════════════

type DecisionRequest = {
  farm_id: string
  screen_state: 'idle' | 'menu' | 'loading' | 'battle' | 'dialog' | 'unknown'
  brightness: number
  bot_state: 'idle' | 'running' | 'paused' | 'cooldown'
  last_action?: string | null
  last_action_ts?: number | null
  error_count?: number
}

type DecisionResponse = {
  ok: boolean
  action: string | null       // ADB command or null (do nothing)
  action_name: string | null  // human-readable name
  reason: string
  cooldown_ms: number         // how long to wait before next decision call
}

// ── Simple rule-based decision engine (server-side) ──────────────
function decide(req: DecisionRequest): DecisionResponse {
  const now = Date.now()
  const timeSinceLastAction = req.last_action_ts ? now - req.last_action_ts : 999999

  // Don't act during loading screens
  if (req.screen_state === 'loading') {
    return {
      ok: true, action: null, action_name: null,
      reason: 'Screen is loading, waiting...', cooldown_ms: 3000,
    }
  }

  // If in battle, don't interrupt
  if (req.screen_state === 'battle') {
    return {
      ok: true, action: null, action_name: null,
      reason: 'Battle in progress, standing by', cooldown_ms: 5000,
    }
  }

  // If dialog is open, try closing it
  if (req.screen_state === 'dialog') {
    return {
      ok: true, action: 'key:BACK', action_name: 'close_dialog',
      reason: 'Dialog detected, closing', cooldown_ms: 2000,
    }
  }

  // Too many errors — go home
  if ((req.error_count || 0) >= 3) {
    return {
      ok: true, action: 'key:HOME', action_name: 'error_recovery',
      reason: 'Too many errors, going home for recovery', cooldown_ms: 10000,
    }
  }

  // Normal state — cycle through actions based on time
  if (req.bot_state !== 'running') {
    return {
      ok: true, action: null, action_name: null,
      reason: 'Bot not running', cooldown_ms: 5000,
    }
  }

  // Minimum 3s between actions
  if (timeSinceLastAction < 3000) {
    return {
      ok: true, action: null, action_name: null,
      reason: 'Cooldown active', cooldown_ms: 3000 - timeSinceLastAction,
    }
  }

  // Priority action queue based on screen state
  if (req.screen_state === 'idle') {
    const lastAct: string = req.last_action ?? ''
    const actions = [
      { name: 'collect_mail',    cmd: 'tap:1210,647', cooldown: 60000,  reason: 'Screen idle, collecting mail' },
      { name: 'collect_rewards', cmd: 'tap:1140,647', cooldown: 90000,  reason: 'Screen idle, collecting rewards' },
    ]
    for (const a of actions) {
      if (lastAct !== a.name || timeSinceLastAction > a.cooldown) {
        return { ok: true, action: a.cmd, action_name: a.name, reason: a.reason, cooldown_ms: 5000 }
      }
    }
  }

  // Default: check castle
  return {
    ok: true, action: 'tap:640,360', action_name: 'check_castle',
    reason: 'Default action — check castle', cooldown_ms: 5000,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: DecisionRequest = await req.json()

    if (!body.farm_id) {
      return NextResponse.json({ ok: false, error: 'farm_id required' }, { status: 400 })
    }

    const decision = decide(body)
    return NextResponse.json(decision)
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Decision engine error' },
      { status: 500 }
    )
  }
}
