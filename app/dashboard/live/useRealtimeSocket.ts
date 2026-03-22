'use client'
import { useRef, useState, useCallback, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════════════
// SYSTEM 2 — LIVE WEBSOCKET ENGINE
// ═══════════════════════════════════════════════════════════════════
// Real-time communication layer with auto-reconnect, exponential
// backoff, deduplication, and graceful HTTP polling fallback.
//
// Channels: screenshot frames, command acks, farm status updates.
// ═══════════════════════════════════════════════════════════════════

export type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'fallback'

type WsMessage = {
  type: 'screenshot' | 'command_ack' | 'farm_status' | 'error' | 'ping'
  farm_id?: string
  data?: any
  ts?: number
}

type WsConfig = {
  /** Base URL for WebSocket (wss://...) */
  baseUrl: string
  /** API key for auth */
  apiKey: string
  /** Max reconnect attempts before fallback */
  maxReconnects: number
  /** Base delay for exponential backoff (ms) */
  baseDelay: number
  /** Max backoff delay (ms) */
  maxDelay: number
  /** Ping interval to keep connection alive (ms) */
  pingIntervalMs: number
}

const DEFAULT_CONFIG: WsConfig = {
  baseUrl: 'wss://cloud.vrbot.me/ws',
  apiKey: 'vrbot_admin_2026',
  maxReconnects: 5,
  baseDelay: 1000,
  maxDelay: 30_000,
  pingIntervalMs: 25_000,
}

export function useRealtimeSocket(config: Partial<WsConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const [wsStatus, setWsStatus] = useState<WsStatus>('disconnected')
  const [lastFrameTs, setLastFrameTs] = useState<number>(0)
  const [wsLatency, setWsLatency] = useState<number | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastPingSentRef = useRef(0)
  const connectedFarmRef = useRef<string | null>(null)
  const mountedRef = useRef(true)
  const seenMsgIds = useRef<Set<string>>(new Set())

  // Callbacks — set by the consumer
  const onScreenshotRef = useRef<((blob: Blob) => void) | null>(null)
  const onCommandAckRef = useRef<((data: any) => void) | null>(null)
  const onFarmStatusRef = useRef<((data: any) => void) | null>(null)
  const onLogRef = useRef<((level: string, msg: string) => void) | null>(null)

  const log = useCallback((level: string, msg: string) => {
    const full = `[WS] ${msg}`
    if (level === 'error') console.error(full)
    else console.log(full)
    onLogRef.current?.(level, full)
  }, [])

  // ── Deduplication ─────────────────────────────────────────
  const isDuplicate = useCallback((msg: WsMessage): boolean => {
    const id = `${msg.type}_${msg.ts || 0}_${msg.farm_id || ''}`
    if (seenMsgIds.current.has(id)) return true
    seenMsgIds.current.add(id)
    // Keep set bounded
    if (seenMsgIds.current.size > 200) {
      const arr = Array.from(seenMsgIds.current)
      seenMsgIds.current = new Set(arr.slice(-100))
    }
    return false
  }, [])

  // ── Cleanup internals ────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current)
      pingTimerRef.current = null
    }
  }, [])

  // ── Close connection cleanly ─────────────────────────────
  const closeWs = useCallback(() => {
    clearTimers()
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.onmessage = null
      if (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'client_close')
      }
      wsRef.current = null
    }
    connectedFarmRef.current = null
  }, [clearTimers])

  // ── Start ping/pong keepalive ─────────────────────────────
  const startPing = useCallback(() => {
    if (pingTimerRef.current) clearInterval(pingTimerRef.current)
    pingTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        lastPingSentRef.current = Date.now()
        wsRef.current.send(JSON.stringify({ type: 'ping', ts: Date.now() }))
      }
    }, cfg.pingIntervalMs)
  }, [cfg.pingIntervalMs])

  // ── Reconnect with exponential backoff ─────────────────────
  const scheduleReconnect = useCallback((farmId: string) => {
    if (!mountedRef.current) return
    if (reconnectCountRef.current >= cfg.maxReconnects) {
      log('warn', `Max reconnects (${cfg.maxReconnects}) reached — falling back to HTTP polling`)
      setWsStatus('fallback')
      return
    }

    const delay = Math.min(
      cfg.baseDelay * Math.pow(2, reconnectCountRef.current),
      cfg.maxDelay
    )
    reconnectCountRef.current++
    setWsStatus('reconnecting')
    log('info', `Reconnecting in ${delay}ms (attempt ${reconnectCountRef.current}/${cfg.maxReconnects})`)

    reconnectTimerRef.current = setTimeout(() => {
      if (mountedRef.current) connect(farmId)
    }, delay)
  }, [cfg, log])

  // ── Connect to WebSocket ──────────────────────────────────
  const connect = useCallback((farmId: string) => {
    if (!mountedRef.current) return
    closeWs()

    const numMatch = farmId.match(/farm_(\d+)/)
    const num = numMatch ? numMatch[1] : farmId
    const url = `${cfg.baseUrl}/farm/${num}?key=${cfg.apiKey}`

    setWsStatus('connecting')
    log('info', `Connecting to ${url}`)

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws
      connectedFarmRef.current = farmId

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return }
        reconnectCountRef.current = 0
        setWsStatus('connected')
        log('info', `✅ Connected to farm ${farmId}`)
        startPing()
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          // Binary frame = screenshot
          if (event.data instanceof Blob) {
            setLastFrameTs(Date.now())
            onScreenshotRef.current?.(event.data)
            return
          }

          const msg: WsMessage = JSON.parse(event.data)
          if (isDuplicate(msg)) return

          switch (msg.type) {
            case 'screenshot':
              // base64 encoded screenshot
              if (msg.data) {
                setLastFrameTs(Date.now())
                const bytes = atob(msg.data)
                const arr = new Uint8Array(bytes.length)
                for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
                const blob = new Blob([arr], { type: 'image/png' })
                onScreenshotRef.current?.(blob)
              }
              break
            case 'command_ack':
              onCommandAckRef.current?.(msg.data)
              break
            case 'farm_status':
              onFarmStatusRef.current?.(msg.data)
              break
            case 'ping':
              // pong — measure latency
              if (lastPingSentRef.current > 0) {
                setWsLatency(Date.now() - lastPingSentRef.current)
              }
              break
            case 'error':
              log('error', `Server error: ${msg.data}`)
              break
          }
        } catch (e) {
          // Not JSON — ignore
        }
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        log('error', 'WebSocket error')
      }

      ws.onclose = (event) => {
        if (!mountedRef.current) return
        clearTimers()
        const reason = event.reason || `code=${event.code}`
        log('info', `Connection closed: ${reason}`)

        if (event.code !== 1000) {
          // Abnormal close — try reconnect
          scheduleReconnect(farmId)
        } else {
          setWsStatus('disconnected')
        }
      }
    } catch (e: any) {
      log('error', `Failed to create WebSocket: ${e?.message}`)
      scheduleReconnect(farmId)
    }
  }, [cfg, closeWs, log, startPing, isDuplicate, scheduleReconnect])

  // ── Send command via WebSocket ────────────────────────────
  const sendWsCommand = useCallback((farmId: string, command: string): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN && connectedFarmRef.current === farmId) {
      wsRef.current.send(JSON.stringify({
        type: 'command',
        farm_id: farmId,
        command,
        ts: Date.now(),
      }))
      return true
    }
    return false // caller should fall back to HTTP
  }, [])

  // ── Public API ────────────────────────────────────────────
  const connectToFarm = useCallback((farmId: string) => {
    reconnectCountRef.current = 0
    connect(farmId)
  }, [connect])

  const disconnect = useCallback(() => {
    closeWs()
    setWsStatus('disconnected')
    log('info', 'Disconnected')
  }, [closeWs, log])

  const setOnScreenshot = useCallback((fn: (blob: Blob) => void) => {
    onScreenshotRef.current = fn
  }, [])

  const setOnCommandAck = useCallback((fn: (data: any) => void) => {
    onCommandAckRef.current = fn
  }, [])

  const setOnFarmStatus = useCallback((fn: (data: any) => void) => {
    onFarmStatusRef.current = fn
  }, [])

  const setOnLog = useCallback((fn: (level: string, msg: string) => void) => {
    onLogRef.current = fn
  }, [])

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    mountedRef.current = false
    closeWs()
  }, [closeWs])

  return {
    wsStatus,
    lastFrameTs,
    wsLatency,
    connectToFarm,
    disconnect,
    sendWsCommand,
    setOnScreenshot,
    setOnCommandAck,
    setOnFarmStatus,
    setOnLog,
    cleanup,
    /** Whether WS is available for commands */
    isConnected: wsStatus === 'connected',
    /** Whether we've given up on WS and need HTTP polling */
    isFallback: wsStatus === 'fallback',
  }
}
