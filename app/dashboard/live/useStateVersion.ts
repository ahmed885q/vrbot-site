'use client'
import { useRef, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════
// DISTRIBUTED CONSISTENCY — LAYER 2: EVENT ORDERING + VERSIONING
// ═══════════════════════════════════════════════════════════════════
// Monotonic version counters for system state, WS messages, and
// backend responses. Stale updates (lower version than current)
// are silently dropped. Prevents out-of-order application.
//
// Channels:
//   system   — orchestrator mode, farm state
//   stream   — screenshot frames, stream status
//   ws       — WebSocket messages (dedup + ordering)
//   adb      — ADB command results
//   bot      — bot decisions and actions
//   backend  — backend state sync responses
// ═══════════════════════════════════════════════════════════════════

export type VersionChannel =
  | 'system'
  | 'stream'
  | 'ws'
  | 'adb'
  | 'bot'
  | 'backend'

type VersionEntry = {
  version: number
  ts: number
  source: string
}

type StaleRejectLog = {
  channel: VersionChannel
  rejectedVersion: number
  currentVersion: number
  ts: number
}

type VersionConfig = {
  /** Max stale rejection logs */
  maxRejectLog: number
}

const DEFAULT_CONFIG: VersionConfig = {
  maxRejectLog: 100,
}

export function useStateVersion(config: Partial<VersionConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // Per-channel version tracking
  const versionsRef = useRef<Record<VersionChannel, VersionEntry>>({
    system:  { version: 0, ts: Date.now(), source: 'init' },
    stream:  { version: 0, ts: Date.now(), source: 'init' },
    ws:      { version: 0, ts: Date.now(), source: 'init' },
    adb:     { version: 0, ts: Date.now(), source: 'init' },
    bot:     { version: 0, ts: Date.now(), source: 'init' },
    backend: { version: 0, ts: Date.now(), source: 'init' },
  })

  // Stale rejection log
  const rejectLogRef = useRef<StaleRejectLog[]>([])

  // Per-channel local counter (for generating versions)
  const counterRef = useRef<Record<VersionChannel, number>>({
    system: 0, stream: 0, ws: 0, adb: 0, bot: 0, backend: 0,
  })

  // ── Generate next version for a channel ─────────────────────────
  const nextVersion = useCallback((channel: VersionChannel, source: string = 'local'): number => {
    counterRef.current[channel]++
    const v = counterRef.current[channel]
    versionsRef.current[channel] = { version: v, ts: Date.now(), source }
    return v
  }, [])

  // ── Accept or reject an update based on version ─────────────────
  // Returns true if the update should be applied (version is newer)
  const acceptUpdate = useCallback((channel: VersionChannel, incomingVersion: number, source: string = 'remote'): boolean => {
    const current = versionsRef.current[channel]

    // Newer version — accept
    if (incomingVersion > current.version) {
      versionsRef.current[channel] = {
        version: incomingVersion,
        ts: Date.now(),
        source,
      }
      // Sync local counter to at least incoming version
      if (counterRef.current[channel] < incomingVersion) {
        counterRef.current[channel] = incomingVersion
      }
      return true
    }

    // Same or older version — reject
    rejectLogRef.current.push({
      channel,
      rejectedVersion: incomingVersion,
      currentVersion: current.version,
      ts: Date.now(),
    })

    // Trim reject log
    if (rejectLogRef.current.length > cfg.maxRejectLog) {
      rejectLogRef.current = rejectLogRef.current.slice(-Math.floor(cfg.maxRejectLog * 0.7))
    }

    return false
  }, [cfg.maxRejectLog])

  // ── Get current version for a channel ───────────────────────────
  const getVersion = useCallback((channel: VersionChannel): number => {
    return versionsRef.current[channel].version
  }, [])

  // ── Get all channel versions (for sync payload) ─────────────────
  const getAllVersions = useCallback((): Record<VersionChannel, number> => {
    const result: Partial<Record<VersionChannel, number>> = {}
    const channels: VersionChannel[] = ['system', 'stream', 'ws', 'adb', 'bot', 'backend']
    channels.forEach(ch => {
      result[ch] = versionsRef.current[ch].version
    })
    return result as Record<VersionChannel, number>
  }, [])

  // ── Stamp an outgoing message with version ──────────────────────
  const stamp = useCallback(<T extends Record<string, any>>(channel: VersionChannel, message: T, source: string = 'local'): T & { _v: number; _ts: number; _ch: string } => {
    const v = nextVersion(channel, source)
    return {
      ...message,
      _v: v,
      _ts: Date.now(),
      _ch: channel,
    }
  }, [nextVersion])

  // ── Validate an incoming stamped message ────────────────────────
  // Returns the message payload if version is accepted, null if stale
  const validate = useCallback(<T extends Record<string, any>>(message: T & { _v?: number; _ts?: number; _ch?: string }): T | null => {
    const channel = message._ch as VersionChannel | undefined
    const version = message._v

    if (!channel || version === undefined) {
      // Unstamped message — accept but don't version-track
      return message
    }

    if (acceptUpdate(channel, version, 'incoming')) {
      return message
    }

    // Stale — rejected
    return null
  }, [acceptUpdate])

  // ── Stats ───────────────────────────────────────────────────────
  const getStats = useCallback(() => {
    const rejects = rejectLogRef.current
    const channels: VersionChannel[] = ['system', 'stream', 'ws', 'adb', 'bot', 'backend']
    const channelStats: Record<string, { version: number; rejects: number }> = {}
    channels.forEach(ch => {
      channelStats[ch] = {
        version: versionsRef.current[ch].version,
        rejects: rejects.filter(r => r.channel === ch).length,
      }
    })
    return {
      channels: channelStats,
      totalRejects: rejects.length,
      recentRejects: rejects.slice(-10),
    }
  }, [])

  // ── Cleanup ─────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    const channels: VersionChannel[] = ['system', 'stream', 'ws', 'adb', 'bot', 'backend']
    channels.forEach(ch => {
      versionsRef.current[ch] = { version: 0, ts: Date.now(), source: 'reset' }
      counterRef.current[ch] = 0
    })
    rejectLogRef.current = []
  }, [])

  return {
    nextVersion,
    acceptUpdate,
    getVersion,
    getAllVersions,
    stamp,
    validate,
    getStats,
    cleanup,
  }
}
