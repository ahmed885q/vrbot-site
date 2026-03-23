'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useBotEngine } from './useBotEngine'
import { useRealtimeSocket } from './useRealtimeSocket'
import { useHealthMonitor } from './useHealthMonitor'
import { useSystemOrchestrator } from './useSystemOrchestrator'
import { useMetrics } from './useMetrics'
import { useScreenAnalyzer } from './useScreenAnalyzer'
import { useFarmManager } from './useFarmManager'
import { useActionId } from './useActionId'
import { useStateVersion } from './useStateVersion'
import { useStateSync } from './useStateSync'
import { useServerTime } from './useServerTime'

const TASKS_MAP = [
  { group: 'الموارد 🌾',  color: '#10b981', tasks: ['Gather Resources', 'Collect Farms', 'Open Chests', 'Collect Free Items'] },
  { group: 'القتال ⚔️',  color: '#ef4444', tasks: ['Kill Monster', 'Hunt Niflung', 'Rally Niflung'] },
  { group: 'التحالف 🏰', color: '#8b5cf6', tasks: ['Tribe Tech', 'Tribe Gifts', 'Alliance Help', 'Send Gifts'] },
  { group: 'اليومية 📋',  color: '#f59e0b', tasks: ['Mail Rewards', 'Hall of Valor', 'Prosperity', 'Quest Rewards'] },
  { group: 'التطوير 🔨',  color: '#3b82f6', tasks: ['Building Upgrade', 'Train Troops', 'Research Tech', 'Heal Wounded'] },
]

type Farm = {
  id: string
  farm_name: string
  status: string
  game_account?: string
  tasks_today?: number
  live_status?: 'online' | 'idle' | 'offline'
  current_task?: string | null
}

export default function LivePage() {
  const [farms, setFarms]           = useState<Farm[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedFarm, setSelected] = useState<string | null>(null)
  const [selectedTasks, setTasks]   = useState<Set<string>>(new Set())
  const [running, setRunning]       = useState<Record<string, boolean>>({})
  const [msg, setMsg]               = useState('')
  const [cols, setCols]             = useState(2)
  const [showTransfer, setShowTransfer]       = useState(false)
  const [transferFarm, setTransferFarm]       = useState<string | null>(null)
  const [transferTarget, setTransferTarget]   = useState('')
  const [transferRes, setTransferRes]         = useState<Set<string>>(new Set(['food','wood','stone','gold']))
  const [transferAmount, setTransferAmount]   = useState<'all'|'half'>('all')
  const [transferMarches, setTransferMarches] = useState(1)
  const [transferMethod, setTransferMethod]   = useState<'tribe_hall'|'world_map'>('tribe_hall')
  const [transferring, setTransferring]       = useState(false)
  const [transferMsg, setTransferMsg]         = useState('')
  const [streaming, setStreaming]             = useState(false)
  const [screenshot, setScreenshot]           = useState<string | null>(null)
  const [streamFarm, setStreamFarm]           = useState<string | null>(null)
  const [streamMode, setStreamMode]           = useState<'mjpeg' | 'polling'>('mjpeg')
  const mjpegFailedRef                        = useRef(false)
  const screenshotTimer                       = useRef<NodeJS.Timeout | null>(null)
  const streamActive                          = useRef<string | null>(null)
  const [tapMode, setTapMode]                 = useState(false)
  const [tapFeedback, setTapFeedback]         = useState<{x:number,y:number,type?:string} | null>(null)
  const dragStart                             = useRef<{x:number,y:number,ts:number}|null>(null)
  const [zoomedScreenshot, setZoomedScreenshot] = useState<string | null>(null)
  const [adbFeedback, setAdbFeedback]         = useState<string>('')
  const [cmdHistory, setCmdHistory]           = useState<Array<{cmd:string,ok:boolean,ts:number}>>([])
  const lastTapRef                            = useRef<{x:number,y:number,ts:number}|null>(null)
  const lastCmdRef                            = useRef<{cmd:string,ts:number}|null>(null)
  const deviceResRef                          = useRef<{w:number,h:number}>({w:1280,h:720})
  const knownFarms                             = useRef<Set<string>>(new Set())
  const initialLoadDone                        = useRef(false)
  const launchingRef                           = useRef<Set<string>>(new Set())
  const launchTimerRef                         = useRef<NodeJS.Timeout | null>(null)
  const msgTimerRef                            = useRef<NodeJS.Timeout | null>(null)
  const adbTimerRef                            = useRef<NodeJS.Timeout | null>(null)
  const loadingFarmsRef                        = useRef(false)
  const adbQueueRef                            = useRef<Array<{ farmId: string; command: string }>>([])
  const adbProcessingRef                       = useRef(false)
  const capturingRef                           = useRef(false)
  const freezeCheckerRef                       = useRef<NodeJS.Timeout | null>(null)
  const tapFeedbackTimerRef                    = useRef<NodeJS.Timeout | null>(null)
  const transferTimerRef                       = useRef<NodeJS.Timeout | null>(null)
  const farmLastUsedRef                        = useRef<Record<string, number>>({})

  // ── Stable ref for sendAdb (used by hooks before function is defined) ──
  const sendAdbRef = useRef<(farmId: string, command: string) => void>(() => {})

  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  // ── Error boundary state ──────────────────────────────────
  const [systemError, setSystemError] = useState<string | null>(null)
  const errorCountRef = useRef(0)
  const lastErrorTsRef = useRef(0)
  const [showDevPanel, setShowDevPanel] = useState(false)

  // Safe wrapper — prevents crash loops (max 5 errors in 10s = pause)
  const safeExecute = useCallback(<T,>(label: string, fn: () => T): T | null => {
    try {
      return fn()
    } catch (err: any) {
      const now = Date.now()
      // Reset error counter if >10s since last error
      if (now - lastErrorTsRef.current > 10_000) errorCountRef.current = 0
      errorCountRef.current++
      lastErrorTsRef.current = now

      const msg = `[${label}] ${err?.message || 'Unknown error'}`
      console.error('[SYSTEM ERROR]', msg)
      setSystemError(msg)

      if (errorCountRef.current >= 5) {
        console.error('[SYSTEM] Crash loop detected — entering safe mode')
        setSystemError('Crash loop detected — system paused. Use Emergency Stop to reset.')
      }
      return null
    }
  }, [])

  // ── Initialize 10 systems ─────────────────────────────────
  const orch = useSystemOrchestrator()
  const metrics = useMetrics()
  const actionId = useActionId()
  const stateVer = useStateVersion()
  const stateSync = useStateSync()
  const bot = useBotEngine((farmId, cmd) => sendAdbRef.current(farmId, cmd))
  const ws = useRealtimeSocket()
  const monitor = useHealthMonitor()
  const vision = useScreenAnalyzer()
  const farmMgr = useFarmManager()
  const serverTime = useServerTime()

  // ── Durable ADB queue: reload persisted commands on mount ───
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vrbot_adb_queue')
      if (saved) {
        const parsed = JSON.parse(saved) as Array<{ farmId: string; command: string }>
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[DURABLE-Q] Restored ${parsed.length} queued ADB command(s)`)
          adbQueueRef.current = parsed
          localStorage.removeItem('vrbot_adb_queue')
          // Process restored queue after a short delay (let systems init)
          setTimeout(() => processAdbQueue(), 500)
        }
      }
    } catch { /* corrupt data — ignore */ }
  }, [])

  // ── Metrics persistence (localStorage) ──────────────────────
  useEffect(() => {
    // Load saved metrics on mount
    try {
      const saved = localStorage.getItem('vrbot_metrics')
      if (saved) {
        const data = JSON.parse(saved)
        if (data && typeof data === 'object') {
          console.log('[METRICS] Loaded saved session from', new Date(data.sessionStartTs).toLocaleTimeString())
        }
      }
    } catch { /* ignore corrupt data */ }

    // Save metrics every 15 seconds
    const saveTimer = setInterval(() => {
      try {
        const agg = metrics.aggregate()
        const json = JSON.stringify(agg)
        // Max 50KB safety check
        if (json.length < 50_000) {
          localStorage.setItem('vrbot_metrics', json)
        }
      } catch { /* storage full or unavailable */ }
    }, 15_000)

    return () => clearInterval(saveTimer)
  }, [])

  // Aggregate metrics every 5 seconds
  useEffect(() => {
    const t = setInterval(() => {
      safeExecute('metrics.aggregate', () => metrics.aggregate())
    }, 5000)
    return () => clearInterval(t)
  }, [])

  // Register orchestrator callbacks once bot/ws are available
  useEffect(() => {
    orch.registerCallbacks({
      pauseBot: () => safeExecute('orch.pauseBot', () => bot.pauseBot()),
      resumeBot: () => safeExecute('orch.resumeBot', () => bot.resumeBot()),
      stopBot: () => safeExecute('orch.stopBot', () => bot.stopBot()),
      disconnectWs: () => safeExecute('orch.disconnectWs', () => ws.disconnect()),
      connectWs: (farmId: string) => safeExecute('orch.connectWs', () => ws.connectToFarm(farmId)),
    })
  }, [])

  // ── State sync: register snapshot builder + start sync when streaming ──
  useEffect(() => {
    stateSync.registerSnapshotBuilder(() => {
      if (!streamFarm) return null
      const ver = stateVer.nextVersion('backend', 'sync_push')
      return {
        farm_id: streamFarm,
        bot_state: bot.botState,
        screen_state: vision.getLastResult()?.state || 'unknown',
        stream_active: streaming,
        ws_connected: ws.isConnected,
        health: monitor.health,
        last_action: null,
        metrics: {
          adb_success_rate: metrics.aggregated.adbSuccessRate,
          stream_frames: metrics.aggregated.streamTotalFrames,
          bot_actions: metrics.aggregated.botActionsExecuted,
          healing_actions: metrics.aggregated.healingActions,
        },
        _v: ver,
      }
    })
    stateSync.onOverride((backendState: any) => {
      // Backend override: if backend says bot should stop, respect it
      if (backendState.bot_state === 'idle' && bot.botState === 'running') {
        console.warn('[SYNC] Backend override: stopping bot')
        bot.stopBot()
        orch.signalBotStop()
      }
    })
  }, [streamFarm, streaming])

  useEffect(() => {
    if (streaming && streamFarm) {
      stateSync.startSync()
    } else {
      stateSync.stopSync()
    }
  }, [streaming, streamFarm])

  // ── Emergency Kill Switch ───────────────────────────────────
  const emergencyStop = useCallback(() => {
    console.warn('[SYSTEM] ⛔ Emergency stop triggered')
    // 1. Stop bot
    try { bot.stopBot() } catch {}
    try { orch.signalBotStop() } catch {}
    // 2. Stop stream
    try {
      streamActive.current = null
      capturingRef.current = false
      setStreaming(false)
      setStreamFarm(null)
      if (screenshotTimer.current) { clearInterval(screenshotTimer.current); screenshotTimer.current = null }
      if (launchTimerRef.current) { clearTimeout(launchTimerRef.current); launchTimerRef.current = null }
      setScreenshot(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    } catch {}
    // 3. Clear all queues + durable persistence
    adbQueueRef.current.length = 0
    adbProcessingRef.current = false
    try { localStorage.removeItem('vrbot_adb_queue') } catch {}
    // 4. Disconnect WS
    try { ws.disconnect() } catch {}
    // 5. Stop monitor
    try { monitor.stopMonitoring() } catch {}
    // 6. Reset orchestrator
    try {
      orch.reportStreamActive(false)
      orch.reportBotActive(false)
      orch.transitionTo('idle', 'emergency stop')
    } catch {}
    // 7. Stop state sync
    try { stateSync.stopSync() } catch {}
    // 8. Reset error state + consistency layers
    errorCountRef.current = 0
    setSystemError(null)
    setMsg('⛔ Emergency Stop — All systems halted')
  }, [bot, ws, monitor, orch, stateSync])

  const showMsg = (m: string, ms = 4000) => {
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current)
    setMsg(m)
    if (ms > 0) msgTimerRef.current = setTimeout(() => { setMsg(''); msgTimerRef.current = null }, ms)
  }

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (token) return { 'Authorization': `Bearer ${token}` }
    } catch {}
    return {}
  }, [supabase])

  const loadFarms = useCallback(async () => {
    // Prevent overlapping fetches
    if (loadingFarmsRef.current) return
    loadingFarmsRef.current = true
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/farms/list', {
        headers: authHeaders,
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const d = await res.json()
        const list = (d.farms || []).map((f: any) => ({
          id:           f.farm_name || f.id,
          farm_name:    f.farm_name || f.id,
          status:       f.status || 'offline',
          game_account: f.game_account || '',
          tasks_today:  f.tasks_today || f.live_tasks_ok || 0,
          live_status:  f.is_online ? 'online' : f.status === 'provisioning' ? 'idle' : 'offline',
          current_task: f.current_task || f.live_task || null,
        }))
        setFarms(list)

        // Auto-launch: detect newly added running farms
        // Guard: only if initial load done AND farm not already being launched
        if (initialLoadDone.current) {
          for (const farm of list) {
            if (
              farm.status === 'running' &&
              !knownFarms.current.has(farm.farm_name) &&
              !launchingRef.current.has(farm.farm_name)
            ) {
              console.log(`🎮 Auto-launching game for new farm: ${farm.farm_name}`)
              launchGame(farm.farm_name)
              break // only auto-launch one at a time
            }
          }
        }
        // Update known farms set
        knownFarms.current = new Set(list.map((f: Farm) => f.farm_name))
        initialLoadDone.current = true
        // Register with farm manager for multi-farm scaling
        farmMgr.registerFarms(list.map((f: Farm) => f.farm_name))

        // ── Smart warmup: send running farms + last-used hints ──
        const runningFarms = list.filter((f: Farm) => f.status === 'running')
        if (runningFarms.length > 0) {
          const farmIds = runningFarms.map((f: Farm) => f.farm_name)
          // Build hints: only include farms with a known last-used timestamp
          const hints: Record<string, number> = {}
          for (const fid of farmIds) {
            const ts = farmLastUsedRef.current[fid]
            if (ts) hints[fid] = ts
          }
          getAuthHeaders().then(headers => {
            fetch('/api/farms/warmup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify({ farm_ids: farmIds, hints }),
              signal: AbortSignal.timeout(30000),
            })
              .then(r => r.json())
              .then(d => {
                if (d.warmed > 0) console.log(`[WARMUP] Pre-cached ${d.warmed} farm(s), ${d.alreadyCached || 0} already cached`)
              })
              .catch(() => { /* non-critical — silent fail */ })
          })
        }
      }
    } catch (e) {
      console.error('loadFarms error:', e)
    }
    setLoading(false)
    loadingFarmsRef.current = false
  }, [getAuthHeaders])

  useEffect(() => {
    if (farms.length > 0 && !selectedFarm) setSelected(farms[0].id)
  }, [farms, selectedFarm])

  useEffect(() => {
    loadFarms()
    const t = setInterval(loadFarms, 15000)
    return () => clearInterval(t)
  }, [loadFarms])

  useEffect(() => {
    return () => {
      streamActive.current = null
      if (screenshotTimer.current) clearInterval(screenshotTimer.current)
      if (freezeCheckerRef.current) clearInterval(freezeCheckerRef.current)
      if (launchTimerRef.current) clearTimeout(launchTimerRef.current)
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current)
      if (adbTimerRef.current) clearTimeout(adbTimerRef.current)
      if (tapFeedbackTimerRef.current) clearTimeout(tapFeedbackTimerRef.current)
      if (transferTimerRef.current) clearTimeout(transferTimerRef.current)
      adbQueueRef.current.length = 0
      // Cleanup 10 systems
      bot.cleanup()
      ws.cleanup()
      monitor.cleanup()
      orch.cleanup()
      metrics.cleanup()
      vision.cleanup()
      farmMgr.cleanup()
      actionId.cleanup()
      stateVer.cleanup()
      stateSync.cleanup()
      // Persist remaining ADB queue for survival across page close
      try {
        if (adbQueueRef.current.length > 0) {
          localStorage.setItem('vrbot_adb_queue', JSON.stringify(adbQueueRef.current))
        }
      } catch {}
    }
  }, [])

  // ── Start health monitor when streaming (with orchestrator + metrics + error boundaries) ──
  useEffect(() => {
    if (streaming && streamFarm) {
      monitor.startMonitoring(streamFarm, {
        restartStream: () => safeExecute('heal.restartStream', () => {
          orch.signalRecovery('stream frozen → auto-restart')
          metrics.recordStreamRestart()
          metrics.recordHealingAction(true, 'restart_stream')
          if (streamFarm) startStream(streamFarm)
          setTimeout(() => orch.signalRecoveryComplete(), 3000)
        }),
        clearAdbQueue: () => safeExecute('heal.clearAdbQueue', () => {
          adbQueueRef.current.length = 0
          metrics.recordHealingAction(true, 'clear_adb_queue')
        }),
        reconnectWs: () => safeExecute('heal.reconnectWs', () => {
          if (streamFarm) ws.connectToFarm(streamFarm)
          metrics.recordWsReconnect()
          metrics.recordHealingAction(true, 'reconnect_ws')
        }),
        stopBot: () => safeExecute('heal.stopBot', () => {
          bot.stopBot()
          orch.signalBotStop()
          metrics.recordHealingAction(true, 'stop_bot')
        }),
        goHome: () => safeExecute('heal.goHome', () => {
          if (streamFarm) sendAdb(streamFarm, 'key:HOME')
          metrics.recordHealingAction(true, 'go_home')
        }),
      })
    } else {
      monitor.stopMonitoring()
    }
  }, [streaming, streamFarm])

  // ── دالة تشغيل اللعبة (مع حماية من التكرار + debug logging) ─────────────
  async function launchGame(farmId: string) {
    // Prevent concurrent launches for the same farm
    if (launchingRef.current.has(farmId)) {
      console.log(`[LAUNCH] ⏳ Already in progress for ${farmId}, skipping`)
      return
    }
    launchingRef.current.add(farmId)
    farmLastUsedRef.current[farmId] = Date.now()
    console.log(`[LAUNCH] 🎮 Starting game launch for farm: ${farmId}`)

    // Cancel any pending stream-start timer from a previous launch
    if (launchTimerRef.current) {
      clearTimeout(launchTimerRef.current)
      launchTimerRef.current = null
    }

    showMsg(`🎮 جارٍ تشغيل اللعبة على ${farmId}...`, 8000)
    try {
      const authHeaders = await getAuthHeaders()
      console.log(`[LAUNCH] Calling /api/farms/launch with farm_id=${farmId}`)
      const res = await fetch('/api/farms/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ farm_id: farmId }),
        signal: AbortSignal.timeout(20000),
      })
      const d = await res.json()
      console.log(`[LAUNCH] Response (HTTP ${res.status}):`, JSON.stringify(d))

      // Show server-side debug logs if available
      if (d.logs && Array.isArray(d.logs)) {
        console.log(`[LAUNCH] Server logs:`)
        d.logs.forEach((l: string) => console.log(`  → ${l}`))
      }

      if (d.ok) {
        const method = d.method || 'unknown'
        const pkg = d.package || 'unknown'
        const rd = d.readiness
        const readinessInfo = rd
          ? ` | screen: ${rd.state || 'unknown'}/${rd.reason} (${rd.frames || 1}f, ${rd.byteSize}B, var=${rd.variance}, diff=${rd.frameDiff ?? '-'})`
          : ''
        const deviceInfo = d.device ? ` | device: ${d.device}` : ''
        console.log(`[LAUNCH] ✅ SUCCESS via ${method} (package: ${pkg})${readinessInfo}${deviceInfo}`)
        showMsg(`✅ اللعبة تعمل على ${farmId} (${method}) — سيبدأ البث بعد ثانيتين...`, 4000)
        // Cancellable delayed stream start — only fires if no other stream took over
        launchTimerRef.current = setTimeout(() => {
          launchTimerRef.current = null
          // Only start stream if nothing else is already streaming a different farm
          if (!streamActive.current || streamActive.current.startsWith(farmId)) {
            startStream(farmId)
          }
        }, 2000)
      } else {
        console.error(`[LAUNCH] ❌ FAILED:`, d.error, d.logs)
        showMsg(`❌ فشل تشغيل اللعبة: ${d.error || 'خطأ غير معروف'}`)
      }
    } catch (e: any) {
      console.error(`[LAUNCH] ❌ Network error:`, e?.message)
      showMsg(`❌ خطأ في الاتصال: ${e?.message || 'timeout'}`)
    } finally {
      launchingRef.current.delete(farmId)
    }
  }

  // ── ADB: sequential queue (prevents parallel commands to device) ─────────────
  async function processAdbQueue() {
    if (adbProcessingRef.current) return
    adbProcessingRef.current = true
    while (adbQueueRef.current.length > 0) {
      // Orchestrator permission check — skip commands during recovery
      if (!orch.canSendCommand()) {
        console.log('[ADB] Blocked by orchestrator (mode:', orch.mode, ')')
        break
      }
      const item = adbQueueRef.current.shift()!

      // ── TWO-PHASE COMMIT: Phase 1 — acquire + persist pending ──
      const handle = actionId.acquireAction('adb', item.farmId, item.command)
      if (!handle) {
        console.warn('[ADB] Duplicate action blocked')
        continue
      }
      const { actionId: aid, release } = handle

      // ── Version stamp ──
      const adbVersion = stateVer.nextVersion('adb', 'processAdbQueue')

      const cmdStart = Date.now()
      try {
        const authHeaders = await getAuthHeaders()
        const res = await fetch('/api/farms/adb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ farm_id: item.farmId, command: item.command, action_id: aid, _v: adbVersion }),
          signal: AbortSignal.timeout(8000),
        })
        const d = await res.json()
        const latency = Date.now() - cmdStart

        // ── Ingest server timestamp for clock sync ──
        if (d._server_ts) serverTime.ingestServerTs(d._server_ts)

        // Handle server-side duplicate rejection (409)
        if (d.error === 'duplicate_action') {
          console.warn(`[ADB] Server rejected duplicate: ${aid}`)
          release('executed') // already done server-side
          continue
        }

        if (adbTimerRef.current) clearTimeout(adbTimerRef.current)
        const friendlyCmd = humanizeCmd(item.command)
        if (d.ok) {
          setAdbFeedback(`✅ ${friendlyCmd} (${latency}ms)`)
          setCmdHistory(prev => [{ cmd: friendlyCmd, ok: true, ts: Date.now() }, ...prev].slice(0, 8))
          adbTimerRef.current = setTimeout(() => { setAdbFeedback(''); adbTimerRef.current = null }, 1500)
          monitor.reportCommand(true)
          metrics.recordAdbCommand(true, latency, item.command)
          orch.reportCommand()
          // ── TWO-PHASE COMMIT: Phase 2 — mark executed ──
          release('executed')
        } else {
          setAdbFeedback(`❌ ${friendlyCmd}: ${d.error || 'فشل'}`)
          setCmdHistory(prev => [{ cmd: friendlyCmd, ok: false, ts: Date.now() }, ...prev].slice(0, 8))
          adbTimerRef.current = setTimeout(() => { setAdbFeedback(''); adbTimerRef.current = null }, 2000)
          monitor.reportCommand(false)
          metrics.recordAdbCommand(false, latency, item.command)
          release('failed')
        }
      } catch {
        const latency = Date.now() - cmdStart
        if (adbTimerRef.current) clearTimeout(adbTimerRef.current)
        setAdbFeedback('❌ خطأ في الاتصال')
        adbTimerRef.current = setTimeout(() => { setAdbFeedback(''); adbTimerRef.current = null }, 2000)
        monitor.reportCommand(false)
        metrics.recordAdbCommand(false, latency, item.command)
        // ── TWO-PHASE COMMIT: Phase 2 — mark failed on crash ──
        release('failed')
      }
    }
    adbProcessingRef.current = false
    // ── Durable queue: clear persistence when queue is drained ──
    try { localStorage.removeItem('vrbot_adb_queue') } catch {}
  }

  function sendAdb(farmId: string, command: string) {
    // ── Cooldown dedup: ignore identical commands within 300ms ──
    const now = Date.now()
    if (lastCmdRef.current && lastCmdRef.current.cmd === command && now - lastCmdRef.current.ts < 300) {
      console.log(`[ADB] ⏭️ Dedup: ${command} (${now - lastCmdRef.current.ts}ms ago)`)
      return
    }
    lastCmdRef.current = { cmd: command, ts: now }
    // Queue overflow protection: drop oldest if > 10 pending
    if (adbQueueRef.current.length >= 10) {
      adbQueueRef.current.splice(0, adbQueueRef.current.length - 5)
      setAdbFeedback('⚠️ أوامر كثيرة — تم تقليص الطابور')
    }
    // Clear queue if farm changed (don't send stale commands to wrong farm)
    if (adbQueueRef.current.length > 0 && adbQueueRef.current[0].farmId !== farmId) {
      adbQueueRef.current.length = 0
    }
    adbQueueRef.current.push({ farmId, command })
    // ── Durable queue: persist to localStorage ──
    try {
      const json = JSON.stringify(adbQueueRef.current)
      if (json.length < 20_000) localStorage.setItem('vrbot_adb_queue', json)
    } catch { /* storage full — non-fatal */ }
    processAdbQueue()
  }

  // Wire sendAdbRef so hooks can call sendAdb
  sendAdbRef.current = sendAdb

  async function runTasks(farmId: string, taskList: string[], action?: string) {
    setRunning(p => ({ ...p, [farmId]: true }))
    showMsg(`⏳ جارٍ تشغيل ${taskList.length} مهمة على ${farmId}...`)
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/farms/run-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ farm_id: farmId, tasks: taskList, action }),
        signal: AbortSignal.timeout(15000),
      })
      const d = await res.json()
      if (d.ok) {
        showMsg(`✅ تم تشغيل ${taskList.length} مهمة على ${farmId}`)
        loadFarms()
      } else {
        showMsg(`❌ خطأ: ${d.error || 'فشل التشغيل'}`)
      }
    } catch { showMsg('❌ لا يمكن الاتصال بالسيرفر (timeout)') }
    setRunning(p => ({ ...p, [farmId]: false }))
  }

  async function stopFarm(farmId: string) {
    setRunning(p => ({ ...p, [farmId]: true }))
    showMsg(`⏹ جارٍ إيقاف ${farmId}...`)
    try {
      const authHeaders = await getAuthHeaders()
      await fetch('/api/farms/run-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ farm_id: farmId, action: 'stop' }),
        signal: AbortSignal.timeout(10000),
      })
      showMsg(`⏹ تم إيقاف ${farmId}`)
    } catch {
      showMsg(`❌ فشل إيقاف ${farmId} (timeout)`)
    }
    setRunning(p => ({ ...p, [farmId]: false }))
    loadFarms()
  }

  async function deleteFarm(farmId: string) {
    if (!confirm(`هل تريد حذف مزرعة "${farmId}"؟\nهذا الإجراء لا يمكن التراجع عنه.`)) return
    const authHeaders = await getAuthHeaders()
    showMsg(`🗑️ جارٍ حذف ${farmId}...`)
    try {
      const res = await fetch(`/api/farms/delete?id=${farmId}`, { method: 'DELETE', headers: authHeaders, signal: AbortSignal.timeout(10000) })
      const d = await res.json()
      if (d.ok) {
        showMsg(`✅ تم حذف مزرعة ${farmId}`)
        if (selectedFarm === farmId) setSelected(null)
        loadFarms()
      } else { showMsg(`❌ فشل الحذف: ${d.error || 'خطأ'}`) }
    } catch { showMsg('❌ خطأ في الاتصال') }
  }

  async function handleTransfer() {
    if (!transferFarm || !transferTarget.trim()) { setTransferMsg('⚠️ أدخل اسم اللاعب المستقبل'); return }
    if (transferRes.size === 0) { setTransferMsg('⚠️ اختر نوع مورد واحد على الأقل'); return }
    setTransferring(true); setTransferMsg('')
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/farms/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ farm_id: transferFarm, target_name: transferTarget.trim(), resources: Array.from(transferRes), amount: transferAmount, max_marches: transferMarches, method: transferMethod }),
        signal: AbortSignal.timeout(15000),
      })
      const d = await res.json()
      if (d.ok) { setTransferMsg(`✅ تم إرسال أمر النقل إلى ${transferFarm}`); if (transferTimerRef.current) clearTimeout(transferTimerRef.current); transferTimerRef.current = setTimeout(() => { setShowTransfer(false); setTransferMsg(''); transferTimerRef.current = null }, 3000) }
      else { setTransferMsg(`❌ ${d.error || 'فشل النقل'}`) }
    } catch { setTransferMsg('❌ خطأ في الاتصال') }
    setTransferring(false)
  }

  // ── Human-readable command label ──
  function humanizeCmd(cmd: string): string {
    if (cmd.startsWith('tap:')) { const [x,y] = cmd.slice(4).split(','); return `نقر (${x},${y})` }
    if (cmd.startsWith('swipe:')) return '↔ سحب'
    if (cmd.startsWith('key:')) return `🔘 ${cmd.slice(4)}`
    if (cmd.startsWith('text:')) return `⌨️ "${cmd.slice(5).slice(0,12)}"`
    if (cmd.startsWith('exec:input long_press')) return '👆 ضغط مطوّل'
    if (cmd.startsWith('exec:input tap')) return '👆👆 نقر مزدوج'
    return cmd.slice(0, 20)
  }

  // ── Dynamic resolution: query device screen size on stream start ──
  async function queryDeviceResolution(farmId: string) {
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/farms/adb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ farm_id: farmId, command: 'exec:wm size', action_id: `res_${Date.now()}` }),
        signal: AbortSignal.timeout(5000),
      })
      const d = await res.json()
      if (d.ok) {
        const output = d.output || d.stdout || ''
        const match = output.match(/(\d{3,4})x(\d{3,4})/)
        if (match) {
          deviceResRef.current = { w: parseInt(match[1]), h: parseInt(match[2]) }
          console.log(`[RES] Device resolution: ${match[1]}x${match[2]}`)
        }
      }
    } catch { /* non-fatal — keep default 1280x720 */ }
  }

  // ── Coordinate mapping: img pixel → device pixel ──
  function imgToDevice(e: React.MouseEvent<HTMLImageElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect()
    const { w, h } = deviceResRef.current
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width)  * w),
      y: Math.round(((e.clientY - rect.top)  / rect.height) * h),
    }
  }

  // ── Touch/Mouse gesture handler: tap, double-tap, long-press, swipe ──
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressFiredRef = useRef(false)

  function onImgMouseDown(e: React.MouseEvent<HTMLImageElement>) {
    if (!tapMode) return
    e.preventDefault()
    const { x, y } = imgToDevice(e)
    dragStart.current = { x, y, ts: Date.now() }
    longPressFiredRef.current = false
    // Start long-press timer (500ms hold = long press)
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      if (!dragStart.current || !streamFarm) return
      const now = Date.now()
      const elapsed = now - dragStart.current.ts
      if (elapsed >= 480) {
        longPressFiredRef.current = true
        const { x: lx, y: ly } = dragStart.current
        // Long press = swipe from same point to same point with 800ms duration
        const cmd = `swipe:${lx},${ly},${lx},${ly},800`
        const rect = e.currentTarget.getBoundingClientRect()
        setTapFeedback({ x: e.clientX - rect.left, y: e.clientY - rect.top, type: 'long' })
        if (tapFeedbackTimerRef.current) clearTimeout(tapFeedbackTimerRef.current)
        tapFeedbackTimerRef.current = setTimeout(() => { setTapFeedback(null); tapFeedbackTimerRef.current = null }, 800)
        orch.signalManualInteraction()
        sendAdb(streamFarm, cmd)
      }
    }, 500)
  }

  async function onImgMouseUp(e: React.MouseEvent<HTMLImageElement>) {
    // Clean up long-press timer
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null }
    if (!tapMode || !streamFarm || !dragStart.current) return
    // If long press already fired, skip
    if (longPressFiredRef.current) { dragStart.current = null; return }

    const { x: endX, y: endY } = imgToDevice(e)
    const { x: startX, y: startY, ts: startTs } = dragStart.current
    dragStart.current = null
    const holdMs = Date.now() - startTs
    const dist = Math.hypot(endX - startX, endY - startY)
    const rect = e.currentTarget.getBoundingClientRect()

    // ── Double-tap detection (two taps within 350ms, within 30px) ──
    const now = Date.now()
    if (dist < 15 && lastTapRef.current) {
      const gap = now - lastTapRef.current.ts
      const tapDist = Math.hypot(endX - lastTapRef.current.x, endY - lastTapRef.current.y)
      if (gap < 350 && tapDist < 30) {
        lastTapRef.current = null
        // Double-tap → two sequential taps (safe, no shell injection)
        setTapFeedback({ x: e.clientX - rect.left, y: e.clientY - rect.top, type: 'double' })
        if (tapFeedbackTimerRef.current) clearTimeout(tapFeedbackTimerRef.current)
        tapFeedbackTimerRef.current = setTimeout(() => { setTapFeedback(null); tapFeedbackTimerRef.current = null }, 600)
        orch.signalManualInteraction()
        await sendAdb(streamFarm, `tap:${endX},${endY}`)
        // Small delay between taps for the device to register both
        setTimeout(() => { if (streamFarm) sendAdb(streamFarm, `tap:${endX},${endY}`) }, 80)
        return
      }
    }
    lastTapRef.current = { x: endX, y: endY, ts: now }

    // ── Swipe vs tap ──
    const cmd = dist < 15
      ? `tap:${endX},${endY}`
      : `swipe:${startX},${startY},${endX},${endY},${Math.max(150, Math.min(holdMs, 1000))}`

    setTapFeedback({ x: e.clientX - rect.left, y: e.clientY - rect.top, type: dist < 15 ? 'tap' : 'swipe' })
    if (tapFeedbackTimerRef.current) clearTimeout(tapFeedbackTimerRef.current)
    tapFeedbackTimerRef.current = setTimeout(() => { setTapFeedback(null); tapFeedbackTimerRef.current = null }, 600)
    orch.signalManualInteraction()
    await sendAdb(streamFarm, cmd)
  }

  async function getScreenshot(farmId: string): Promise<Response> {
    // Extract number from any format: "farm_001", "001", "farm001", "1", etc.
    const digits = farmId.match(/(\d+)/)
    const num = digits ? parseInt(digits[1]) : null
    const t = Date.now()
    if (num !== null) {
      try {
        const res = await fetch(`https://cloud.vrbot.me/api/screenshot/${num}?t=${t}`, {
          headers: { 'X-API-Key': 'vrbot_admin_2026' },
          signal: AbortSignal.timeout(4000),
          cache: 'no-store',
        })
        if (res.ok) return res
      } catch {}
    }
    return fetch(`/api/farms/screenshot?farm_id=${farmId}&t=${t}`, {
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })
  }

  function stopStream() {
    streamActive.current = null
    capturingRef.current = false
    setStreaming(false)
    setStreamFarm(null)
    setStreamMode('mjpeg') // reset for next stream attempt
    if (screenshotTimer.current) { clearInterval(screenshotTimer.current); screenshotTimer.current = null }
    if (freezeCheckerRef.current) { clearInterval(freezeCheckerRef.current); freezeCheckerRef.current = null }
    // Cancel any pending launchGame → startStream timer
    if (launchTimerRef.current) { clearTimeout(launchTimerRef.current); launchTimerRef.current = null }
    // Clear ADB queue — commands for a stopped stream are stale
    adbQueueRef.current.length = 0
    setScreenshot(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    // Notify all systems
    monitor.reportStreamActive(false)
    orch.reportStreamActive(false)
    metrics.recordStreamStop()
    ws.disconnect()
  }

  // Compute MJPEG URL — use Next.js proxy to avoid CORS/API-key issues
  function getMjpegUrl(farmId: string): string {
    const t = Date.now() // cache-bust
    return `/api/farms/stream?farm_id=${encodeURIComponent(farmId)}&quality=60&fps=4&t=${t}`
  }

  function startStream(farmId: string) {
    farmLastUsedRef.current[farmId] = Date.now()
    if (screenshotTimer.current) { clearInterval(screenshotTimer.current); screenshotTimer.current = null }
    setScreenshot(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    capturingRef.current = false
    adbQueueRef.current.length = 0
    setCmdHistory([]) // reset command history for new stream
    const token = `${farmId}_${Date.now()}`
    streamActive.current = token
    setStreamFarm(farmId)
    setStreaming(true)
    // Query device resolution in background (non-blocking)
    queryDeviceResolution(farmId).catch(() => {})

    // Try MJPEG mode first (unless it previously failed)
    if (!mjpegFailedRef.current) {
      setStreamMode('mjpeg')
      showMsg('📺 MJPEG بث مباشر...', 3000)
      console.log(`[STREAM] 🎬 MJPEG mode for ${farmId}: ${getMjpegUrl(farmId)}`)
    } else {
      setStreamMode('polling')
      showMsg('📺 جارٍ بدء البث (polling)...', 4000)
    }

    // Notify all systems + version bump
    const streamVersion = stateVer.nextVersion('stream', `startStream:${farmId}`)
    monitor.reportStreamActive(true)
    monitor.resetStreamRestarts()
    orch.reportStreamActive(true)
    orch.setActiveFarm(farmId)
    metrics.recordStreamStart()
    ws.connectToFarm(farmId)

    // ── Stream state ─────────────────────────────────────────────
    let frameCount = 0
    let wsFrameCount = 0
    let dedupSkipped = 0
    let lastFrameHash = 0
    let lastFrameTime = Date.now()
    let lastRenderMs = 0
    let blankCount = 0
    let skipNext = false
    const streamStart = Date.now()

    // ── Adaptive polling tiers ───────────────────────────────────
    const POLL_ACTIVE    = 1000
    const POLL_WS_BACKUP = 3000
    const POLL_HIDDEN    = 5000
    const POLL_SLOW_CPU  = 2000
    const FREEZE_MS      = 5000
    let currentInterval  = POLL_ACTIVE

    // ── Network latency tracker (EMA) ────────────────────────────
    let avgLatency = 0
    let latencySamples = 0
    function trackLatency(ms: number) {
      latencySamples++
      avgLatency = latencySamples === 1 ? ms : avgLatency * 0.7 + ms * 0.3
    }

    // ── Tab visibility ───────────────────────────────────────────
    let tabHidden = document.hidden
    function onVisChange() { tabHidden = document.hidden }
    document.addEventListener('visibilitychange', onVisChange)

    // ── Partial hash for smart dedup ─────────────────────────────
    // Samples first 4KB of blob for a fast djb2 fingerprint.
    // Catches identical frames even when PNG compression varies slightly.
    async function partialHash(blob: Blob): Promise<number> {
      if (blob.size < 128) return blob.size
      const slice = blob.slice(0, Math.min(blob.size, 4096))
      const buf = new Uint8Array(await slice.arrayBuffer())
      let h = 0
      const step = Math.max(1, Math.floor(buf.length / 64))
      for (let i = 0; i < buf.length; i += step) {
        h = ((h << 5) - h + buf[i]) | 0
      }
      return (h ^ blob.size) | 0
    }

    // ── Frame queue: always render latest only ───────────────────
    let pendingFrame: { url: string; source: string; elapsed?: number } | null = null
    let renderRafId = 0

    function scheduleRender() {
      if (renderRafId) return
      renderRafId = requestAnimationFrame(() => {
        renderRafId = 0
        if (!pendingFrame || streamActive.current !== token) return
        const f = pendingFrame
        pendingFrame = null
        const t0 = performance.now()
        setScreenshot(prev => { if (prev) URL.revokeObjectURL(prev); return f.url })
        monitor.reportScreenshot()
        orch.reportFrame()
        metrics.recordFrame()
        showMsg('', 0)
        lastRenderMs = performance.now() - t0
        // Jank protection: if render took >16ms, skip next frame
        if (lastRenderMs > 16) skipNext = true
      })
    }

    // ── Shared frame handler (WS + HTTP) ─────────────────────────
    async function acceptFrame(blob: Blob, source: string, elapsed?: number) {
      // Jank protection: skip this frame if previous render was slow
      if (skipNext) { skipNext = false; return }
      // Smart dedup: partial hash comparison
      const hash = await partialHash(blob)
      if (frameCount > 0 && hash === lastFrameHash) {
        dedupSkipped++
        if (dedupSkipped % 30 === 0) {
          console.log(`[STREAM] 🔁 Dedup: ${dedupSkipped} skipped (hash match)`)
        }
        return
      }
      lastFrameHash = hash
      lastFrameTime = Date.now()
      frameCount++
      blankCount = 0
      dedupSkipped = 0
      if (elapsed != null) trackLatency(elapsed)
      const uptime = (Date.now() - streamStart) / 1000
      const fps = frameCount / uptime
      if (frameCount <= 3 || frameCount % 15 === 0) {
        console.log(
          `[STREAM] ✅ #${frameCount} ${farmId} | ${source} | ${blob.size}B` +
          `${elapsed != null ? ` | ${elapsed}ms` : ''} | ~${fps.toFixed(1)}fps` +
          ` | poll=${currentInterval}ms | lat=${Math.round(avgLatency)}ms | render=${lastRenderMs.toFixed(1)}ms`
        )
      }
      // Queue frame — drop any stale pending frame
      if (pendingFrame) URL.revokeObjectURL(pendingFrame.url)
      pendingFrame = { url: URL.createObjectURL(blob), source, elapsed }
      scheduleRender()
    }

    // ── WS screenshot handler ────────────────────────────────────
    ws.setOnScreenshot((blob: Blob) => {
      if (streamActive.current !== token) return
      if (blob.size <= 5000) return
      const frameVer = stateVer.nextVersion('stream', 'ws_frame')
      if (frameVer < streamVersion) return
      wsFrameCount++
      acceptFrame(blob, `ws#${wsFrameCount}`)
      vision.analyze(blob).catch(() => {})
    })

    // ── Adaptive polling engine ──────────────────────────────────
    function computeTargetInterval(): number {
      if (tabHidden) return POLL_HIDDEN
      const uptime = (Date.now() - streamStart) / 1000
      if (uptime > 10 && frameCount > 0 && (frameCount / uptime) < 0.5) return POLL_SLOW_CPU
      if (ws.isConnected && wsFrameCount > 2) return POLL_WS_BACKUP
      if (avgLatency > 2000) return Math.min(POLL_ACTIVE + 500, 2000)
      return POLL_ACTIVE
    }

    function adjustPolling() {
      const target = computeTargetInterval()
      if (target !== currentInterval) {
        const prev = currentInterval
        currentInterval = target
        if (screenshotTimer.current) clearInterval(screenshotTimer.current)
        screenshotTimer.current = setInterval(capture, currentInterval)
        console.log(`[STREAM] ⏱️ Poll ${prev}→${currentInterval}ms (hidden=${tabHidden}, ws=${ws.isConnected}/${wsFrameCount}, lat=${Math.round(avgLatency)}ms)`)
      }
    }

    // ── Predictive capture on user interaction ───────────────────
    function onUserInteraction() {
      if (streamActive.current !== token) return
      capturingRef.current = false
      setTimeout(capture, 150)
    }
    document.addEventListener('mouseup', onUserInteraction)
    document.addEventListener('keyup', onUserInteraction)

    // ── Freeze detection + adaptive poll checker ─────────────────
    if (freezeCheckerRef.current) clearInterval(freezeCheckerRef.current)
    freezeCheckerRef.current = setInterval(() => {
      if (streamActive.current !== token) {
        if (freezeCheckerRef.current) clearInterval(freezeCheckerRef.current)
        document.removeEventListener('visibilitychange', onVisChange)
        document.removeEventListener('mouseup', onUserInteraction)
        document.removeEventListener('keyup', onUserInteraction)
        if (renderRafId) cancelAnimationFrame(renderRafId)
        if (pendingFrame) { URL.revokeObjectURL(pendingFrame.url); pendingFrame = null }
        return
      }
      const gap = Date.now() - lastFrameTime
      if (gap > FREEZE_MS && frameCount > 0) {
        console.log(`[STREAM] 🥶 Freeze ${gap}ms — soft recover`)
        lastFrameTime = Date.now()
        capturingRef.current = false
        capture()
      }
      adjustPolling()
    }, 2000)

    // ── HTTP polling capture ─────────────────────────────────────
    async function capture() {
      if (streamActive.current !== token) return
      if (capturingRef.current) return
      capturingRef.current = true
      const t0 = Date.now()
      try {
        const res = await getScreenshot(farmId)
        if (streamActive.current !== token) return
        if (res.ok) {
          const blob = await res.blob()
          if (streamActive.current !== token) return
          const elapsed = Date.now() - t0
          if (blob.size > 5000) {
            acceptFrame(blob, res.headers.get('X-Source') || 'http', elapsed)
          } else {
            blankCount++
            if (blankCount <= 3) console.log(`[STREAM] ⚠️ blank ${farmId} | ${blob.size}B | ${elapsed}ms (#${blankCount})`)
            if (blankCount <= 2) {
              capturingRef.current = false
              setTimeout(capture, 500)
              return
            }
          }
        } else {
          console.log(`[STREAM] ❌ ${farmId} | HTTP ${res.status} | ${Date.now() - t0}ms`)
        }
      } catch (e: any) {
        console.log(`[STREAM] ❌ ${farmId} | error: ${e?.message} | ${Date.now() - t0}ms`)
      }
      capturingRef.current = false
    }

    console.log(`[STREAM] 🚀 ${farmId} | active=${POLL_ACTIVE}ms ws=${POLL_WS_BACKUP}ms hidden=${POLL_HIDDEN}ms cpu=${POLL_SLOW_CPU}ms freeze=${FREEZE_MS}ms`)
    capture()
    screenshotTimer.current = setInterval(capture, currentInterval)
  }

  function toggleTask(t: string) {
    setTasks(p => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n })
  }

  const sc = (s: string) => s === 'running' ? '#10b981' : s === 'provisioning' ? '#f59e0b' : '#64748b'
  const activeFarm = farms.find(f => f.id === selectedFarm)

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'sans-serif' }}>
      <style>{`
        @keyframes tapPulse { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes doublePulse { 0% { transform: scale(0.5); opacity: 1; } 30% { transform: scale(1.5); opacity: 0.8; } 60% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes longPress { 0% { transform: scale(0.7); opacity: 0.8; box-shadow: 0 0 0 0 rgba(239,68,68,0.5); } 100% { transform: scale(1.3); opacity: 0; box-shadow: 0 0 0 20px rgba(239,68,68,0); } }
        @keyframes swipeTrail { 0% { opacity: 0.8; } 100% { opacity: 0; } }
        .ctrl-btn:hover { background: #30363d !important; transform: scale(1.05); }
        .ctrl-btn:active { transform: scale(0.95); }
      `}</style>

      {/* Header */}
      <div style={{ padding: '14px 24px', background: '#161b22', borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ color: '#f0a500', fontSize: 18, fontWeight: 700, margin: 0 }}>⚔️ مزارعي — Live</h1>
          <p style={{ color: '#8b949e', fontSize: 12, margin: '2px 0 0', fontFamily: 'monospace' }}>
            <span style={{ color: '#3fb950' }}>● {farms.filter(f => f.status === 'running').length}</span> شغّالة ·{' '}
            <span style={{ color: '#58a6ff' }}>⚡ {farms.reduce((s, f) => s + (f.tasks_today || 0), 0)}</span> مهمة اليوم
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Emergency Kill Switch */}
          <button onClick={emergencyStop} title="Emergency Stop — halt all systems"
            style={{ background: '#f8514918', border: '1px solid #f8514950', color: '#f85149', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>⛔</button>
          {/* Dev Panel Toggle */}
          <button onClick={() => setShowDevPanel(p => !p)} title="System diagnostics"
            style={{ background: showDevPanel ? '#58a6ff18' : '#21262d', border: `1px solid ${showDevPanel ? '#58a6ff50' : '#30363d'}`, color: showDevPanel ? '#58a6ff' : '#8b949e', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>🔧</button>
          <Link href="/dashboard" style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', padding: '6px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 12 }}>← الرئيسية</Link>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => setCols(n)} style={{ background: cols === n ? '#f0a500' : '#21262d', color: cols === n ? '#0d1117' : '#8b949e', border: '1px solid #30363d', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>{n}</button>
          ))}
        </div>
      </div>

      {msg && <div style={{ background: '#58a6ff15', borderBottom: '1px solid #58a6ff30', color: '#58a6ff', padding: '8px 24px', fontSize: 13, fontFamily: 'monospace' }}>{msg}</div>}

      {/* Recovery Banner — shown after page reload if orphaned actions were resolved */}
      {actionId.recoveredActions.length > 0 && (
        <div style={{ background: '#f59e0b15', borderBottom: '1px solid #f59e0b30', color: '#f59e0b', padding: '8px 24px', fontSize: 12, fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🔄 Recovery: {actionId.recoveredActions.length} orphaned action(s) cancelled after page reload</span>
          <button onClick={() => { /* recoveredActions is immutable state, will clear on next mount */ }} style={{ background: 'none', border: '1px solid #f59e0b40', color: '#f59e0b', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>OK</button>
        </div>
      )}

      {/* Error Banner */}
      {systemError && (
        <div style={{ background: '#f8514918', borderBottom: '1px solid #f8514940', color: '#f85149', padding: '8px 24px', fontSize: 12, fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {systemError}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setSystemError(null)} style={{ background: 'none', border: '1px solid #f8514940', color: '#f85149', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>Dismiss</button>
            <button onClick={emergencyStop} style={{ background: '#f8514930', border: '1px solid #f8514950', color: '#fff', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>⛔ Emergency Stop</button>
          </div>
        </div>
      )}

      {/* Dev Diagnostics Panel */}
      {showDevPanel && (
        <div style={{ background: '#0d1117', borderBottom: '1px solid #21262d', padding: '10px 24px', fontSize: 10, fontFamily: 'monospace', color: '#8b949e', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>Mode: <b style={{ color: '#f0a500' }}>{orch.mode}</b></span>
          <span>ADB: <b style={{ color: metrics.aggregated.adbSuccessRate >= 90 ? '#3fb950' : '#f59e0b' }}>{metrics.aggregated.adbSuccessRate}%</b> ({metrics.aggregated.adbTotal})</span>
          <span>P95: <b style={{ color: '#58a6ff' }}>{metrics.aggregated.adbP95LatencyMs}ms</b></span>
          <span>Frames: <b style={{ color: '#3fb950' }}>{metrics.aggregated.streamTotalFrames}</b></span>
          <span>Restarts: <b style={{ color: metrics.aggregated.streamRestarts > 3 ? '#f85149' : '#8b949e' }}>{metrics.aggregated.streamRestarts}</b></span>
          <span>WS: <b>{metrics.aggregated.wsReconnects}</b> reconnects</span>
          <span>Bot: <b style={{ color: '#10b981' }}>{metrics.aggregated.botActionsExecuted}</b> actions ({metrics.aggregated.botEfficiency}%)</span>
          <span>Heals: <b style={{ color: '#f59e0b' }}>{metrics.aggregated.healingActions}</b></span>
          <span>Vision: <b style={{ color: '#8b5cf6' }}>{vision.getLastResult()?.state || '—'}</b></span>
          <span>Session: <b>{Math.round(metrics.aggregated.sessionDurationMs / 60000)}m</b></span>
          <span>Farms: <b>{farmMgr.stats.totalFarms}</b> ({farmMgr.stats.activeFarms} active)</span>
          <span style={{ borderLeft: '1px solid #30363d', paddingLeft: 12 }}>IDs: <b>{actionId.getStats().activeIds}</b> dup:<b style={{ color: actionId.getStats().duplicateRate > 0 ? '#f59e0b' : '#3fb950' }}>{actionId.getStats().duplicateRate}%</b> pend:<b style={{ color: actionId.getStats().pending > 0 ? '#f85149' : '#3fb950' }}>{actionId.getStats().pending}</b> cancel:<b>{actionId.getStats().cancelled || 0}</b></span>
          <span>Ver: <b>{stateVer.getVersion('adb')}</b>adb <b>{stateVer.getVersion('stream')}</b>str <b>{stateVer.getVersion('bot')}</b>bot</span>
          <span>Sync: <b style={{ color: stateSync.syncStatus === 'synced' ? '#3fb950' : stateSync.syncStatus === 'error' ? '#f85149' : '#8b949e' }}>{stateSync.syncStatus}</b> {stateSync.conflictCount > 0 ? `⚠${stateSync.conflictCount}` : ''}</span>
          <span>Stale: <b style={{ color: stateVer.getStats().totalRejects > 0 ? '#f59e0b' : '#3fb950' }}>{stateVer.getStats().totalRejects}</b> rejected</span>
          <span style={{ borderLeft: '1px solid #30363d', paddingLeft: 12 }}>Clock: <b style={{ color: serverTime.synced ? '#3fb950' : '#8b949e' }}>{serverTime.synced ? `${serverTime.offset > 0 ? '+' : ''}${serverTime.offset}ms` : 'unsynced'}</b></span>
          <span>Q: <b style={{ color: adbQueueRef.current.length > 5 ? '#f59e0b' : '#3fb950' }}>{adbQueueRef.current.length}</b></span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 0, height: 'calc(100vh - 90px)' }}>

        {/* Left — Farms Grid */}
        <div style={{ padding: 20, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 40 }}>⚔️</div>
              <p style={{ color: '#8b949e', fontSize: 13 }}>جارٍ تحميل مزارعك...</p>
            </div>
          ) : farms.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 52 }}>🏰</div>
              <h2 style={{ color: '#e6edf3', margin: 0 }}>لا توجد مزارع بعد</h2>
              <Link href="/dashboard" style={{ background: 'linear-gradient(135deg,#f0a500,#e05c2a)', color: '#0d1117', padding: '10px 28px', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>+ إضافة مزرعة</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
              {farms.map(farm => {
                const isSelected = farm.id === selectedFarm
                const isRunning  = running[farm.id]
                return (
                  <div key={farm.id} onClick={() => { setSelected(farm.id); if (streaming && streamFarm !== farm.farm_name) startStream(farm.farm_name) }}
                    style={{ borderRadius: 10, border: `2px solid ${isSelected ? '#f0a500' : '#21262d'}`, background: isSelected ? '#f0a50010' : '#161b22', cursor: 'pointer', transition: 'all 0.2s', padding: 16, boxShadow: isSelected ? '0 0 20px #f0a50025' : 'none' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc(farm.status), display: 'inline-block', boxShadow: `0 0 6px ${sc(farm.status)}` }} />
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{farm.farm_name}</span>
                      </div>
                      <span style={{ fontSize: 11, color: sc(farm.status), fontFamily: 'monospace', background: sc(farm.status) + '15', padding: '2px 8px', borderRadius: 4 }}>{farm.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 4, fontSize: 12, color: '#8b949e' }}>
                      <span>📧 {farm.game_account || '—'}</span>
                      <span>⚡ {farm.tasks_today || 0} مهمة</span>
                    </div>
                    {farm.current_task && <div style={{ fontSize: 11, color: '#f0a500', marginBottom: 4 }}>⚡ {farm.current_task}</div>}
                    {farm.live_status === 'idle' && <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>⏳ جاري التجهيز...</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {(farm.status === 'provisioning' || farm.live_status === 'idle') ? (
                        <button onClick={async e => {
                          e.stopPropagation(); showMsg(`⏳ جارٍ تفعيل ${farm.farm_name}...`)
                          try {
                            const authHeaders = await getAuthHeaders()
                            const res = await fetch('/api/farms/activate', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ farm_name: farm.farm_name }), signal: AbortSignal.timeout(10000) })
                            const d = await res.json()
                            showMsg(d.ok ? `✅ تم تفعيل ${farm.farm_name}` : `❌ ${d.error || 'فشل التفعيل'}`)
                          } catch { showMsg('❌ خطأ في الاتصال') }
                          setTimeout(loadFarms, 3000)
                        }} style={{ flex: 1, background: '#f0a50018', border: '1px solid #f0a50050', color: '#f0a500', padding: '6px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>⚡ تفعيل</button>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); runTasks(farm.id, ['Gather Resources', 'Mail Rewards', 'Tribe Tech'], 'start') }} disabled={isRunning}
                          style={{ flex: 1, background: '#3fb95018', border: '1px solid #3fb95050', color: '#3fb950', padding: '6px', borderRadius: 6, cursor: isRunning ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700 }}
                        >{isRunning ? '⏳...' : '▶ تشغيل'}</button>
                      )}
                      <button onClick={e => { e.stopPropagation(); setTransferFarm(farm.id); setShowTransfer(true); setTransferMsg('') }} style={{ background: '#58a6ff18', border: '1px solid #58a6ff50', color: '#58a6ff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>📦</button>
                      <button onClick={e => { e.stopPropagation(); stopFarm(farm.id) }} disabled={isRunning} style={{ background: '#f8514918', border: '1px solid #f8514950', color: '#f85149', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>■</button>
                      <button onClick={e => { e.stopPropagation(); deleteFarm(farm.id) }} style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', color: '#f85149', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>🗑️</button>
                      <button onClick={e => { e.stopPropagation(); launchGame(farm.farm_name) }}
                        title="تشغيل اللعبة"
                        style={{ background: '#8b5cf618', border: '1px solid #8b5cf650', color: '#8b5cf6', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🎮</button>
                      <button onClick={e => { e.stopPropagation(); streaming && streamFarm === farm.farm_name ? stopStream() : startStream(farm.farm_name) }}
                        style={{ background: streaming && streamFarm === farm.farm_name ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.1)', border: streaming && streamFarm === farm.farm_name ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(59,130,246,0.3)', color: streaming && streamFarm === farm.farm_name ? '#f87171' : '#58a6ff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                      >{streaming && streamFarm === farm.farm_name ? '⏹' : '📺'}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right — Control Panel */}
        <div style={{ background: '#161b22', borderLeft: '1px solid #21262d', padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Farm Info */}
          <div>
            <h3 style={{ color: '#f0a500', margin: '0 0 8px', fontSize: 13 }}>🎮 لوحة التحكم</h3>
            {activeFarm ? (
              <div style={{ background: '#0d1117', borderRadius: 8, padding: 10, border: '1px solid #f0a50030' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{activeFarm.farm_name}</div>
                <div style={{ fontSize: 11, color: '#8b949e' }}>📧 {activeFarm.game_account || '—'}</div>
                <div style={{ fontSize: 11, marginTop: 2 }}><span style={{ color: sc(activeFarm.status) }}>● {activeFarm.status}</span></div>
              </div>
            ) : <p style={{ color: '#8b949e', fontSize: 12 }}>اختر مزرعة من اليسار</p>}
          </div>

          {/* Live Screen */}
          {activeFarm && (
            <div>
              <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden', width: '100%', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 150, maxHeight: 220, border: streaming ? '2px solid rgba(239,68,68,0.5)' : '2px solid #21262d', transition: 'border-color 0.3s' }}>
                {(streaming && streamFarm) || screenshot ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <img
                      src={streaming && streamMode === 'mjpeg' && streamFarm ? getMjpegUrl(streamFarm) : (screenshot || '')}
                      alt="Live Screen"
                      onMouseDown={onImgMouseDown}
                      onMouseUp={onImgMouseUp}
                      draggable={false}
                      onError={() => {
                        // MJPEG failed — fall back to polling mode
                        if (streamMode === 'mjpeg') {
                          console.log('[STREAM] MJPEG failed — switching to polling')
                          mjpegFailedRef.current = true
                          setStreamMode('polling')
                        }
                      }}
                      onLoad={() => {
                        if (streamMode === 'mjpeg') {
                          monitor.reportScreenshot()
                          orch.reportFrame()
                          metrics.recordFrame()
                        }
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: tapMode ? 'crosshair' : 'zoom-in', userSelect: 'none' }}
                    />
                    {tapFeedback && <div style={{ position: 'absolute', left: tapFeedback.x - 15, top: tapFeedback.y - 15, width: 30, height: 30, borderRadius: '50%', border: `2px solid ${tapFeedback.type === 'long' ? '#ef4444' : tapFeedback.type === 'double' ? '#8b5cf6' : '#f59e0b'}`, background: tapFeedback.type === 'long' ? 'rgba(239,68,68,0.2)' : tapFeedback.type === 'double' ? 'rgba(139,92,246,0.2)' : 'rgba(245,158,11,0.2)', pointerEvents: 'none', animation: `${tapFeedback.type === 'long' ? 'longPress 0.8s ease-out' : tapFeedback.type === 'double' ? 'doublePulse 0.6s ease-out' : 'tapPulse 0.6s ease-out'}` }} />}
                    {/* ADB feedback */}
                    {adbFeedback && (
                      <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: adbFeedback.startsWith('✅') ? '#3fb950' : '#f85149', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{adbFeedback}</div>
                    )}
                    {streaming && (
                      <button onClick={e => { e.stopPropagation(); setTapMode(p => !p) }}
                        style={{ position: 'absolute', bottom: 8, right: 8, background: tapMode ? 'rgba(245,158,11,0.9)' : 'rgba(0,0,0,0.7)', border: tapMode ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.2)', color: tapMode ? '#000' : '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >{tapMode ? '🎮 تحكم' : '🎮'}</button>
                    )}
                    <button onClick={e => { e.stopPropagation(); setZoomedScreenshot(streaming && streamMode === 'mjpeg' && streamFarm ? getMjpegUrl(streamFarm) : screenshot) }}
                      style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>🔍</button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#8b949e', padding: 16 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📺</div>
                    <div style={{ fontSize: 11 }}>{streaming ? '⏳ جارٍ التحميل...' : 'اضغط بث للمشاهدة'}</div>
                  </div>
                )}
                {streaming && <div style={{ position: 'absolute', top: 6, right: 6, background: streamMode === 'mjpeg' ? '#3b82f6' : '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{streamMode === 'mjpeg' ? '● MJPEG' : '● LIVE'}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {!streaming ? (
                  <button onClick={() => startStream(activeFarm.farm_name)} style={{ flex: 1, padding: '7px', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>📺 بث مباشر</button>
                ) : (
                  <button onClick={stopStream} style={{ flex: 1, padding: '7px', background: '#21262d', color: '#f85149', border: '1px solid #f8514930', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>⏹ إيقاف البث</button>
                )}
              </div>
            </div>
          )}

          {/* ══ لوحة التحكم بالألعاب ══ */}
          {activeFarm && streaming && (
            <div style={{ background: '#0d1117', borderRadius: 8, padding: 12, border: '1px solid #f0a50030' }}>
              <div style={{ fontSize: 11, color: '#f0a500', marginBottom: 10, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🕹️ تحكم مباشر</span>
                <span style={{ color: '#8b949e', fontSize: 10 }}>{streamFarm}</span>
              </div>

              {/* أزرار النظام */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 5 }}>نظام</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { label: '◀ رجوع',    cmd: 'key:BACK',  color: '#58a6ff' },
                    { label: '⌂ الرئيسية', cmd: 'key:HOME',  color: '#3fb950' },
                    { label: '☰ قائمة',   cmd: 'key:MENU',  color: '#f59e0b' },
                  ].map(btn => (
                    <button key={btn.cmd} className="ctrl-btn"
                      onClick={() => { if (streamFarm) { orch.signalManualInteraction(); sendAdb(streamFarm, btn.cmd) } }}
                      style={{ flex: 1, padding: '7px 4px', background: btn.color + '15', border: `1px solid ${btn.color}40`, color: btn.color, borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700, transition: 'all 0.15s' }}
                    >{btn.label}</button>
                  ))}
                </div>
              </div>

              {/* أزرار اللعبة */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 5 }}>Viking Rise</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
                  {[
                    { label: '🗺️ خريطة',   cmd: 'tap:71,647'   },
                    { label: '🏰 قلعة',    cmd: 'tap:640,360'  },
                    { label: '✉️ بريد',    cmd: 'tap:1210,647' },
                    { label: '🎁 مكافآت', cmd: 'tap:1140,647' },
                    { label: '⚔️ هجوم',   cmd: 'tap:949,467'  },
                    { label: '🛡️ دفاع',   cmd: 'tap:850,467'  },
                    { label: '⚗️ بحث',    cmd: 'tap:640,467'  },
                    { label: '🏗️ بناء',   cmd: 'tap:640,550'  },
                    { label: '👥 تحالف',  cmd: 'tap:71,467'   },
                  ].map(btn => (
                    <button key={btn.cmd} className="ctrl-btn"
                      onClick={() => { if (streamFarm) { orch.signalManualInteraction(); sendAdb(streamFarm, btn.cmd) } }}
                      style={{ padding: '7px 4px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 10, transition: 'all 0.15s' }}
                    >{btn.label}</button>
                  ))}
                </div>
              </div>

              {/* D-Pad للتمرير */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 5 }}>تمرير الشاشة</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, maxWidth: 120, margin: '0 auto' }}>
                  <div />
                  <button className="ctrl-btn" onClick={() => { if (streamFarm) { orch.signalManualInteraction(); sendAdb(streamFarm, 'swipe:640,500,640,200') } }}
                    style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>↑</button>
                  <div />
                  <button className="ctrl-btn" onClick={() => { if (streamFarm) { orch.signalManualInteraction(); sendAdb(streamFarm, 'swipe:800,360,200,360') } }}
                    style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>←</button>
                  <button className="ctrl-btn" onClick={() => { if (streamFarm) { orch.signalManualInteraction(); sendAdb(streamFarm, 'tap:640,360') } }}
                    style={{ padding: '8px', background: '#f0a50018', border: '1px solid #f0a50050', color: '#f0a500', borderRadius: 6, cursor: 'pointer', fontSize: 12, transition: 'all 0.15s' }}>OK</button>
                  <button className="ctrl-btn" onClick={() => { if (streamFarm) { orch.signalManualInteraction(); sendAdb(streamFarm, 'swipe:200,360,800,360') } }}
                    style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>→</button>
                  <div />
                  <button className="ctrl-btn" onClick={() => { if (streamFarm) { orch.signalManualInteraction(); sendAdb(streamFarm, 'swipe:640,200,640,500') } }}
                    style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>↓</button>
                  <div />
                </div>
              </div>

              {/* زر تحكم tap mode */}
              <button onClick={() => setTapMode(p => !p)}
                style={{ width: '100%', padding: '8px', background: tapMode ? 'rgba(245,158,11,0.2)' : '#21262d', border: `1px solid ${tapMode ? '#f59e0b' : '#30363d'}`, color: tapMode ? '#f59e0b' : '#8b949e', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
              >{tapMode ? '🎮 وضع التحكم: شغّال — انقر على الشاشة' : '🎮 تفعيل النقر على الشاشة'}</button>

              {/* Gesture guide */}
              {tapMode && (
                <div style={{ fontSize: 10, color: '#8b949e', padding: '6px 8px', background: '#161b2280', borderRadius: 6, border: '1px solid #21262d', marginTop: 4 }}>
                  <div><span style={{ color: '#f59e0b' }}>● نقر</span> = ضغطة سريعة</div>
                  <div><span style={{ color: '#8b5cf6' }}>● نقر مزدوج</span> = ضغطتان سريعتان</div>
                  <div><span style={{ color: '#ef4444' }}>● ضغط مطوّل</span> = اضغط مع الاستمرار</div>
                  <div><span style={{ color: '#3b82f6' }}>● سحب</span> = اسحب لأي اتجاه</div>
                  <div style={{ marginTop: 4, color: '#58a6ff', fontSize: 9 }}>دقة: {deviceResRef.current.w}×{deviceResRef.current.h}</div>
                </div>
              )}

              {/* Command history */}
              {cmdHistory.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>سجل الأوامر</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 100, overflowY: 'auto' }}>
                    {cmdHistory.map((h, i) => (
                      <div key={`${h.ts}-${i}`} style={{ fontSize: 10, fontFamily: 'monospace', color: h.ok ? '#3fb950' : '#f85149', padding: '2px 6px', background: h.ok ? '#3fb95010' : '#f8514910', borderRadius: 3, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{h.ok ? '✓' : '✗'} {h.cmd}</span>
                        <span style={{ color: '#8b949e', fontSize: 9 }}>{new Date(h.ts).toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ System Status Bar ══ */}
          {activeFarm && streaming && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {/* Health indicator */}
              <div style={{ flex: 1, minWidth: 80, padding: '6px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, textAlign: 'center',
                background: monitor.health === 'healthy' ? '#3fb95015' : monitor.health === 'degraded' ? '#f59e0b15' : '#f8514915',
                border: `1px solid ${monitor.health === 'healthy' ? '#3fb95040' : monitor.health === 'degraded' ? '#f59e0b40' : '#f8514940'}`,
                color: monitor.health === 'healthy' ? '#3fb950' : monitor.health === 'degraded' ? '#f59e0b' : '#f85149',
              }}>
                {monitor.health === 'healthy' ? '🟢' : monitor.health === 'degraded' ? '🟡' : '🔴'} {monitor.health}
              </div>
              {/* WS status */}
              <div style={{ flex: 1, minWidth: 80, padding: '6px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, textAlign: 'center',
                background: ws.isConnected ? '#3fb95015' : '#21262d',
                border: `1px solid ${ws.isConnected ? '#3fb95040' : '#30363d'}`,
                color: ws.isConnected ? '#3fb950' : '#8b949e',
              }}>
                {ws.isConnected ? '⚡ WS' : ws.wsStatus === 'reconnecting' ? '🔄 WS' : ws.isFallback ? '📡 HTTP' : '○ WS'}
                {ws.wsLatency !== null && ws.isConnected ? ` ${ws.wsLatency}ms` : ''}
              </div>
              {/* Bot toggle */}
              <button onClick={() => {
                if (bot.botState === 'idle' && streamFarm) { bot.startBot(streamFarm); orch.signalBotStart(streamFarm) }
                else if (bot.botState === 'running') { bot.pauseBot(); orch.signalBotStop() }
                else if (bot.botState === 'paused') { bot.resumeBot(); orch.signalBotStart(streamFarm!) }
                else { bot.stopBot(); orch.signalBotStop() }
              }} style={{ flex: 1, minWidth: 80, padding: '6px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                background: bot.botState === 'running' ? '#10b98120' : bot.botState === 'paused' ? '#f59e0b20' : '#21262d',
                border: `1px solid ${bot.botState === 'running' ? '#10b98150' : bot.botState === 'paused' ? '#f59e0b50' : '#30363d'}`,
                color: bot.botState === 'running' ? '#10b981' : bot.botState === 'paused' ? '#f59e0b' : '#8b949e',
              }}>
                {bot.botState === 'running' ? `🤖 ${bot.actionsThisMinute}/${bot.maxActionsPerMinute}` :
                 bot.botState === 'paused' ? '⏸ Bot' :
                 bot.botState === 'cooldown' ? '⏳ Bot' : '🤖 Bot'}
              </button>
            </div>
          )}

          {/* ══ Bot Controls (when bot active) ══ */}
          {activeFarm && bot.botState !== 'idle' && (
            <div style={{ background: '#0d1117', borderRadius: 8, padding: 10, border: '1px solid #10b98130' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>🤖 Smart Bot — {bot.botFarm}</span>
                <button onClick={() => bot.stopBot()} style={{ fontSize: 9, padding: '2px 8px', background: '#f8514918', border: '1px solid #f8514930', color: '#f85149', borderRadius: 4, cursor: 'pointer' }}>إيقاف</button>
              </div>
              {/* Bot logs (last 5) */}
              <div style={{ maxHeight: 80, overflowY: 'auto', fontSize: 9, fontFamily: 'monospace', color: '#8b949e', lineHeight: 1.6 }}>
                {bot.botLogs.slice(-5).map((l, i) => (
                  <div key={i} style={{ color: l.level === 'error' ? '#f85149' : l.level === 'warn' ? '#f59e0b' : '#8b949e' }}>
                    {new Date(l.ts).toLocaleTimeString('en', { hour12: false })} {l.msg}
                  </div>
                ))}
                {bot.botLogs.length === 0 && <div>جارٍ التشغيل...</div>}
              </div>
            </div>
          )}

          {/* ══ System Orchestrator + Metrics Panel ══ */}
          {activeFarm && streaming && (
            <div style={{ background: '#0d1117', borderRadius: 8, padding: 10, border: '1px solid #21262d' }}>
              <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 8, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📊 System</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                  background: orch.mode === 'idle' ? '#21262d' : orch.mode === 'manual' ? '#58a6ff18' : orch.mode === 'bot-active' ? '#10b98118' : '#f8514918',
                  border: `1px solid ${orch.mode === 'idle' ? '#30363d' : orch.mode === 'manual' ? '#58a6ff40' : orch.mode === 'bot-active' ? '#10b98140' : '#f8514940'}`,
                  color: orch.mode === 'idle' ? '#8b949e' : orch.mode === 'manual' ? '#58a6ff' : orch.mode === 'bot-active' ? '#10b981' : '#f85149',
                }}>{orch.mode.toUpperCase()}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 9, fontFamily: 'monospace' }}>
                <div style={{ padding: '4px 6px', background: '#161b22', borderRadius: 4, color: '#8b949e' }}>
                  ADB: <span style={{ color: metrics.aggregated.adbSuccessRate >= 90 ? '#3fb950' : metrics.aggregated.adbSuccessRate >= 70 ? '#f59e0b' : '#f85149' }}>{metrics.aggregated.adbSuccessRate}%</span>
                  {' '}({metrics.aggregated.adbTotal})
                </div>
                <div style={{ padding: '4px 6px', background: '#161b22', borderRadius: 4, color: '#8b949e' }}>
                  Latency: <span style={{ color: '#58a6ff' }}>{metrics.aggregated.adbAvgLatencyMs}ms</span>
                  {' '}P95: {metrics.aggregated.adbP95LatencyMs}ms
                </div>
                <div style={{ padding: '4px 6px', background: '#161b22', borderRadius: 4, color: '#8b949e' }}>
                  Frames: <span style={{ color: '#3fb950' }}>{metrics.aggregated.streamTotalFrames}</span>
                  {' '}🔄{metrics.aggregated.streamRestarts}
                </div>
                <div style={{ padding: '4px 6px', background: '#161b22', borderRadius: 4, color: '#8b949e' }}>
                  Bot: <span style={{ color: metrics.aggregated.botEfficiency >= 90 ? '#3fb950' : '#f59e0b' }}>{metrics.aggregated.botEfficiency}%</span>
                  {' '}({metrics.aggregated.botActionsExecuted})
                  {' '}🩹{metrics.aggregated.healingActions}
                </div>
              </div>
            </div>
          )}

          {/* Tasks Selection */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ color: '#e6edf3', margin: 0, fontSize: 12 }}>📋 المهام</h4>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setTasks(new Set(TASKS_MAP.flatMap(g => g.tasks)))} style={{ fontSize: 10, padding: '2px 7px', background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: 4, cursor: 'pointer' }}>الكل</button>
                <button onClick={() => setTasks(new Set())} style={{ fontSize: 10, padding: '2px 7px', background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: 4, cursor: 'pointer' }}>مسح</button>
              </div>
            </div>
            {TASKS_MAP.map(group => (
              <div key={group.group} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: group.color, fontWeight: 700, marginBottom: 4 }}>{group.group}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {group.tasks.map(task => {
                    const on = selectedTasks.has(task)
                    return <button key={task} onClick={() => toggleTask(task)} style={{ padding: '3px 8px', borderRadius: 5, border: `1px solid ${on ? group.color : '#30363d'}`, background: on ? group.color + '20' : '#21262d', color: on ? group.color : '#8b949e', fontSize: 10, cursor: 'pointer', transition: 'all 0.15s' }}>{task}</button>
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Run Button */}
          {activeFarm && (
            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, textAlign: 'center' }}>{selectedTasks.size > 0 ? `${selectedTasks.size} مهمة محددة` : 'لم تُحدَّد مهام'}</div>
              <button onClick={() => { if (selectedTasks.size === 0) { showMsg('⚠️ اختر مهمة'); return }; runTasks(activeFarm.id, Array.from(selectedTasks)) }} disabled={running[activeFarm.id]}
                style={{ width: '100%', padding: '11px', background: selectedTasks.size > 0 ? 'linear-gradient(135deg,#10b981,#059669)' : '#21262d', color: selectedTasks.size > 0 ? '#fff' : '#8b949e', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: selectedTasks.size > 0 ? 'pointer' : 'not-allowed', marginBottom: 6 }}
              >{running[activeFarm.id] ? '⏳ جارٍ التشغيل...' : `▶ تشغيل ${selectedTasks.size} مهمة`}</button>
              <button onClick={() => stopFarm(activeFarm.id)} style={{ width: '100%', padding: '9px', background: '#f8514910', border: '1px solid #f8514930', color: '#f85149', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>■ إيقاف المزرعة</button>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Remote Control Modal */}
      {zoomedScreenshot && (
        <div onClick={() => setZoomedScreenshot(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, cursor: 'default' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '90vw', maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Header bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: 'rgba(22,27,34,0.95)', borderRadius: '10px 10px 0 0', borderBottom: '1px solid #f0a50040' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#f0a500', fontSize: 14, fontWeight: 700 }}>📺 {streamFarm}</span>
                {streaming && <span style={{ background: streamMode === 'mjpeg' ? '#3b82f6' : '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{streamMode === 'mjpeg' ? '● MJPEG' : '● LIVE'}</span>}
                <button onClick={() => setTapMode(p => !p)}
                  style={{ background: tapMode ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)', border: `1px solid ${tapMode ? '#f59e0b' : '#30363d'}`, color: tapMode ? '#f59e0b' : '#8b949e', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                >{tapMode ? '🎮 تحكم: شغّال' : '🎮 تفعيل التحكم'}</button>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {adbFeedback && <span style={{ color: adbFeedback.startsWith('✅') ? '#3fb950' : '#f85149', fontSize: 11, fontWeight: 700, background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 4 }}>{adbFeedback}</span>}
                <button onClick={() => setZoomedScreenshot(null)} style={{ background: 'rgba(248,81,73,0.2)', border: '1px solid #f8514950', color: '#f85149', borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>✕</button>
              </div>
            </div>
            {/* Screen */}
            <div style={{ position: 'relative', background: '#000', borderRadius: '0 0 0 10px', overflow: 'hidden' }}>
              <img
                src={zoomedScreenshot}
                alt="Fullscreen"
                onMouseDown={onImgMouseDown}
                onMouseUp={onImgMouseUp}
                draggable={false}
                style={{ width: '100%', display: 'block', cursor: tapMode ? 'crosshair' : 'default', userSelect: 'none', borderRadius: '0 0 0 10px' }}
              />
              {tapFeedback && <div style={{ position: 'absolute', left: tapFeedback.x - 20, top: tapFeedback.y - 20, width: 40, height: 40, borderRadius: '50%', border: '3px solid #f59e0b', background: 'rgba(245,158,11,0.25)', pointerEvents: 'none', animation: 'tapPulse 0.6s ease-out' }} />}
            </div>
            {/* Quick control bar */}
            {streaming && streamFarm && (
              <div style={{ display: 'flex', gap: 6, padding: '10px 14px', background: 'rgba(13,17,23,0.95)', borderRadius: '0 0 10px 10px', flexWrap: 'wrap' }}>
                {[
                  { label: '◀ رجوع', cmd: 'key:BACK', color: '#58a6ff' },
                  { label: '⌂ رئيسية', cmd: 'key:HOME', color: '#3fb950' },
                  { label: '🗺️ خريطة', cmd: 'tap:71,647', color: '#f59e0b' },
                  { label: '🏰 قلعة', cmd: 'tap:640,360', color: '#e6edf3' },
                  { label: '✉️ بريد', cmd: 'tap:1210,647', color: '#8b5cf6' },
                  { label: '🎁 مكافآت', cmd: 'tap:1140,647', color: '#f59e0b' },
                  { label: '⚔️ هجوم', cmd: 'tap:949,467', color: '#ef4444' },
                  { label: '👥 تحالف', cmd: 'tap:71,467', color: '#3b82f6' },
                ].map(btn => (
                  <button key={btn.cmd} className="ctrl-btn"
                    onClick={() => { if (streamFarm) { orch.signalManualInteraction(); sendAdb(streamFarm, btn.cmd) } }}
                    style={{ flex: '1 1 auto', minWidth: 80, padding: '8px 6px', background: btn.color + '15', border: `1px solid ${btn.color}40`, color: btn.color, borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.15s' }}
                  >{btn.label}</button>
                ))}
                {/* Swipe buttons */}
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                  {[
                    { label: '↑', cmd: 'swipe:640,500,640,200' },
                    { label: '↓', cmd: 'swipe:640,200,640,500' },
                    { label: '←', cmd: 'swipe:800,360,200,360' },
                    { label: '→', cmd: 'swipe:200,360,800,360' },
                  ].map(btn => (
                    <button key={btn.cmd} className="ctrl-btn"
                      onClick={() => { if (streamFarm) { orch.signalManualInteraction(); sendAdb(streamFarm, btn.cmd) } }}
                      style={{ width: 36, height: 36, background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 16, transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >{btn.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Overlay — shows in both MJPEG and polling modes */}
      {streaming && streamFarm && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, width: 280, background: '#161b22', border: '2px solid rgba(239,68,68,0.4)', borderRadius: 10, overflow: 'hidden', zIndex: 9998, boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
          <div style={{ position: 'relative' }}>
            <img src={streamMode === 'mjpeg' ? getMjpegUrl(streamFarm) : (screenshot || '')} alt="Live" onMouseDown={onImgMouseDown} onMouseUp={onImgMouseUp} draggable={false}
              onClick={() => setZoomedScreenshot(streamMode === 'mjpeg' ? getMjpegUrl(streamFarm) : screenshot)}
              style={{ width: '100%', display: 'block', cursor: tapMode ? 'crosshair' : 'zoom-in', userSelect: 'none', minHeight: 120, background: '#000' }} />
            {tapFeedback && <div style={{ position: 'absolute', left: tapFeedback.x - 12, top: tapFeedback.y - 12, width: 24, height: 24, borderRadius: '50%', border: '2px solid #f59e0b', background: 'rgba(245,158,11,0.2)', pointerEvents: 'none', animation: 'tapPulse 0.6s ease-out' }} />}
            {adbFeedback && <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', color: adbFeedback.startsWith('✅') ? '#3fb950' : '#f85149', padding: '3px 10px', borderRadius: 5, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{adbFeedback}</div>}
            <div style={{ position: 'absolute', top: 6, left: 8, background: streamMode === 'mjpeg' ? '#3b82f6' : '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{streamMode === 'mjpeg' ? '● MJPEG' : '● LIVE'} — {streamFarm}</div>
            <div style={{ position: 'absolute', top: 4, right: 6, display: 'flex', gap: 4 }}>
              <button onClick={e => { e.stopPropagation(); setTapMode(p => !p) }} style={{ background: tapMode ? 'rgba(245,158,11,0.9)' : 'rgba(0,0,0,0.7)', border: 'none', color: tapMode ? '#000' : '#fff', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}>🎮</button>
              <button onClick={stopStream} style={{ background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button>
            </div>
            {/* Quick controls in overlay */}
            <div style={{ display: 'flex', gap: 4, padding: '6px 8px', background: '#0d1117' }}>
              {[
                { label: '◀', cmd: 'key:BACK', color: '#58a6ff' },
                { label: '⌂', cmd: 'key:HOME', color: '#3fb950' },
                { label: '🗺️', cmd: 'tap:71,647', color: '#f59e0b' },
                { label: '✉️', cmd: 'tap:1210,647', color: '#8b5cf6' },
                { label: '⚔️', cmd: 'tap:949,467', color: '#ef4444' },
              ].map(btn => (
                <button key={btn.cmd} onClick={e => { e.stopPropagation(); if (streamFarm) { orch.signalManualInteraction(); sendAdb(streamFarm, btn.cmd) } }}
                  style={{ flex: 1, padding: '5px 2px', background: btn.color + '15', border: `1px solid ${btn.color}40`, color: btn.color, borderRadius: 5, cursor: 'pointer', fontSize: 12 }}
                >{btn.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div onClick={() => setShowTransfer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#161b22', border: '1px solid #58a6ff30', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#58a6ff', margin: 0, fontSize: 16, fontWeight: 700 }}>📦 نقل الموارد — {transferFarm}</h3>
              <button onClick={() => setShowTransfer(false)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>🎯 اسم اللاعب المستقبل</label>
              <input value={transferTarget} onChange={e => setTransferTarget(e.target.value)} placeholder="مثال: Ahmed" autoFocus style={{ width: '100%', padding: '10px 14px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>💰 نوع الموارد</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[{ key: 'food', label: '🌾 طعام', color: '#3fb950' }, { key: 'wood', label: '🪵 خشب', color: '#f0a500' }, { key: 'stone', label: '🪨 حجارة', color: '#8b949e' }, { key: 'gold', label: '🪙 ذهب', color: '#ffd700' }].map(r => {
                  const on = transferRes.has(r.key)
                  return <button key={r.key} onClick={() => setTransferRes(p => { const n = new Set(p); n.has(r.key) ? n.delete(r.key) : n.add(r.key); return n })} style={{ padding: '10px', background: on ? r.color + '20' : '#0d1117', border: `2px solid ${on ? r.color : '#30363d'}`, borderRadius: 8, color: on ? r.color : '#8b949e', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>{r.label}</button>
                })}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>📊 الكمية</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ key: 'all', label: '🔴 كل شيء' }, { key: 'half', label: '🟡 النصف' }].map(a => (
                  <button key={a.key} onClick={() => setTransferAmount(a.key as 'all'|'half')} style={{ flex: 1, padding: '10px', background: transferAmount === a.key ? '#58a6ff20' : '#0d1117', border: `2px solid ${transferAmount === a.key ? '#58a6ff' : '#30363d'}`, borderRadius: 8, color: transferAmount === a.key ? '#58a6ff' : '#8b949e', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>{a.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>⚔️ عدد الجيوش: {transferMarches}</label>
              <input type="range" min={1} max={4} value={transferMarches} onChange={e => setTransferMarches(Number(e.target.value))} style={{ width: '100%', accentColor: '#58a6ff' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>🏛️ طريقة النقل</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ key: 'tribe_hall', label: '🏛️ قاعة القبيلة' }, { key: 'world_map', label: '🗺️ الخريطة' }].map(m => (
                  <button key={m.key} onClick={() => setTransferMethod(m.key as 'tribe_hall'|'world_map')} style={{ flex: 1, padding: '8px', background: transferMethod === m.key ? '#8b5cf620' : '#0d1117', border: `2px solid ${transferMethod === m.key ? '#8b5cf6' : '#30363d'}`, borderRadius: 8, color: transferMethod === m.key ? '#8b5cf6' : '#8b949e', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>{m.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f0a50010', border: '1px solid #f0a50030', borderRadius: 8, fontSize: 12, color: '#f0a500' }}>⚠️ ضريبة 32% — إرسال 100k = المستقبل يستلم ~68k</div>
            {transferMsg && <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: transferMsg.startsWith('✅') ? '#3fb95015' : '#f8514915', border: `1px solid ${transferMsg.startsWith('✅') ? '#3fb95040' : '#f8514940'}`, color: transferMsg.startsWith('✅') ? '#3fb950' : '#f85149' }}>{transferMsg}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowTransfer(false)} style={{ flex: 1, padding: '12px', background: '#21262d', border: '1px solid #30363d', borderRadius: 8, color: '#8b949e', cursor: 'pointer', fontSize: 14 }}>إلغاء</button>
              <button onClick={handleTransfer} disabled={transferring || !transferTarget.trim()} style={{ flex: 2, padding: '12px', background: transferring || !transferTarget.trim() ? '#21262d' : 'linear-gradient(135deg, #58a6ff, #1f6feb)', border: 'none', borderRadius: 8, color: transferring || !transferTarget.trim() ? '#8b949e' : '#fff', cursor: transferring || !transferTarget.trim() ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700 }}>
                {transferring ? '⏳ جارٍ الإرسال...' : `📦 نقل → ${transferTarget || '...'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
