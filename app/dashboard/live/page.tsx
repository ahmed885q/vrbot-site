'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useBotEngine } from './useBotEngine'
import { useRealtimeSocket } from './useRealtimeSocket'
import { useHealthMonitor } from './useHealthMonitor'

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
  const screenshotTimer                       = useRef<NodeJS.Timeout | null>(null)
  const streamActive                          = useRef<string | null>(null)
  const [tapMode, setTapMode]                 = useState(false)
  const [tapFeedback, setTapFeedback]         = useState<{x:number,y:number} | null>(null)
  const dragStart                             = useRef<{x:number,y:number}|null>(null)
  const [zoomedScreenshot, setZoomedScreenshot] = useState<string | null>(null)
  const [adbFeedback, setAdbFeedback]         = useState<string>('')
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
  const tapFeedbackTimerRef                    = useRef<NodeJS.Timeout | null>(null)
  const transferTimerRef                       = useRef<NodeJS.Timeout | null>(null)

  // ── Stable ref for sendAdb (used by hooks before function is defined) ──
  const sendAdbRef = useRef<(farmId: string, command: string) => void>(() => {})

  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  // ── Initialize 3 systems ──────────────────────────────────
  const bot = useBotEngine((farmId, cmd) => sendAdbRef.current(farmId, cmd))
  const ws = useRealtimeSocket()
  const monitor = useHealthMonitor()

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
      if (launchTimerRef.current) clearTimeout(launchTimerRef.current)
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current)
      if (adbTimerRef.current) clearTimeout(adbTimerRef.current)
      if (tapFeedbackTimerRef.current) clearTimeout(tapFeedbackTimerRef.current)
      if (transferTimerRef.current) clearTimeout(transferTimerRef.current)
      adbQueueRef.current.length = 0
      // Cleanup 3 systems
      bot.cleanup()
      ws.cleanup()
      monitor.cleanup()
    }
  }, [])

  // ── Start health monitor when streaming ──────────────────
  useEffect(() => {
    if (streaming && streamFarm) {
      monitor.startMonitoring(streamFarm, {
        restartStream: () => { if (streamFarm) startStream(streamFarm) },
        clearAdbQueue: () => { adbQueueRef.current.length = 0 },
        reconnectWs: () => { if (streamFarm) ws.connectToFarm(streamFarm) },
        stopBot: () => bot.stopBot(),
        goHome: () => { if (streamFarm) sendAdb(streamFarm, 'key:HOME') },
      })
    } else {
      monitor.stopMonitoring()
    }
  }, [streaming, streamFarm])

  // ── دالة تشغيل اللعبة (مع حماية من التكرار) ─────────────
  async function launchGame(farmId: string) {
    // Prevent concurrent launches for the same farm
    if (launchingRef.current.has(farmId)) {
      console.log(`⏳ launchGame already in progress for ${farmId}, skipping`)
      return
    }
    launchingRef.current.add(farmId)

    // Cancel any pending stream-start timer from a previous launch
    if (launchTimerRef.current) {
      clearTimeout(launchTimerRef.current)
      launchTimerRef.current = null
    }

    showMsg(`🎮 جارٍ تشغيل اللعبة على ${farmId}...`, 8000)
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/farms/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ farm_id: farmId }),
        signal: AbortSignal.timeout(15000),
      })
      const d = await res.json()
      if (d.ok) {
        showMsg(`✅ اللعبة تعمل على ${farmId} — سيبدأ البث بعد 5 ثوانٍ...`, 6000)
        // Cancellable delayed stream start — only fires if no other stream took over
        launchTimerRef.current = setTimeout(() => {
          launchTimerRef.current = null
          // Only start stream if nothing else is already streaming a different farm
          if (!streamActive.current || streamActive.current.startsWith(farmId)) {
            startStream(farmId)
          }
        }, 5000)
      } else {
        showMsg(`❌ فشل تشغيل اللعبة: ${d.error || 'خطأ غير معروف'}`)
      }
    } catch (e: any) {
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
      const item = adbQueueRef.current.shift()!
      try {
        const authHeaders = await getAuthHeaders()
        const res = await fetch('/api/farms/adb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ farm_id: item.farmId, command: item.command }),
          signal: AbortSignal.timeout(8000),
        })
        const d = await res.json()
        if (adbTimerRef.current) clearTimeout(adbTimerRef.current)
        if (d.ok) {
          setAdbFeedback(`✅ ${item.command}`)
          adbTimerRef.current = setTimeout(() => { setAdbFeedback(''); adbTimerRef.current = null }, 1500)
          monitor.reportCommand(true)
        } else {
          setAdbFeedback(`❌ ${d.error || 'فشل'}`)
          adbTimerRef.current = setTimeout(() => { setAdbFeedback(''); adbTimerRef.current = null }, 2000)
          monitor.reportCommand(false)
        }
      } catch {
        if (adbTimerRef.current) clearTimeout(adbTimerRef.current)
        setAdbFeedback('❌ خطأ في الاتصال')
        adbTimerRef.current = setTimeout(() => { setAdbFeedback(''); adbTimerRef.current = null }, 2000)
        monitor.reportCommand(false)
      }
    }
    adbProcessingRef.current = false
  }

  function sendAdb(farmId: string, command: string) {
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

  function onImgMouseDown(e: React.MouseEvent<HTMLImageElement>) {
    if (!tapMode) return
    const rect = e.currentTarget.getBoundingClientRect()
    dragStart.current = {
      x: Math.round(((e.clientX - rect.left) / rect.width)  * 1280),
      y: Math.round(((e.clientY - rect.top)  / rect.height) * 720),
    }
  }

  // FIX: يرسل لـ /api/farms/adb بدل /api/farms/command
  async function onImgMouseUp(e: React.MouseEvent<HTMLImageElement>) {
    if (!tapMode || !streamFarm || !dragStart.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const endX = Math.round(((e.clientX - rect.left) / rect.width)  * 1280)
    const endY = Math.round(((e.clientY - rect.top)  / rect.height) * 720)
    const { x: startX, y: startY } = dragStart.current
    dragStart.current = null
    setTapFeedback({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    if (tapFeedbackTimerRef.current) clearTimeout(tapFeedbackTimerRef.current)
    tapFeedbackTimerRef.current = setTimeout(() => { setTapFeedback(null); tapFeedbackTimerRef.current = null }, 600)
    const dist = Math.hypot(endX - startX, endY - startY)
    const cmd = dist < 15
      ? `tap:${endX},${endY}`
      : `swipe:${startX},${startY},${endX},${endY}`
    await sendAdb(streamFarm, cmd)
  }

  async function getScreenshot(farmId: string): Promise<Response> {
    const numMatch = farmId.match(/farm_(\d+)/)
    const num = numMatch ? parseInt(numMatch[1]) : null
    const t = Date.now()
    if (num !== null) {
      try {
        const res = await fetch(`https://cloud.vrbot.me/api/screenshot/${num}?t=${t}`, {
          headers: { 'X-API-Key': 'vrbot_admin_2026' },
          signal: AbortSignal.timeout(4000),
        })
        if (res.ok) return res
      } catch {}
    }
    return fetch(`/api/farms/screenshot?farm_id=${farmId}&t=${t}`, {
      signal: AbortSignal.timeout(6000),
    })
  }

  function stopStream() {
    streamActive.current = null
    capturingRef.current = false
    setStreaming(false)
    setStreamFarm(null)
    if (screenshotTimer.current) { clearInterval(screenshotTimer.current); screenshotTimer.current = null }
    // Cancel any pending launchGame → startStream timer
    if (launchTimerRef.current) { clearTimeout(launchTimerRef.current); launchTimerRef.current = null }
    // Clear ADB queue — commands for a stopped stream are stale
    adbQueueRef.current.length = 0
    setScreenshot(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    // Notify systems
    monitor.reportStreamActive(false)
    ws.disconnect()
  }

  function startStream(farmId: string) {
    if (screenshotTimer.current) { clearInterval(screenshotTimer.current); screenshotTimer.current = null }
    setScreenshot(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    capturingRef.current = false
    // Clear ADB queue when switching streams
    adbQueueRef.current.length = 0
    const token = `${farmId}_${Date.now()}`
    streamActive.current = token
    setStreamFarm(farmId)
    setStreaming(true)
    showMsg('📺 جارٍ بدء البث...', 4000)

    // Notify systems
    monitor.reportStreamActive(true)
    monitor.resetStreamRestarts()
    ws.connectToFarm(farmId)

    // WS screenshot handler — if WS pushes frames, use them
    ws.setOnScreenshot((blob: Blob) => {
      if (streamActive.current !== token) return
      if (blob.size > 5000) {
        const url = URL.createObjectURL(blob)
        setScreenshot(prev => { if (prev) URL.revokeObjectURL(prev); return url })
        monitor.reportScreenshot()
        showMsg('', 0)
      }
    })

    async function capture() {
      if (streamActive.current !== token) return
      // Skip HTTP polling if WS is delivering frames
      if (ws.isConnected && !ws.isFallback) return
      // Prevent overlapping captures when network is slow
      if (capturingRef.current) return
      capturingRef.current = true
      try {
        const res = await getScreenshot(farmId)
        if (streamActive.current !== token) return
        if (res.ok) {
          const blob = await res.blob()
          if (streamActive.current !== token) return
          if (blob.size > 5000) {
            const url = URL.createObjectURL(blob)
            setScreenshot(prev => { if (prev) URL.revokeObjectURL(prev); return url })
            monitor.reportScreenshot()
            showMsg('', 0)
          }
        }
      } catch {}
      capturingRef.current = false
    }
    capture()
    screenshotTimer.current = setInterval(capture, 2000)
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
          <Link href="/dashboard" style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', padding: '6px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 12 }}>← الرئيسية</Link>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => setCols(n)} style={{ background: cols === n ? '#f0a500' : '#21262d', color: cols === n ? '#0d1117' : '#8b949e', border: '1px solid #30363d', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>{n}</button>
          ))}
        </div>
      </div>

      {msg && <div style={{ background: '#58a6ff15', borderBottom: '1px solid #58a6ff30', color: '#58a6ff', padding: '8px 24px', fontSize: 13, fontFamily: 'monospace' }}>{msg}</div>}

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
                {screenshot ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <img src={screenshot} alt="Live Screen" onMouseDown={onImgMouseDown} onMouseUp={onImgMouseUp} draggable={false}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: tapMode ? 'crosshair' : 'zoom-in', userSelect: 'none' }}
                    />
                    {tapFeedback && <div style={{ position: 'absolute', left: tapFeedback.x - 15, top: tapFeedback.y - 15, width: 30, height: 30, borderRadius: '50%', border: '2px solid #f59e0b', background: 'rgba(245,158,11,0.2)', pointerEvents: 'none', animation: 'tapPulse 0.6s ease-out' }} />}
                    {/* ADB feedback */}
                    {adbFeedback && (
                      <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: adbFeedback.startsWith('✅') ? '#3fb950' : '#f85149', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{adbFeedback}</div>
                    )}
                    {streaming && (
                      <button onClick={e => { e.stopPropagation(); setTapMode(p => !p) }}
                        style={{ position: 'absolute', bottom: 8, right: 8, background: tapMode ? 'rgba(245,158,11,0.9)' : 'rgba(0,0,0,0.7)', border: tapMode ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.2)', color: tapMode ? '#000' : '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >{tapMode ? '🎮 تحكم' : '🎮'}</button>
                    )}
                    <button onClick={e => { e.stopPropagation(); setZoomedScreenshot(screenshot) }}
                      style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>🔍</button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#8b949e', padding: 16 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📺</div>
                    <div style={{ fontSize: 11 }}>{streaming ? '⏳ جارٍ التحميل...' : 'اضغط بث للمشاهدة'}</div>
                  </div>
                )}
                {streaming && <div style={{ position: 'absolute', top: 6, right: 6, background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>● LIVE</div>}
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
                      onClick={() => streamFarm && sendAdb(streamFarm, btn.cmd)}
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
                      onClick={() => streamFarm && sendAdb(streamFarm, btn.cmd)}
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
                  <button className="ctrl-btn" onClick={() => streamFarm && sendAdb(streamFarm, 'swipe:640,500,640,200')}
                    style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>↑</button>
                  <div />
                  <button className="ctrl-btn" onClick={() => streamFarm && sendAdb(streamFarm, 'swipe:800,360,200,360')}
                    style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>←</button>
                  <button className="ctrl-btn" onClick={() => streamFarm && sendAdb(streamFarm, 'tap:640,360')}
                    style={{ padding: '8px', background: '#f0a50018', border: '1px solid #f0a50050', color: '#f0a500', borderRadius: 6, cursor: 'pointer', fontSize: 12, transition: 'all 0.15s' }}>OK</button>
                  <button className="ctrl-btn" onClick={() => streamFarm && sendAdb(streamFarm, 'swipe:200,360,800,360')}
                    style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>→</button>
                  <div />
                  <button className="ctrl-btn" onClick={() => streamFarm && sendAdb(streamFarm, 'swipe:640,200,640,500')}
                    style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>↓</button>
                  <div />
                </div>
              </div>

              {/* زر تحكم tap mode */}
              <button onClick={() => setTapMode(p => !p)}
                style={{ width: '100%', padding: '8px', background: tapMode ? 'rgba(245,158,11,0.2)' : '#21262d', border: `1px solid ${tapMode ? '#f59e0b' : '#30363d'}`, color: tapMode ? '#f59e0b' : '#8b949e', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
              >{tapMode ? '🎮 وضع التحكم: شغّال — انقر على الشاشة' : '🎮 تفعيل النقر على الشاشة'}</button>
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
                if (bot.botState === 'idle' && streamFarm) { bot.startBot(streamFarm) }
                else if (bot.botState === 'running') { bot.pauseBot() }
                else if (bot.botState === 'paused') { bot.resumeBot() }
                else { bot.stopBot() }
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

      {/* Zoom Modal */}
      {zoomedScreenshot && (
        <div onClick={() => setZoomedScreenshot(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, cursor: 'zoom-out' }}>
          <div style={{ position: 'relative', maxWidth: '95vw', maxHeight: '95vh' }}>
            <img src={zoomedScreenshot} alt="Zoomed" onClick={e => e.stopPropagation()} style={{ maxWidth: '95vw', maxHeight: '92vh', borderRadius: 8, display: 'block', boxShadow: '0 0 60px rgba(0,0,0,0.8)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px 8px 0 0' }}>
              <span style={{ color: '#f0a500', fontSize: 13, fontWeight: 700 }}>📺 {streamFarm}</span>
              <button onClick={() => setZoomedScreenshot(null)} style={{ background: 'rgba(248,81,73,0.2)', border: '1px solid #f8514950', color: '#f85149', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Live Overlay */}
      {streaming && screenshot && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, width: 280, background: '#161b22', border: '2px solid rgba(239,68,68,0.4)', borderRadius: 10, overflow: 'hidden', zIndex: 9998, boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
          <div style={{ position: 'relative' }}>
            <img src={screenshot} alt="Live" onMouseDown={onImgMouseDown} onMouseUp={onImgMouseUp} draggable={false} onClick={() => setZoomedScreenshot(screenshot)}
              style={{ width: '100%', display: 'block', cursor: tapMode ? 'crosshair' : 'zoom-in', userSelect: 'none' }} />
            {tapFeedback && <div style={{ position: 'absolute', left: tapFeedback.x - 12, top: tapFeedback.y - 12, width: 24, height: 24, borderRadius: '50%', border: '2px solid #f59e0b', background: 'rgba(245,158,11,0.2)', pointerEvents: 'none', animation: 'tapPulse 0.6s ease-out' }} />}
            {adbFeedback && <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', color: adbFeedback.startsWith('✅') ? '#3fb950' : '#f85149', padding: '3px 10px', borderRadius: 5, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{adbFeedback}</div>}
            <div style={{ position: 'absolute', top: 6, left: 8, background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>● LIVE — {streamFarm}</div>
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
                <button key={btn.cmd} onClick={e => { e.stopPropagation(); streamFarm && sendAdb(streamFarm, btn.cmd) }}
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
