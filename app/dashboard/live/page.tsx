'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

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
  container_id?: string | null
  adb_port?: number | null
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
  const liveRef                               = useRef<WebSocket | null>(null)
  const reconnectRef                          = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tapMode, setTapMode]                 = useState(false)
  const [tapFeedback, setTapFeedback]         = useState<{x:number,y:number} | null>(null)
  const dragStart                             = useRef<{x:number,y:number}|null>(null)
  const [zoomedScreenshot, setZoomedScreenshot] = useState<string | null>(null)
  const [adbFeedback, setAdbFeedback]         = useState<string>('')

  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const showMsg = (m: string, ms = 4000) => {
    setMsg(m)
    if (ms > 0) setTimeout(() => setMsg(''), ms)
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
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/farms/list', {
        headers: authHeaders,
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        const d = await res.json()
        const list = (d.farms || []).map((f: any) => ({
          id:            f.farm_name || f.id,
          farm_name:     f.farm_name || f.id,
          status:        f.status || 'offline',
          game_account:  f.game_account || '',
          tasks_today:   f.tasks_today || f.live_tasks_ok || 0,
          live_status:   f.live_status || (f.is_online ? 'online' : f.status === 'running' ? 'idle' : 'offline'),
          current_task:  f.current_task || f.live_task || null,
          container_id:  f.container_id || null,
          adb_port:      f.adb_port || null,
        }))
        setFarms(list)
      }
    } catch (e) {
      console.error('loadFarms error:', e)
    }
    setLoading(false)
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
    }
  }, [])

  // ── FIX: دالة ADB مباشرة عبر /api/farms/adb ─────────────
  async function sendAdb(farmId: string, command: string) {
    const _ws = liveRef.current as WebSocket | null
    if (_ws && _ws.readyState === 1) {
      _ws.send(command)
      setAdbFeedback('⚡ ' + command)
      setTimeout(() => setAdbFeedback(''), 1200)
      return true
    }
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/farms/adb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ farm_id: farmId, command }),
      })
      const d = await res.json()
      if (d.ok) {
        setAdbFeedback(`✅ ${command}`)
        setTimeout(() => setAdbFeedback(''), 1500)
      } else {
        setAdbFeedback(`❌ ${d.error || 'فشل'}`)
        setTimeout(() => setAdbFeedback(''), 2000)
      }
      return d.ok
    } catch {
      setAdbFeedback('❌ خطأ في الاتصال')
      setTimeout(() => setAdbFeedback(''), 2000)
      return false
    }
  }

  async function runTasks(farmId: string, taskList: string[], action?: string) {
    setRunning(p => ({ ...p, [farmId]: true }))
    showMsg(`⏳ جارٍ تشغيل ${taskList.length} مهمة على ${farmId}...`)
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/farms/run-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ farm_id: farmId, tasks: taskList, action }),
      })
      const d = await res.json()
      if (d.ok) {
        showMsg(`✅ تم تشغيل ${taskList.length} مهمة على ${farmId}`)
        loadFarms()
      } else {
        showMsg(`❌ خطأ: ${d.error || 'فشل التشغيل'}`)
      }
    } catch { showMsg('❌ لا يمكن الاتصال بالسيرفر') }
    setRunning(p => ({ ...p, [farmId]: false }))
  }

  async function stopFarm(farmId: string) {
    setRunning(p => ({ ...p, [farmId]: true }))
    showMsg(`⏹ جارٍ إيقاف ${farmId}...`)
    const authHeaders = await getAuthHeaders()
    await fetch('/api/farms/run-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ farm_id: farmId, action: 'stop' }),
    })
    showMsg(`⏹ تم إيقاف ${farmId}`)
    setRunning(p => ({ ...p, [farmId]: false }))
    loadFarms()
  }

  async function deleteFarm(farmId: string) {
    if (!confirm(`هل تريد حذف مزرعة "${farmId}"؟\nهذا الإجراء لا يمكن التراجع عنه.`)) return
    const authHeaders = await getAuthHeaders()
    showMsg(`🗑️ جارٍ حذف ${farmId}...`)
    try {
      const res = await fetch(`/api/farms/delete?id=${farmId}`, { method: 'DELETE', headers: authHeaders })
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
      })
      const d = await res.json()
      if (d.ok) { setTransferMsg(`✅ تم إرسال أمر النقل إلى ${transferFarm}`); setTimeout(() => { setShowTransfer(false); setTransferMsg('') }, 3000) }
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
    setTimeout(() => setTapFeedback(null), 600)
    const dist = Math.hypot(endX - startX, endY - startY)
    const cmd = dist < 15
      ? `tap:${endX},${endY}`
      : `swipe:${startX},${startY},${endX},${endY}`
    await sendAdb(streamFarm, cmd)
  }

  function getFarmNum(farmId: string): number | null {
    const farm = farms.find(f => f.farm_name === farmId || f.id === farmId)
    if (farm?.container_id) {
      const m = farm.container_id.match(/\d+/)
      if (m) return parseInt(m[0])
    }
    if (farm?.adb_port) return farm.adb_port - 5554
    const direct = farmId.match(/\d+/)
    if (direct) return parseInt(direct[0])
    return null
  }

  async function getScreenshot(farmId: string): Promise<Response> {
    const num = getFarmNum(farmId)
    const params = new URLSearchParams({ farm_id: farmId, t: String(Date.now()) })
    if (num !== null) params.set('num', String(num))
    return fetch(`/api/farms/screenshot?${params}`, {
      signal: AbortSignal.timeout(10000),
    })
  }

  function stopStream() {
    streamActive.current = null
    setStreaming(false)
    setStreamFarm(null)
    if (screenshotTimer.current) { clearInterval(screenshotTimer.current); screenshotTimer.current = null }
    setScreenshot(prev => { if (prev) URL.revokeObjectURL(prev); return null })
  }

  async function launchGameIfNeeded(farmId: string) {
    try {
      const authHeaders = await getAuthHeaders()
      await fetch('/api/farms/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ farm_id: farmId }),
        signal: AbortSignal.timeout(10000),
      })
    } catch {}
  }

  function connectLive(farmId) {
    disconnectLive()
    const num = getFarmNum(farmId)
    const wsId = num !== null ? String(num).padStart(3,"0") : farmId.replace(/[^0-9]/g,"").padStart(3,"0")
    const ws = new WebSocket("wss://cloud.vrbot.me/ws/live/" + wsId)
    ws.binaryType = "arraybuffer"
    liveRef.current = ws
    ws.onmessage = (event) => {
      if (!(event.data instanceof ArrayBuffer)) return
      const bytes = new Uint8Array(event.data)
      const isVRBT = bytes[0]===0x56&&bytes[1]===0x52&&bytes[2]===0x42&&bytes[3]===0x54
      const jpeg = event.data.slice(isVRBT ? 8 : 0)
      if (jpeg.byteLength < 800) return
      const url = URL.createObjectURL(new Blob([jpeg],{type:"image/jpeg"}))
      setScreenshot(prev => { if (prev) URL.revokeObjectURL(prev); return url })
    }
    ws.onclose = () => { if (liveRef.current===ws) reconnectRef.current=setTimeout(()=>connectLive(farmId),2000) }
  }
  function disconnectLive() {
    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current=null }
    if (liveRef.current) { liveRef.current.onclose=null; liveRef.current.close(); liveRef.current=null }
  }
  function sendLiveCommand(cmd) {
    if (liveRef.current && liveRef.current.readyState===1) liveRef.current.send(cmd)
  }

  function startStream(farmId: string) {
    if (screenshotTimer.current) { clearInterval(screenshotTimer.current); screenshotTimer.current = null }
    setScreenshot(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    const token = `${farmId}_${Date.now()}`
    streamActive.current = token
    setStreamFarm(farmId)
    setStreaming(true)
    showMsg('📺 جارٍ بدء البث...', 4000)
    async function capture() {
      if (streamActive.current !== token) return
      try {
        const res = await getScreenshot(farmId)
        if (streamActive.current !== token) return
        if (res.ok) {
          const blob = await res.blob()
          if (streamActive.current !== token) return
          if (blob.size > 5000) {
            const url = URL.createObjectURL(blob)
            setScreenshot(prev => { if (prev) URL.revokeObjectURL(prev); return url })
            showMsg('', 0)
          }
        }
      } catch {}
    }
    capture()
    // DISABLED: polling replaced by connectLive
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
              <Link href="/dashboard/farms" style={{ background: 'linear-gradient(135deg,#f0a500,#e05c2a)', color: '#0d1117', padding: '10px 28px', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>+ إدارة المزارع</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
              {farms.map(farm => {
                const isSelected = farm.id === selectedFarm
                const isRunning  = running[farm.id]
                return (
                  <div key={farm.id} onClick={() => { setSelected(farm.id); if (streaming && streamFarm !== farm.farm_name) { connectLive(farm.farm_name); setStreamFarm(farm.farm_name) } }}
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
                            const res = await fetch('/api/farms/activate', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ farm_name: farm.farm_name }) })
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
                      <button onClick={async e => { e.stopPropagation(); if (streaming && streamFarm === farm.farm_name) { stopStream() } else { await launchGameIfNeeded(farm.farm_name); connectLive(farm.farm_name); setStreamFarm(farm.farm_name); setStreaming(true) } }}
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
                  <button onClick={async () => { await launchGameIfNeeded(activeFarm.farm_name); connectLive(activeFarm.farm_name); setStreamFarm(activeFarm.farm_name); setStreaming(true) }} style={{ flex: 1, padding: '7px', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>📺 بث مباشر</button>
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
                    { label: '🗺️ خريطة',   cmd: 'tap:47,643'    },
                    { label: '🏰 قلعة',    cmd: 'tap:640,360'   },
                    { label: '✉️ بريد',    cmd: 'tap:1245,580'  },
                    { label: '🎁 مكافآت', cmd: 'tap:1140,580'  },
                    { label: '⚔️ هجوم',   cmd: 'tap:950,462'   },
                    { label: '🔍 بحث',    cmd: 'tap:155,525'   },
                    { label: '🏗️ بناء',   cmd: 'tap:640,550'   },
                    { label: '👥 تحالف',  cmd: 'tap:1100,685'  },
                    { label: '◀ رجوع',    cmd: 'key:BACK'      },
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
                { label: '🗺️', cmd: 'tap:47,643', color: '#f59e0b' },
                { label: '✉️', cmd: 'tap:1245,580', color: '#8b5cf6' },
                { label: '⚔️', cmd: 'tap:950,462', color: '#ef4444' },
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
