'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const TASKS_MAP = [
  { group: 'Ø§Ù„Ù…ÙˆØ§Ø±Ø¯ ðŸŒ¾',  color: '#10b981', tasks: ['Gather Resources', 'Collect Farms', 'Open Chests', 'Collect Free Items'] },
  { group: 'Ø§Ù„Ù‚ØªØ§Ù„ âš”ï¸',  color: '#ef4444', tasks: ['Kill Monster', 'Hunt Niflung', 'Rally Niflung'] },
  { group: 'Ø§Ù„ØªØ­Ø§Ù„Ù ðŸ°', color: '#8b5cf6', tasks: ['Tribe Tech', 'Tribe Gifts', 'Alliance Help', 'Send Gifts'] },
  { group: 'Ø§Ù„ÙŠÙˆÙ…ÙŠØ© ðŸ“‹',  color: '#f59e0b', tasks: ['Mail Rewards', 'Hall of Valor', 'Prosperity', 'Quest Rewards'] },
  { group: 'Ø§Ù„ØªØ·ÙˆÙŠØ± ðŸ”¨',  color: '#3b82f6', tasks: ['Building Upgrade', 'Train Troops', 'Research Tech', 'Heal Wounded'] },
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
  // Auto-sync: إذا لم تكن هناك مزارع → sync تلقائي
  useEffect(() => {
    async function autoSync() {
      try {
        const authHeaders = await getAuthHeaders()
        const r = await fetch('/api/farms/list', { headers: authHeaders })
        const d = await r.json()
        if ((d.farms?.length || 0) === 0) {
          await fetch('/api/farms/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders } })
          loadFarms()
        }
      } catch {}
    }
    autoSync()
  }, [])
  }, [loadFarms])

  useEffect(() => {
    return () => {
      streamActive.current = null
      if (screenshotTimer.current) clearInterval(screenshotTimer.current)
    }
  }, [])

  // â”€â”€ FIX: Ø¯Ø§Ù„Ø© ADB Ù…Ø¨Ø§Ø´Ø±Ø© Ø¹Ø¨Ø± /api/farms/adb â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function sendAdb(farmId: string, command: string) {
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/farms/adb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ farm_id: farmId, command }),
      })
      const d = await res.json()
      if (d.ok) {
        setAdbFeedback(`âœ… ${command}`)
        setTimeout(() => setAdbFeedback(''), 1500)
      } else {
        setAdbFeedback(`âŒ ${d.error || 'ÙØ´Ù„'}`)
        setTimeout(() => setAdbFeedback(''), 2000)
      }
      return d.ok
    } catch {
      setAdbFeedback('âŒ Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„')
      setTimeout(() => setAdbFeedback(''), 2000)
      return false
    }
  }

  async function runTasks(farmId: string, taskList: string[], action?: string) {
    setRunning(p => ({ ...p, [farmId]: true }))
    showMsg(`â³ Ø¬Ø§Ø±Ù ØªØ´ØºÙŠÙ„ ${taskList.length} Ù…Ù‡Ù…Ø© Ø¹Ù„Ù‰ ${farmId}...`)
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/farms/run-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ farm_id: farmId, tasks: taskList, action }),
      })
      const d = await res.json()
      if (d.ok) {
        showMsg(`âœ… ØªÙ… ØªØ´ØºÙŠÙ„ ${taskList.length} Ù…Ù‡Ù…Ø© Ø¹Ù„Ù‰ ${farmId}`)
        loadFarms()
      } else {
        showMsg(`âŒ Ø®Ø·Ø£: ${d.error || 'ÙØ´Ù„ Ø§Ù„ØªØ´ØºÙŠÙ„'}`)
      }
    } catch { showMsg('âŒ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø³ÙŠØ±ÙØ±') }
    setRunning(p => ({ ...p, [farmId]: false }))
  }

  async function stopFarm(farmId: string) {
    setRunning(p => ({ ...p, [farmId]: true }))
    showMsg(`â¹ Ø¬Ø§Ø±Ù Ø¥ÙŠÙ‚Ø§Ù ${farmId}...`)
    const authHeaders = await getAuthHeaders()
    await fetch('/api/farms/run-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ farm_id: farmId, action: 'stop' }),
    })
    showMsg(`â¹ ØªÙ… Ø¥ÙŠÙ‚Ø§Ù ${farmId}`)
    setRunning(p => ({ ...p, [farmId]: false }))
    loadFarms()
  }

  async function deleteFarm(farmId: string) {
    if (!confirm(`Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ù…Ø²Ø±Ø¹Ø© "${farmId}"ØŸ\nÙ‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ØªØ±Ø§Ø¬Ø¹ Ø¹Ù†Ù‡.`)) return
    const authHeaders = await getAuthHeaders()
    showMsg(`ðŸ—‘ï¸ Ø¬Ø§Ø±Ù Ø­Ø°Ù ${farmId}...`)
    try {
      const res = await fetch(`/api/farms/delete?id=${farmId}`, { method: 'DELETE', headers: authHeaders })
      const d = await res.json()
      if (d.ok) {
        showMsg(`âœ… ØªÙ… Ø­Ø°Ù Ù…Ø²Ø±Ø¹Ø© ${farmId}`)
        if (selectedFarm === farmId) setSelected(null)
        loadFarms()
      } else { showMsg(`âŒ ÙØ´Ù„ Ø§Ù„Ø­Ø°Ù: ${d.error || 'Ø®Ø·Ø£'}`) }
    } catch { showMsg('âŒ Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„') }
  }

  async function handleTransfer() {
    if (!transferFarm || !transferTarget.trim()) { setTransferMsg('âš ï¸ Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ø§Ù„Ù„Ø§Ø¹Ø¨ Ø§Ù„Ù…Ø³ØªÙ‚Ø¨Ù„'); return }
    if (transferRes.size === 0) { setTransferMsg('âš ï¸ Ø§Ø®ØªØ± Ù†ÙˆØ¹ Ù…ÙˆØ±Ø¯ ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„'); return }
    setTransferring(true); setTransferMsg('')
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/farms/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ farm_id: transferFarm, target_name: transferTarget.trim(), resources: Array.from(transferRes), amount: transferAmount, max_marches: transferMarches, method: transferMethod }),
      })
      const d = await res.json()
      if (d.ok) { setTransferMsg(`âœ… ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø£Ù…Ø± Ø§Ù„Ù†Ù‚Ù„ Ø¥Ù„Ù‰ ${transferFarm}`); setTimeout(() => { setShowTransfer(false); setTransferMsg('') }, 3000) }
      else { setTransferMsg(`âŒ ${d.error || 'ÙØ´Ù„ Ø§Ù„Ù†Ù‚Ù„'}`) }
    } catch { setTransferMsg('âŒ Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„') }
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

  // FIX: ÙŠØ±Ø³Ù„ Ù„Ù€ /api/farms/adb Ø¨Ø¯Ù„ /api/farms/command
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

  function startStream(farmId: string) {
    if (screenshotTimer.current) { clearInterval(screenshotTimer.current); screenshotTimer.current = null }
    setScreenshot(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    const token = `${farmId}_${Date.now()}`
    streamActive.current = token
    setStreamFarm(farmId)
    setStreaming(true)
    showMsg('ðŸ“º Ø¬Ø§Ø±Ù Ø¨Ø¯Ø¡ Ø§Ù„Ø¨Ø«...', 4000)
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
          <h1 style={{ color: '#f0a500', fontSize: 18, fontWeight: 700, margin: 0 }}>âš”ï¸ Ù…Ø²Ø§Ø±Ø¹ÙŠ â€” Live</h1>
          <p style={{ color: '#8b949e', fontSize: 12, margin: '2px 0 0', fontFamily: 'monospace' }}>
            <span style={{ color: '#3fb950' }}>â— {farms.filter(f => f.status === 'running').length}</span> Ø´ØºÙ‘Ø§Ù„Ø© Â·{' '}
            <span style={{ color: '#58a6ff' }}>âš¡ {farms.reduce((s, f) => s + (f.tasks_today || 0), 0)}</span> Ù…Ù‡Ù…Ø© Ø§Ù„ÙŠÙˆÙ…
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/dashboard" style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', padding: '6px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 12 }}>â† Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©</Link>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => setCols(n)} style={{ background: cols === n ? '#f0a500' : '#21262d', color: cols === n ? '#0d1117' : '#8b949e', border: '1px solid #30363d', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>{n}</button>
          ))}
        </div>
      </div>

      {msg && <div style={{ background: '#58a6ff15', borderBottom: '1px solid #58a6ff30', color: '#58a6ff', padding: '8px 24px', fontSize: 13, fontFamily: 'monospace' }}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 0, height: 'calc(100vh - 90px)' }}>

        {/* Left â€” Farms Grid */}
        <div style={{ padding: 20, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 40 }}>âš”ï¸</div>
              <p style={{ color: '#8b949e', fontSize: 13 }}>Ø¬Ø§Ø±Ù ØªØ­Ù…ÙŠÙ„ Ù…Ø²Ø§Ø±Ø¹Ùƒ...</p>
            </div>
          ) : farms.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 52 }}>ðŸ°</div>
              <h2 style={{ color: '#e6edf3', margin: 0 }}>Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø²Ø§Ø±Ø¹ Ø¨Ø¹Ø¯</h2>
              <Link href="/dashboard" style={{ background: 'linear-gradient(135deg,#f0a500,#e05c2a)', color: '#0d1117', padding: '10px 28px', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>+ Ø¥Ø¶Ø§ÙØ© Ù…Ø²Ø±Ø¹Ø©</Link>
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
                      <span>ðŸ“§ {farm.game_account || 'â€”'}</span>
                      <span>âš¡ {farm.tasks_today || 0} Ù…Ù‡Ù…Ø©</span>
                    </div>
                    {farm.current_task && <div style={{ fontSize: 11, color: '#f0a500', marginBottom: 4 }}>âš¡ {farm.current_task}</div>}
                    {farm.live_status === 'idle' && <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ¬Ù‡ÙŠØ²...</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {(farm.status === 'provisioning' || farm.live_status === 'idle') ? (
                        <button onClick={async e => {
                          e.stopPropagation(); showMsg(`â³ Ø¬Ø§Ø±Ù ØªÙØ¹ÙŠÙ„ ${farm.farm_name}...`)
                          try {
                            const authHeaders = await getAuthHeaders()
                            const res = await fetch('/api/farms/activate', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ farm_name: farm.farm_name }) })
                            const d = await res.json()
                            showMsg(d.ok ? `âœ… ØªÙ… ØªÙØ¹ÙŠÙ„ ${farm.farm_name}` : `âŒ ${d.error || 'ÙØ´Ù„ Ø§Ù„ØªÙØ¹ÙŠÙ„'}`)
                          } catch { showMsg('âŒ Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„') }
                          setTimeout(loadFarms, 3000)
                        }} style={{ flex: 1, background: '#f0a50018', border: '1px solid #f0a50050', color: '#f0a500', padding: '6px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>âš¡ ØªÙØ¹ÙŠÙ„</button>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); runTasks(farm.id, ['Gather Resources', 'Mail Rewards', 'Tribe Tech'], 'start') }} disabled={isRunning}
                          style={{ flex: 1, background: '#3fb95018', border: '1px solid #3fb95050', color: '#3fb950', padding: '6px', borderRadius: 6, cursor: isRunning ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700 }}
                        >{isRunning ? 'â³...' : 'â–¶ ØªØ´ØºÙŠÙ„'}</button>
                      )}
                      <button onClick={e => { e.stopPropagation(); setTransferFarm(farm.id); setShowTransfer(true); setTransferMsg('') }} style={{ background: '#58a6ff18', border: '1px solid #58a6ff50', color: '#58a6ff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>ðŸ“¦</button>
                      <button onClick={e => { e.stopPropagation(); stopFarm(farm.id) }} disabled={isRunning} style={{ background: '#f8514918', border: '1px solid #f8514950', color: '#f85149', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>â– </button>
                      <button onClick={e => { e.stopPropagation(); deleteFarm(farm.id) }} style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', color: '#f85149', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>ðŸ—‘ï¸</button>
                      <button onClick={async e => { e.stopPropagation(); if (streaming && streamFarm === farm.farm_name) { stopStream() } else { await launchGameIfNeeded(farm.farm_name); startStream(farm.farm_name) } }}
                        style={{ background: streaming && streamFarm === farm.farm_name ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.1)', border: streaming && streamFarm === farm.farm_name ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(59,130,246,0.3)', color: streaming && streamFarm === farm.farm_name ? '#f87171' : '#58a6ff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                      >{streaming && streamFarm === farm.farm_name ? 'â¹' : 'ðŸ“º'}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right â€” Control Panel */}
        <div style={{ background: '#161b22', borderLeft: '1px solid #21262d', padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Farm Info */}
          <div>
            <h3 style={{ color: '#f0a500', margin: '0 0 8px', fontSize: 13 }}>ðŸŽ® Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…</h3>
            {activeFarm ? (
              <div style={{ background: '#0d1117', borderRadius: 8, padding: 10, border: '1px solid #f0a50030' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{activeFarm.farm_name}</div>
                <div style={{ fontSize: 11, color: '#8b949e' }}>ðŸ“§ {activeFarm.game_account || 'â€”'}</div>
                <div style={{ fontSize: 11, marginTop: 2 }}><span style={{ color: sc(activeFarm.status) }}>â— {activeFarm.status}</span></div>
              </div>
            ) : <p style={{ color: '#8b949e', fontSize: 12 }}>Ø§Ø®ØªØ± Ù…Ø²Ø±Ø¹Ø© Ù…Ù† Ø§Ù„ÙŠØ³Ø§Ø±</p>}
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
                      <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: adbFeedback.startsWith('âœ…') ? '#3fb950' : '#f85149', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{adbFeedback}</div>
                    )}
                    {streaming && (
                      <button onClick={e => { e.stopPropagation(); setTapMode(p => !p) }}
                        style={{ position: 'absolute', bottom: 8, right: 8, background: tapMode ? 'rgba(245,158,11,0.9)' : 'rgba(0,0,0,0.7)', border: tapMode ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.2)', color: tapMode ? '#000' : '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >{tapMode ? 'ðŸŽ® ØªØ­ÙƒÙ…' : 'ðŸŽ®'}</button>
                    )}
                    <button onClick={e => { e.stopPropagation(); setZoomedScreenshot(screenshot) }}
                      style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>ðŸ”</button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#8b949e', padding: 16 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>ðŸ“º</div>
                    <div style={{ fontSize: 11 }}>{streaming ? 'â³ Ø¬Ø§Ø±Ù Ø§Ù„ØªØ­Ù…ÙŠÙ„...' : 'Ø§Ø¶ØºØ· Ø¨Ø« Ù„Ù„Ù…Ø´Ø§Ù‡Ø¯Ø©'}</div>
                  </div>
                )}
                {streaming && <div style={{ position: 'absolute', top: 6, right: 6, background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>â— LIVE</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {!streaming ? (
                  <button onClick={async () => { await launchGameIfNeeded(activeFarm.farm_name); startStream(activeFarm.farm_name) }} style={{ flex: 1, padding: '7px', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>ðŸ“º Ø¨Ø« Ù…Ø¨Ø§Ø´Ø±</button>
                ) : (
                  <button onClick={stopStream} style={{ flex: 1, padding: '7px', background: '#21262d', color: '#f85149', border: '1px solid #f8514930', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>â¹ Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ø¨Ø«</button>
                )}
              </div>
            </div>
          )}

          {/* â•â• Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ… Ø¨Ø§Ù„Ø£Ù„Ø¹Ø§Ø¨ â•â• */}
          {activeFarm && streaming && (
            <div style={{ background: '#0d1117', borderRadius: 8, padding: 12, border: '1px solid #f0a50030' }}>
              <div style={{ fontSize: 11, color: '#f0a500', marginBottom: 10, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>ðŸ•¹ï¸ ØªØ­ÙƒÙ… Ù…Ø¨Ø§Ø´Ø±</span>
                <span style={{ color: '#8b949e', fontSize: 10 }}>{streamFarm}</span>
              </div>

              {/* Ø£Ø²Ø±Ø§Ø± Ø§Ù„Ù†Ø¸Ø§Ù… */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 5 }}>Ù†Ø¸Ø§Ù…</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { label: 'â—€ Ø±Ø¬ÙˆØ¹',    cmd: 'key:BACK',  color: '#58a6ff' },
                    { label: 'âŒ‚ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©', cmd: 'key:HOME',  color: '#3fb950' },
                    { label: 'â˜° Ù‚Ø§Ø¦Ù…Ø©',   cmd: 'key:MENU',  color: '#f59e0b' },
                  ].map(btn => (
                    <button key={btn.cmd} className="ctrl-btn"
                      onClick={() => streamFarm && sendAdb(streamFarm, btn.cmd)}
                      style={{ flex: 1, padding: '7px 4px', background: btn.color + '15', border: `1px solid ${btn.color}40`, color: btn.color, borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700, transition: 'all 0.15s' }}
                    >{btn.label}</button>
                  ))}
                </div>
              </div>

              {/* Ø£Ø²Ø±Ø§Ø± Ø§Ù„Ù„Ø¹Ø¨Ø© */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 5 }}>Viking Rise</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
                  {[
                    { label: 'ðŸ—ºï¸ Ø®Ø±ÙŠØ·Ø©',   cmd: 'tap:47,643'    },
                    { label: 'ðŸ° Ù‚Ù„Ø¹Ø©',    cmd: 'tap:640,360'   },
                    { label: 'âœ‰ï¸ Ø¨Ø±ÙŠØ¯',    cmd: 'tap:1245,580'  },
                    { label: 'ðŸŽ Ù…ÙƒØ§ÙØ¢Øª', cmd: 'tap:1140,580'  },
                    { label: 'âš”ï¸ Ù‡Ø¬ÙˆÙ…',   cmd: 'tap:950,462'   },
                    { label: 'ðŸ” Ø¨Ø­Ø«',    cmd: 'tap:155,525'   },
                    { label: 'ðŸ—ï¸ Ø¨Ù†Ø§Ø¡',   cmd: 'tap:640,550'   },
                    { label: 'ðŸ‘¥ ØªØ­Ø§Ù„Ù',  cmd: 'tap:1100,685'  },
                    { label: 'â—€ Ø±Ø¬ÙˆØ¹',    cmd: 'key:BACK'      },
                  ].map(btn => (
                    <button key={btn.cmd} className="ctrl-btn"
                      onClick={() => streamFarm && sendAdb(streamFarm, btn.cmd)}
                      style={{ padding: '7px 4px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 10, transition: 'all 0.15s' }}
                    >{btn.label}</button>
                  ))}
                </div>
              </div>

              {/* D-Pad Ù„Ù„ØªÙ…Ø±ÙŠØ± */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 5 }}>ØªÙ…Ø±ÙŠØ± Ø§Ù„Ø´Ø§Ø´Ø©</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, maxWidth: 120, margin: '0 auto' }}>
                  <div />
                  <button className="ctrl-btn" onClick={() => streamFarm && sendAdb(streamFarm, 'swipe:640,500,640,200')}
                    style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>â†‘</button>
                  <div />
                  <button className="ctrl-btn" onClick={() => streamFarm && sendAdb(streamFarm, 'swipe:800,360,200,360')}
                    style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>â†</button>
                  <button className="ctrl-btn" onClick={() => streamFarm && sendAdb(streamFarm, 'tap:640,360')}
                    style={{ padding: '8px', background: '#f0a50018', border: '1px solid #f0a50050', color: '#f0a500', borderRadius: 6, cursor: 'pointer', fontSize: 12, transition: 'all 0.15s' }}>OK</button>
                  <button className="ctrl-btn" onClick={() => streamFarm && sendAdb(streamFarm, 'swipe:200,360,800,360')}
                    style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>â†’</button>
                  <div />
                  <button className="ctrl-btn" onClick={() => streamFarm && sendAdb(streamFarm, 'swipe:640,200,640,500')}
                    style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>â†“</button>
                  <div />
                </div>
              </div>

              {/* Ø²Ø± ØªØ­ÙƒÙ… tap mode */}
              <button onClick={() => setTapMode(p => !p)}
                style={{ width: '100%', padding: '8px', background: tapMode ? 'rgba(245,158,11,0.2)' : '#21262d', border: `1px solid ${tapMode ? '#f59e0b' : '#30363d'}`, color: tapMode ? '#f59e0b' : '#8b949e', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
              >{tapMode ? 'ðŸŽ® ÙˆØ¶Ø¹ Ø§Ù„ØªØ­ÙƒÙ…: Ø´ØºÙ‘Ø§Ù„ â€” Ø§Ù†Ù‚Ø± Ø¹Ù„Ù‰ Ø§Ù„Ø´Ø§Ø´Ø©' : 'ðŸŽ® ØªÙØ¹ÙŠÙ„ Ø§Ù„Ù†Ù‚Ø± Ø¹Ù„Ù‰ Ø§Ù„Ø´Ø§Ø´Ø©'}</button>
            </div>
          )}

          {/* Tasks Selection */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ color: '#e6edf3', margin: 0, fontSize: 12 }}>ðŸ“‹ Ø§Ù„Ù…Ù‡Ø§Ù…</h4>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setTasks(new Set(TASKS_MAP.flatMap(g => g.tasks)))} style={{ fontSize: 10, padding: '2px 7px', background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: 4, cursor: 'pointer' }}>Ø§Ù„ÙƒÙ„</button>
                <button onClick={() => setTasks(new Set())} style={{ fontSize: 10, padding: '2px 7px', background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: 4, cursor: 'pointer' }}>Ù…Ø³Ø­</button>
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
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, textAlign: 'center' }}>{selectedTasks.size > 0 ? `${selectedTasks.size} Ù…Ù‡Ù…Ø© Ù…Ø­Ø¯Ø¯Ø©` : 'Ù„Ù… ØªÙØ­Ø¯ÙŽÙ‘Ø¯ Ù…Ù‡Ø§Ù…'}</div>
              <button onClick={() => { if (selectedTasks.size === 0) { showMsg('âš ï¸ Ø§Ø®ØªØ± Ù…Ù‡Ù…Ø©'); return }; runTasks(activeFarm.id, Array.from(selectedTasks)) }} disabled={running[activeFarm.id]}
                style={{ width: '100%', padding: '11px', background: selectedTasks.size > 0 ? 'linear-gradient(135deg,#10b981,#059669)' : '#21262d', color: selectedTasks.size > 0 ? '#fff' : '#8b949e', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: selectedTasks.size > 0 ? 'pointer' : 'not-allowed', marginBottom: 6 }}
              >{running[activeFarm.id] ? 'â³ Ø¬Ø§Ø±Ù Ø§Ù„ØªØ´ØºÙŠÙ„...' : `â–¶ ØªØ´ØºÙŠÙ„ ${selectedTasks.size} Ù…Ù‡Ù…Ø©`}</button>
              <button onClick={() => stopFarm(activeFarm.id)} style={{ width: '100%', padding: '9px', background: '#f8514910', border: '1px solid #f8514930', color: '#f85149', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>â–  Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ù…Ø²Ø±Ø¹Ø©</button>
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
              <span style={{ color: '#f0a500', fontSize: 13, fontWeight: 700 }}>ðŸ“º {streamFarm}</span>
              <button onClick={() => setZoomedScreenshot(null)} style={{ background: 'rgba(248,81,73,0.2)', border: '1px solid #f8514950', color: '#f85149', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>âœ•</button>
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
            {adbFeedback && <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', color: adbFeedback.startsWith('âœ…') ? '#3fb950' : '#f85149', padding: '3px 10px', borderRadius: 5, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{adbFeedback}</div>}
            <div style={{ position: 'absolute', top: 6, left: 8, background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>â— LIVE â€” {streamFarm}</div>
            <div style={{ position: 'absolute', top: 4, right: 6, display: 'flex', gap: 4 }}>
              <button onClick={e => { e.stopPropagation(); setTapMode(p => !p) }} style={{ background: tapMode ? 'rgba(245,158,11,0.9)' : 'rgba(0,0,0,0.7)', border: 'none', color: tapMode ? '#000' : '#fff', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}>ðŸŽ®</button>
              <button onClick={stopStream} style={{ background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>âœ•</button>
            </div>
            {/* Quick controls in overlay */}
            <div style={{ display: 'flex', gap: 4, padding: '6px 8px', background: '#0d1117' }}>
              {[
                { label: 'â—€', cmd: 'key:BACK', color: '#58a6ff' },
                { label: 'âŒ‚', cmd: 'key:HOME', color: '#3fb950' },
                { label: 'ðŸ—ºï¸', cmd: 'tap:47,643', color: '#f59e0b' },
                { label: 'âœ‰ï¸', cmd: 'tap:1245,580', color: '#8b5cf6' },
                { label: 'âš”ï¸', cmd: 'tap:950,462', color: '#ef4444' },
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
              <h3 style={{ color: '#58a6ff', margin: 0, fontSize: 16, fontWeight: 700 }}>ðŸ“¦ Ù†Ù‚Ù„ Ø§Ù„Ù…ÙˆØ§Ø±Ø¯ â€” {transferFarm}</h3>
              <button onClick={() => setShowTransfer(false)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 20 }}>âœ•</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>ðŸŽ¯ Ø§Ø³Ù… Ø§Ù„Ù„Ø§Ø¹Ø¨ Ø§Ù„Ù…Ø³ØªÙ‚Ø¨Ù„</label>
              <input value={transferTarget} onChange={e => setTransferTarget(e.target.value)} placeholder="Ù…Ø«Ø§Ù„: Ahmed" autoFocus style={{ width: '100%', padding: '10px 14px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>ðŸ’° Ù†ÙˆØ¹ Ø§Ù„Ù…ÙˆØ§Ø±Ø¯</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[{ key: 'food', label: 'ðŸŒ¾ Ø·Ø¹Ø§Ù…', color: '#3fb950' }, { key: 'wood', label: 'ðŸªµ Ø®Ø´Ø¨', color: '#f0a500' }, { key: 'stone', label: 'ðŸª¨ Ø­Ø¬Ø§Ø±Ø©', color: '#8b949e' }, { key: 'gold', label: 'ðŸª™ Ø°Ù‡Ø¨', color: '#ffd700' }].map(r => {
                  const on = transferRes.has(r.key)
                  return <button key={r.key} onClick={() => setTransferRes(p => { const n = new Set(p); n.has(r.key) ? n.delete(r.key) : n.add(r.key); return n })} style={{ padding: '10px', background: on ? r.color + '20' : '#0d1117', border: `2px solid ${on ? r.color : '#30363d'}`, borderRadius: 8, color: on ? r.color : '#8b949e', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>{r.label}</button>
                })}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>ðŸ“Š Ø§Ù„ÙƒÙ…ÙŠØ©</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ key: 'all', label: 'ðŸ”´ ÙƒÙ„ Ø´ÙŠØ¡' }, { key: 'half', label: 'ðŸŸ¡ Ø§Ù„Ù†ØµÙ' }].map(a => (
                  <button key={a.key} onClick={() => setTransferAmount(a.key as 'all'|'half')} style={{ flex: 1, padding: '10px', background: transferAmount === a.key ? '#58a6ff20' : '#0d1117', border: `2px solid ${transferAmount === a.key ? '#58a6ff' : '#30363d'}`, borderRadius: 8, color: transferAmount === a.key ? '#58a6ff' : '#8b949e', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>{a.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>âš”ï¸ Ø¹Ø¯Ø¯ Ø§Ù„Ø¬ÙŠÙˆØ´: {transferMarches}</label>
              <input type="range" min={1} max={4} value={transferMarches} onChange={e => setTransferMarches(Number(e.target.value))} style={{ width: '100%', accentColor: '#58a6ff' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>ðŸ›ï¸ Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ù†Ù‚Ù„</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ key: 'tribe_hall', label: 'ðŸ›ï¸ Ù‚Ø§Ø¹Ø© Ø§Ù„Ù‚Ø¨ÙŠÙ„Ø©' }, { key: 'world_map', label: 'ðŸ—ºï¸ Ø§Ù„Ø®Ø±ÙŠØ·Ø©' }].map(m => (
                  <button key={m.key} onClick={() => setTransferMethod(m.key as 'tribe_hall'|'world_map')} style={{ flex: 1, padding: '8px', background: transferMethod === m.key ? '#8b5cf620' : '#0d1117', border: `2px solid ${transferMethod === m.key ? '#8b5cf6' : '#30363d'}`, borderRadius: 8, color: transferMethod === m.key ? '#8b5cf6' : '#8b949e', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>{m.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f0a50010', border: '1px solid #f0a50030', borderRadius: 8, fontSize: 12, color: '#f0a500' }}>âš ï¸ Ø¶Ø±ÙŠØ¨Ø© 32% â€” Ø¥Ø±Ø³Ø§Ù„ 100k = Ø§Ù„Ù…Ø³ØªÙ‚Ø¨Ù„ ÙŠØ³ØªÙ„Ù… ~68k</div>
            {transferMsg && <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: transferMsg.startsWith('âœ…') ? '#3fb95015' : '#f8514915', border: `1px solid ${transferMsg.startsWith('âœ…') ? '#3fb95040' : '#f8514940'}`, color: transferMsg.startsWith('âœ…') ? '#3fb950' : '#f85149' }}>{transferMsg}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowTransfer(false)} style={{ flex: 1, padding: '12px', background: '#21262d', border: '1px solid #30363d', borderRadius: 8, color: '#8b949e', cursor: 'pointer', fontSize: 14 }}>Ø¥Ù„ØºØ§Ø¡</button>
              <button onClick={handleTransfer} disabled={transferring || !transferTarget.trim()} style={{ flex: 2, padding: '12px', background: transferring || !transferTarget.trim() ? '#21262d' : 'linear-gradient(135deg, #58a6ff, #1f6feb)', border: 'none', borderRadius: 8, color: transferring || !transferTarget.trim() ? '#8b949e' : '#fff', cursor: transferring || !transferTarget.trim() ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700 }}>
                {transferring ? 'â³ Ø¬Ø§Ø±Ù Ø§Ù„Ø¥Ø±Ø³Ø§Ù„...' : `ðŸ“¦ Ù†Ù‚Ù„ â†’ ${transferTarget || '...'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}