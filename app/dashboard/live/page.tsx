'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const TASKS_MAP = [
  { group: 'الموارد 🌾',    color: '#10b981', tasks: ['Gather Resources', 'Collect Farms', 'Open Chests', 'Collect Free Items'] },
  { group: 'القتال ⚔️',    color: '#ef4444', tasks: ['Kill Monster', 'Hunt Niflung', 'Rally Niflung'] },
  { group: 'التحالف 🏰',   color: '#8b5cf6', tasks: ['Tribe Tech', 'Tribe Gifts', 'Alliance Help', 'Send Gifts'] },
  { group: 'اليومية 📋',    color: '#f59e0b', tasks: ['Mail Rewards', 'Hall of Valor', 'Prosperity', 'Quest Rewards'] },
  { group: 'التطوير 🔨',    color: '#3b82f6', tasks: ['Building Upgrade', 'Train Troops', 'Research Tech', 'Heal Wounded'] },
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
  const [showTransfer, setShowTransfer]     = useState(false)
  const [transferFarm, setTransferFarm]     = useState<string | null>(null)
  const [transferTarget, setTransferTarget] = useState('')
  const [transferRes, setTransferRes]       = useState<Set<string>>(new Set(['food','wood','stone','gold']))
  const [transferAmount, setTransferAmount] = useState<'all'|'half'>('all')
  const [transferMarches, setTransferMarches] = useState(1)
  const [transferMethod, setTransferMethod] = useState<'tribe_hall'|'world_map'>('tribe_hall')
  const [transferring, setTransferring]     = useState(false)
  const [transferMsg, setTransferMsg]       = useState('')
  const [streaming, setStreaming]           = useState(false)
  const [screenshot, setScreenshot]         = useState<string | null>(null)
  const [streamFarm, setStreamFarm]         = useState<string | null>(null)
  const screenshotTimer                     = useRef<NodeJS.Timeout | null>(null)

  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const showMsg = (m: string, ms = 4000) => {
    setMsg(m)
    setTimeout(() => setMsg(''), ms)
  }

  const loadFarms = useCallback(async () => {
    try {
      // جرّب /api/farms/status أولاً (يدعم cookies)
      const res = await fetch('/api/farms/status')

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
        if (list.length > 0 && !selectedFarm) setSelected(list[0].id)
      } else {
        // fallback إلى /api/farms/list
        const res2 = await fetch('/api/farms/list')
        if (res2.ok) {
          const d2 = await res2.json()
          const list2 = (d2.farms || []).map((f: any) => ({
            id:           f.farm_name || f.name || f.id,
            farm_name:    f.farm_name || f.name || f.id,
            status:       f.status || 'offline',
            game_account: f.game_account || '',
            tasks_today:  0,
            live_status:  f.status === 'running' ? 'online' : f.status === 'provisioning' ? 'idle' : 'offline',
            current_task: null,
          }))
          setFarms(list2)
          if (list2.length > 0 && !selectedFarm) setSelected(list2[0].id)
        }
      }
    } catch (e) {
      console.error('loadFarms error:', e)
    }
    setLoading(false)
  }, [selectedFarm])

  useEffect(() => {
    loadFarms()
    const t = setInterval(loadFarms, 15000)
    return () => clearInterval(t)
  }, [loadFarms])

  useEffect(() => {
    return () => {
      if (screenshotTimer.current) clearInterval(screenshotTimer.current)
    }
  }, [])

  async function runTasks(farmId: string, taskList: string[], action?: string) {
    setRunning(p => ({ ...p, [farmId]: true }))
    showMsg(`⏳ جارٍ تشغيل ${taskList.length} مهمة على ${farmId}...`)
    try {
      const res = await fetch('/api/farms/run-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farm_id: farmId, tasks: taskList, action }),
      })
      const d = await res.json()
      if (d.ok) {
        showMsg(`✅ تم تشغيل ${taskList.length} مهمة على ${farmId}`)
        loadFarms()
      } else {
        showMsg(`❌ خطأ: ${d.error || 'فشل التشغيل'}`)
      }
    } catch {
      showMsg('❌ لا يمكن الاتصال بالسيرفر')
    }
    setRunning(p => ({ ...p, [farmId]: false }))
  }

  async function stopFarm(farmId: string) {
    setRunning(p => ({ ...p, [farmId]: true }))
    showMsg(`⏹ جارٍ إيقاف ${farmId}...`)
    await fetch('/api/farms/run-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farm_id: farmId, action: 'stop' }),
    })
    showMsg(`⏹ تم إيقاف ${farmId}`)
    setRunning(p => ({ ...p, [farmId]: false }))
    loadFarms()
  }

  async function deleteFarm(farmId: string) {
    if (!confirm(`هل تريد حذف مزرعة "${farmId}"؟\nهذا الإجراء لا يمكن التراجع عنه.`)) return

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    showMsg(`🗑️ جارٍ حذف ${farmId}...`)

    try {
      const res = await fetch(`/api/farms/delete?id=${farmId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      })
      const d = await res.json()
      if (d.ok) {
        showMsg(`✅ تم حذف مزرعة ${farmId}`)
        if (selectedFarm === farmId) setSelected(null)
        loadFarms()
      } else {
        showMsg(`❌ فشل الحذف: ${d.error || 'خطأ'}`)
      }
    } catch {
      showMsg('❌ خطأ في الاتصال')
    }
  }

  async function handleTransfer() {
    if (!transferFarm || !transferTarget.trim()) {
      setTransferMsg('⚠️ أدخل اسم اللاعب المستقبل')
      return
    }
    if (transferRes.size === 0) {
      setTransferMsg('⚠️ اختر نوع مورد واحد على الأقل')
      return
    }
    setTransferring(true)
    setTransferMsg('')
    try {
      const res = await fetch('/api/farms/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id:      transferFarm,
          target_name:  transferTarget.trim(),
          resources:    Array.from(transferRes),
          amount:       transferAmount,
          max_marches:  transferMarches,
          method:       transferMethod,
        }),
      })
      const d = await res.json()
      if (d.ok) {
        setTransferMsg(`✅ تم إرسال أمر النقل إلى ${transferFarm}`)
        setTimeout(() => { setShowTransfer(false); setTransferMsg('') }, 3000)
      } else {
        setTransferMsg(`❌ ${d.error || 'فشل النقل'}`)
      }
    } catch {
      setTransferMsg('❌ خطأ في الاتصال')
    }
    setTransferring(false)
  }

  function startStream(farmId: string) {
    stopStream()
    setStreamFarm(farmId)
    setStreaming(true)
    setScreenshot(null)

    async function capture() {
      try {
        const res = await fetch(`/api/farms/screenshot?farm_id=${farmId}`)
        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          setScreenshot(prev => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
        }
      } catch {}
    }

    capture()
    screenshotTimer.current = setInterval(capture, 2000)
  }

  function stopStream() {
    setStreaming(false)
    setStreamFarm(null)
    if (screenshotTimer.current) {
      clearInterval(screenshotTimer.current)
      screenshotTimer.current = null
    }
    if (screenshot) {
      URL.revokeObjectURL(screenshot)
      setScreenshot(null)
    }
  }

  function toggleTask(t: string) {
    setTasks(p => {
      const n = new Set(p)
      n.has(t) ? n.delete(t) : n.add(t)
      return n
    })
  }

  const sc = (s: string) =>
    s === 'running' ? '#10b981' : s === 'provisioning' ? '#f59e0b' : '#64748b'

  const activeFarm = farms.find(f => f.id === selectedFarm)

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'sans-serif' }}>

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

      {/* Message bar */}
      {msg && (
        <div style={{ background: '#58a6ff15', borderBottom: '1px solid #58a6ff30', color: '#58a6ff', padding: '8px 24px', fontSize: 13, fontFamily: 'monospace' }}>{msg}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 0, height: 'calc(100vh - 90px)' }}>

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
                  <div
                    key={farm.id}
                    onClick={() => setSelected(farm.id)}
                    style={{
                      borderRadius: 10,
                      border: `2px solid ${isSelected ? '#f0a500' : '#21262d'}`,
                      background: isSelected ? '#f0a50010' : '#161b22',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      padding: 16,
                      boxShadow: isSelected ? '0 0 20px #f0a50025' : 'none',
                    }}
                  >
                    {/* Farm Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc(farm.status), display: 'inline-block', boxShadow: `0 0 6px ${sc(farm.status)}` }} />
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{farm.farm_name}</span>
                      </div>
                      <span style={{ fontSize: 11, color: sc(farm.status), fontFamily: 'monospace', background: sc(farm.status) + '15', padding: '2px 8px', borderRadius: 4 }}>
                        {farm.status}
                      </span>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 4, fontSize: 12, color: '#8b949e' }}>
                      <span>📧 {farm.game_account || '—'}</span>
                      <span>⚡ {farm.tasks_today || 0} مهمة</span>
                    </div>

                    {/* Live info */}
                    {farm.current_task && (
                      <div style={{ fontSize: 11, color: '#f0a500', marginBottom: 4 }}>
                        ⚡ {farm.current_task}
                      </div>
                    )}
                    {farm.live_status === 'idle' && (
                      <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>
                        ⏳ جاري التجهيز...
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {(farm.status === 'provisioning' || farm.live_status === 'idle') ? (
                        <button
                          onClick={async e => {
                            e.stopPropagation()
                            showMsg(`⏳ جارٍ تفعيل ${farm.farm_name}...`)
                            try {
                              const res = await fetch('/api/farms/activate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ farm_name: farm.farm_name }),
                              })
                              const d = await res.json()
                              if (d.ok) {
                                showMsg(`✅ تم تفعيل ${farm.farm_name}`)
                              } else {
                                showMsg(`❌ ${d.error || 'فشل التفعيل'}`)
                              }
                            } catch {
                              showMsg('❌ خطأ في الاتصال')
                            }
                            setTimeout(loadFarms, 3000)
                          }}
                          style={{ flex: 1, background: '#f0a50018', border: '1px solid #f0a50050', color: '#f0a500', padding: '6px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                        >
                          ⚡ تفعيل
                        </button>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); runTasks(farm.id, ['Gather Resources', 'Mail Rewards', 'Tribe Tech'], 'start') }}
                          disabled={isRunning}
                          style={{ flex: 1, background: '#3fb95018', border: '1px solid #3fb95050', color: '#3fb950', padding: '6px', borderRadius: 6, cursor: isRunning ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700 }}
                        >
                          {isRunning ? '⏳...' : '▶ تشغيل'}
                        </button>
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setTransferFarm(farm.id)
                          setShowTransfer(true)
                          setTransferMsg('')
                        }}
                        style={{
                          background: '#58a6ff18',
                          border: '1px solid #58a6ff50',
                          color: '#58a6ff',
                          padding: '6px 10px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        📦 نقل
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); stopFarm(farm.id) }}
                        disabled={isRunning}
                        style={{ background: '#f8514918', border: '1px solid #f8514950', color: '#f85149', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                      >
                        ■
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          deleteFarm(farm.id)
                        }}
                        title="حذف المزرعة"
                        style={{
                          background: 'rgba(248,81,73,0.1)',
                          border: '1px solid rgba(248,81,73,0.3)',
                          color: '#f85149',
                          padding: '6px 10px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 700,
                          transition: 'all 0.15s',
                        }}
                      >
                        🗑️
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); streaming && streamFarm === farm.farm_name ? stopStream() : startStream(farm.farm_name) }}
                        style={{
                          background: streaming && streamFarm === farm.farm_name ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.1)',
                          border: streaming && streamFarm === farm.farm_name ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(59,130,246,0.3)',
                          color: streaming && streamFarm === farm.farm_name ? '#f87171' : '#58a6ff',
                          padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        }}
                      >
                        {streaming && streamFarm === farm.farm_name ? '⏹' : '📺'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right — Control Panel */}
        <div style={{ background: '#161b22', borderLeft: '1px solid #21262d', padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Selected Farm */}
          <div>
            <h3 style={{ color: '#f0a500', margin: '0 0 12px', fontSize: 14 }}>🎮 لوحة التحكم</h3>
            {activeFarm ? (
              <div style={{ background: '#0d1117', borderRadius: 8, padding: 12, border: '1px solid #f0a50030' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{activeFarm.farm_name}</div>
                <div style={{ fontSize: 12, color: '#8b949e' }}>📧 {activeFarm.game_account || '—'}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  <span style={{ color: sc(activeFarm.status) }}>● {activeFarm.status}</span>
                </div>
              </div>
            ) : (
              <p style={{ color: '#8b949e', fontSize: 12 }}>اختر مزرعة من اليسار</p>
            )}
          </div>

          {/* Live Screen */}
          {activeFarm && (
            <div>
              <div style={{
                background: '#000',
                borderRadius: 8,
                overflow: 'hidden',
                aspectRatio: '16/9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                minHeight: 180,
              }}>
                {screenshot ? (
                  <img
                    src={screenshot}
                    alt="Live Screen"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#8b949e' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📺</div>
                    <div style={{ fontSize: 12 }}>
                      {streaming ? 'جارٍ التحميل...' : 'اضغط بث للمشاهدة'}
                    </div>
                  </div>
                )}
                {streaming && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    background: '#ef4444', color: '#fff',
                    padding: '2px 8px', borderRadius: 4,
                    fontSize: 11, fontWeight: 700,
                  }}>
                    ● LIVE
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {!streaming ? (
                  <button
                    onClick={() => startStream(activeFarm.farm_name)}
                    style={{
                      flex: 1, padding: '8px',
                      background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                      color: '#fff', border: 'none',
                      borderRadius: 6, cursor: 'pointer',
                      fontSize: 12, fontWeight: 700,
                    }}
                  >
                    📺 بث مباشر
                  </button>
                ) : (
                  <button
                    onClick={stopStream}
                    style={{
                      flex: 1, padding: '8px',
                      background: '#21262d',
                      color: '#f85149', border: '1px solid #f8514930',
                      borderRadius: 6, cursor: 'pointer',
                      fontSize: 12, fontWeight: 700,
                    }}
                  >
                    ⏹ إيقاف البث
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tasks Selection */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ color: '#e6edf3', margin: 0, fontSize: 13 }}>📋 اختر المهام</h4>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setTasks(new Set(TASKS_MAP.flatMap(g => g.tasks)))} style={{ fontSize: 10, padding: '3px 8px', background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: 4, cursor: 'pointer' }}>الكل</button>
                <button onClick={() => setTasks(new Set())} style={{ fontSize: 10, padding: '3px 8px', background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: 4, cursor: 'pointer' }}>مسح</button>
              </div>
            </div>

            {TASKS_MAP.map(group => (
              <div key={group.group} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: group.color, fontWeight: 700, marginBottom: 6 }}>{group.group}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {group.tasks.map(task => {
                    const on = selectedTasks.has(task)
                    return (
                      <button
                        key={task}
                        onClick={() => toggleTask(task)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: `1px solid ${on ? group.color : '#30363d'}`,
                          background: on ? group.color + '20' : '#21262d',
                          color: on ? group.color : '#8b949e',
                          fontSize: 11,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {task}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Run Button */}
          {activeFarm && (
            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 8, textAlign: 'center' }}>
                {selectedTasks.size > 0 ? `${selectedTasks.size} مهمة محددة` : 'لم تُحدَّد مهام'}
              </div>
              <button
                onClick={() => {
                  if (selectedTasks.size === 0) {
                    showMsg('⚠️ اختر مهمة واحدة على الأقل')
                    return
                  }
                  runTasks(activeFarm.id, Array.from(selectedTasks))
                }}
                disabled={running[activeFarm.id]}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: selectedTasks.size > 0 ? 'linear-gradient(135deg,#10b981,#059669)' : '#21262d',
                  color: selectedTasks.size > 0 ? '#fff' : '#8b949e',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: selectedTasks.size > 0 ? 'pointer' : 'not-allowed',
                  marginBottom: 8,
                }}
              >
                {running[activeFarm.id] ? '⏳ جارٍ التشغيل...' : `▶ تشغيل ${selectedTasks.size} مهمة`}
              </button>
              <button
                onClick={() => stopFarm(activeFarm.id)}
                style={{ width: '100%', padding: '10px', background: '#f8514910', border: '1px solid #f8514930', color: '#f85149', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                ■ إيقاف المزرعة
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live Stream Overlay */}
      {streaming && screenshot && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20,
          width: 340, background: '#161b22',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 12, overflow: 'hidden',
          zIndex: 9998, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          <div style={{ position: 'relative' }}>
            <img
              src={screenshot}
              alt="Live"
              style={{ width: '100%', display: 'block', objectFit: 'contain' }}
            />
            <div style={{
              position: 'absolute', top: 8, left: 8,
              background: '#ef4444', color: '#fff',
              padding: '2px 8px', borderRadius: 4,
              fontSize: 10, fontWeight: 700,
            }}>
              ● LIVE — {streamFarm}
            </div>
            <button
              onClick={stopStream}
              style={{
                position: 'absolute', top: 6, right: 8,
                background: 'rgba(0,0,0,0.6)', border: 'none',
                color: '#fff', borderRadius: 4,
                padding: '3px 10px', cursor: 'pointer', fontSize: 12,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div
          onClick={() => setShowTransfer(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#161b22',
              border: '1px solid #58a6ff30',
              borderRadius: 16,
              padding: 28,
              width: '100%',
              maxWidth: 460,
              fontFamily: 'sans-serif',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#58a6ff', margin: 0, fontSize: 16, fontWeight: 700 }}>
                📦 نقل الموارد — {transferFarm}
              </h3>
              <button
                onClick={() => setShowTransfer(false)}
                style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 20 }}
              >✕</button>
            </div>

            {/* اسم اللاعب المستقبل */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>
                🎯 اسم اللاعب المستقبل
              </label>
              <input
                value={transferTarget}
                onChange={e => setTransferTarget(e.target.value)}
                placeholder="مثال: Ahmed"
                autoFocus
                style={{
                  width: '100%', padding: '10px 14px',
                  background: '#0d1117', border: '1px solid #30363d',
                  borderRadius: 8, color: '#e6edf3', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* نوع الموارد */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>
                💰 نوع الموارد (يمكن اختيار أكثر من واحد)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { key: 'food',  label: '🌾 طعام',  color: '#3fb950' },
                  { key: 'wood',  label: '🪵 خشب',   color: '#f0a500' },
                  { key: 'stone', label: '🪨 حجارة', color: '#8b949e' },
                  { key: 'gold',  label: '🪙 ذهب',   color: '#ffd700' },
                ].map(r => {
                  const on = transferRes.has(r.key)
                  return (
                    <button
                      key={r.key}
                      onClick={() => setTransferRes(p => {
                        const n = new Set(p)
                        n.has(r.key) ? n.delete(r.key) : n.add(r.key)
                        return n
                      })}
                      style={{
                        padding: '10px',
                        background: on ? r.color + '20' : '#0d1117',
                        border: `2px solid ${on ? r.color : '#30363d'}`,
                        borderRadius: 8, color: on ? r.color : '#8b949e',
                        cursor: 'pointer', fontSize: 13, fontWeight: 700,
                        transition: 'all 0.15s',
                      }}
                    >
                      {r.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* الكمية */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>
                📊 الكمية
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'all',  label: '🔴 كل شيء' },
                  { key: 'half', label: '🟡 النصف'  },
                ].map(a => (
                  <button
                    key={a.key}
                    onClick={() => setTransferAmount(a.key as 'all'|'half')}
                    style={{
                      flex: 1, padding: '10px',
                      background: transferAmount === a.key ? '#58a6ff20' : '#0d1117',
                      border: `2px solid ${transferAmount === a.key ? '#58a6ff' : '#30363d'}`,
                      borderRadius: 8,
                      color: transferAmount === a.key ? '#58a6ff' : '#8b949e',
                      cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* عدد الجيوش */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>
                ⚔️ عدد الجيوش: {transferMarches}
              </label>
              <input
                type="range" min={1} max={4} value={transferMarches}
                onChange={e => setTransferMarches(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#58a6ff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8b949e', marginTop: 4 }}>
                <span>1 جيش</span><span>2</span><span>3</span><span>4 جيوش</span>
              </div>
            </div>

            {/* طريقة النقل */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>
                🏛️ طريقة النقل
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'tribe_hall', label: '🏛️ قاعة القبيلة (أفضل)' },
                  { key: 'world_map',  label: '🗺️ الخريطة العالمية'    },
                ].map(m => (
                  <button
                    key={m.key}
                    onClick={() => setTransferMethod(m.key as 'tribe_hall'|'world_map')}
                    style={{
                      flex: 1, padding: '8px',
                      background: transferMethod === m.key ? '#8b5cf620' : '#0d1117',
                      border: `2px solid ${transferMethod === m.key ? '#8b5cf6' : '#30363d'}`,
                      borderRadius: 8,
                      color: transferMethod === m.key ? '#8b5cf6' : '#8b949e',
                      cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ملاحظة الضريبة */}
            <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f0a50010', border: '1px solid #f0a50030', borderRadius: 8, fontSize: 12, color: '#f0a500' }}>
              ⚠️ ملاحظة: ضريبة 32% تُطبَّق — إرسال 100k = المستقبل يستلم ~68k
            </div>

            {/* رسالة النتيجة */}
            {transferMsg && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13,
                background: transferMsg.startsWith('✅') ? '#3fb95015' : '#f8514915',
                border: `1px solid ${transferMsg.startsWith('✅') ? '#3fb95040' : '#f8514940'}`,
                color: transferMsg.startsWith('✅') ? '#3fb950' : '#f85149',
              }}>
                {transferMsg}
              </div>
            )}

            {/* أزرار */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowTransfer(false)}
                style={{
                  flex: 1, padding: '12px',
                  background: '#21262d', border: '1px solid #30363d',
                  borderRadius: 8, color: '#8b949e',
                  cursor: 'pointer', fontSize: 14,
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleTransfer}
                disabled={transferring || !transferTarget.trim()}
                style={{
                  flex: 2, padding: '12px',
                  background: transferring || !transferTarget.trim()
                    ? '#21262d'
                    : 'linear-gradient(135deg, #58a6ff, #1f6feb)',
                  border: 'none', borderRadius: 8,
                  color: transferring || !transferTarget.trim() ? '#8b949e' : '#fff',
                  cursor: transferring || !transferTarget.trim() ? 'not-allowed' : 'pointer',
                  fontSize: 14, fontWeight: 700,
                }}
              >
                {transferring ? '⏳ جارٍ الإرسال...' : `📦 نقل ${Array.from(transferRes).join('+')} → ${transferTarget || '...'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
