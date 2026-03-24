import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════════
// Backend Orchestrator — /api/bot/state
// ═══════════════════════════════════════════════════════════════════
// Receives and stores bot state snapshots from the frontend.
// Returns the latest known state for a farm. This enables:
// - Multi-client monitoring (admin dashboards)
// - Server-side decision making
// - State recovery after frontend reload
// ═══════════════════════════════════════════════════════════════════

// WARNING: In-memory store — state is lost on Vercel serverless cold starts and deploys.
// TODO: Migrate to Supabase table `farm_states` or Redis for persistence.
// For now, this serves as a fast cache; the frontend is the source of truth.
const farmStates = new Map<string, {
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
  updated_at: number
}>()

// Cleanup stale entries older than 30 minutes
function cleanupStale() {
  const cutoff = Date.now() - 30 * 60 * 1000
  Array.from(farmStates.entries()).forEach(([key, val]) => {
    if (val.updated_at < cutoff) farmStates.delete(key)
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.farm_id) {
      return NextResponse.json({ ok: false, error: 'farm_id required' }, { status: 400 })
    }

    farmStates.set(body.farm_id, {
      farm_id: body.farm_id,
      bot_state: body.bot_state || 'unknown',
      screen_state: body.screen_state || 'unknown',
      stream_active: body.stream_active ?? false,
      ws_connected: body.ws_connected ?? false,
      health: body.health || 'unknown',
      last_action: body.last_action || null,
      metrics: {
        adb_success_rate: body.metrics?.adb_success_rate ?? 0,
        stream_frames: body.metrics?.stream_frames ?? 0,
        bot_actions: body.metrics?.bot_actions ?? 0,
        healing_actions: body.metrics?.healing_actions ?? 0,
      },
      updated_at: Date.now(),
    })

    // Periodic cleanup
    if (farmStates.size > 100) cleanupStale()

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'State update error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const farmId = url.searchParams.get('farm_id')

    if (farmId) {
      const state = farmStates.get(farmId)
      if (!state) {
        return NextResponse.json({ ok: false, error: 'Farm not found' }, { status: 404 })
      }
      return NextResponse.json({ ok: true, state })
    }

    // Return all farm states
    const all = Array.from(farmStates.values())
    return NextResponse.json({ ok: true, states: all, count: all.length })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'State read error' },
      { status: 500 }
    )
  }
}
