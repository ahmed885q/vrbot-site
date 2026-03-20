'use client'
import { useState, useEffect, useCallback } from 'react'

type Farm = {
  id: string
  user_id: string
  farm_name: string
  server_id: string
  game_account: string
  status: string
  created_at: string
  updated_at: string
  email: string
}

export default function AdminFarmsPage() {
  const [farms, setFarms]         = useState<Farm[]>([])
  const [loading, setLoading]     = useState(true)
  const [msg, setMsg]             = useState('')
  const [tab, setTab]             = useState<'list'|'create'|'grant'>('list')
  const [search, setSearch]       = useState('')
  const [actionLoading, setAL]    = useState(false)

  // Create form
  const [cEmail, setCEmail]       = useState('')
  const [cName, setCName]         = useState('')
  const [cGame, setCGame]         = useState('')
  const [cPass, setCPass]         = useState('')

  // Grant form
  const [gEmail, setGEmail]       = useState('')
  const [gCount, setGCount]       = useState(1)
  const [gDays, setGDays]         = useState(30)

  // Edit modal
  const [editFarm, setEditFarm]   = useState<Farm | null>(null)
  const [editName, setEditName]   = useState('')
  const [editGame, setEditGame]   = useState('')
  const [editStatus, setEditStatus] = useState('')

  const showMsg = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 5000)
  }

  const loadFarms = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/farms')
      const d = await res.json()
      setFarms(d.farms || [])
    } catch { showMsg('❌ فشل تحميل المزارع') }
    setLoading(false)
  }, [])

  useEffect(() => { loadFarms() }, [loadFarms])

  async function apiCall(body: any) {
    setAL(true)
    try {
      const res = await fetch('/api/admin/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (d.ok) {
        showMsg(`✅ ${d.message || 'تم بنجاح'}`)
        loadFarms()
      } else {
        showMsg(`❌ ${d.error || 'فشلت العملية'}`)
      }
      return d
    } catch {
      showMsg('❌ خطأ في الاتصال')
    }
    setAL(false)
  }

  async function handleCreate() {
    if (!cName.trim()) return showMsg('⚠️ أدخل اسم المزرعة')
    await apiCall({
      action: 'create',
      user_email: cEmail.trim() || undefined,
      farm_name: cName.trim(),
      game_account: cGame.trim() || undefined,
      igg_password: cPass.trim() || undefined,
    })
    setCName(''); setCGame(''); setCPass('')
    setAL(false)
  }

  async function handleGrant() {
    if (!gEmail.trim()) return showMsg('⚠️ أدخل بريد المستخدم')
    await apiCall({
      action: 'grant',
      user_email: gEmail.trim(),
      count: gCount,
      days: gDays,
    })
    setAL(false)
  }

  async function handleDelete(farmId: string, farmName: string) {
    if (!confirm(`هل تريد حذف المزرعة ${farmName}؟`)) return
    await apiCall({ action: 'delete', farm_id: farmId })
    setAL(false)
  }

  async function handleUpdate() {
    if (!editFarm) return
    await apiCall({
      action: 'update',
      farm_id: editFarm.id,
      farm_name: editName || undefined,
      game_account: editGame,
      status: editStatus || undefined,
    })
    setEditFarm(null)
    setAL(false)
  }

  function openEdit(f: Farm) {
    setEditFarm(f)
    setEditName(f.farm_name)
    setEditGame(f.game_account || '')
    setEditStatus(f.status)
  }

  const filtered = farms.filter(f =>
    !search || f.farm_name.toLowerCase().includes(search.toLowerCase()) ||
    f.email.toLowerCase().includes(search.toLowerCase()) ||
    f.game_account?.toLowerCase().includes(search.toLowerCase())
  )

  const sc = (s: string) =>
    s === 'running' ? '#3fb950' : s === 'provisioning' ? '#f59e0b' : s === 'stopped' ? '#f85149' : '#8b949e'

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: '#0d1117', border: '1px solid #30363d',
    borderRadius: 8, color: '#e6edf3', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
    marginBottom: 12,
  }

  const btnStyle = (bg: string, color: string): React.CSSProperties => ({
    padding: '10px 20px', background: bg, color,
    border: 'none', borderRadius: 8, cursor: 'pointer',
    fontSize: 14, fontWeight: 700,
  })

  return (
    <div style={{ color: '#e6edf3', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#f0a500', fontSize: 22, fontWeight: 700, margin: 0 }}>🏰 إدارة المزارع</h1>
          <p style={{ color: '#8b949e', fontSize: 13, margin: '4px 0 0' }}>
            إجمالي: {farms.length} · شغّالة: {farms.filter(f => f.status === 'running').length} · متوقفة: {farms.filter(f => f.status === 'stopped').length}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['list', 'create', 'grant'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 16px',
                background: tab === t ? '#f0a500' : '#21262d',
                color: tab === t ? '#0d1117' : '#8b949e',
                border: '1px solid #30363d',
                borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700,
              }}
            >
              {t === 'list' ? '📋 المزارع' : t === 'create' ? '➕ إنشاء' : '🎁 منح'}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
          background: msg.startsWith('✅') ? '#3fb95015' : msg.startsWith('⚠️') ? '#f59e0b15' : '#f8514915',
          border: `1px solid ${msg.startsWith('✅') ? '#3fb95040' : msg.startsWith('⚠️') ? '#f59e0b40' : '#f8514940'}`,
          color: msg.startsWith('✅') ? '#3fb950' : msg.startsWith('⚠️') ? '#f59e0b' : '#f85149',
        }}>
          {msg}
        </div>
      )}

      {/* ═══ Tab: Farms List ═══ */}
      {tab === 'list' && (
        <div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 ابحث باسم المزرعة أو البريد..."
            style={{ ...inputStyle, marginBottom: 16 }}
          />

          {loading ? (
            <p style={{ color: '#8b949e', textAlign: 'center', padding: 40 }}>⏳ جارٍ التحميل...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: '#8b949e', textAlign: 'center', padding: 40 }}>لا توجد مزارع</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(f => (
                <div key={f.id} style={{
                  background: '#161b22', border: '1px solid #21262d',
                  borderRadius: 10, padding: 16,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexWrap: 'wrap', gap: 12,
                }}>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: sc(f.status), display: 'inline-block' }} />
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{f.farm_name}</span>
                      <span style={{ fontSize: 11, color: sc(f.status), background: sc(f.status) + '15', padding: '2px 8px', borderRadius: 4 }}>{f.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#8b949e', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>👤 {f.email}</span>
                      <span>📧 {f.game_account || '—'}</span>
                      <span>🖥️ {f.server_id}</span>
                      <span>📅 {new Date(f.created_at).toLocaleDateString('ar')}</span>
                    </div>
                  </div>

                  {/* Actions */}
<div style={{ display: 'flex', gap: 6 }}>
  <button onClick={() => openEdit(f)} style={btnStyle('#58a6ff20', '#58a6ff')}>✏️</button>
  {f.status === 'error' && (
    <button
      onClick={() => apiCall({ action: 'update', farm_id: f.id, status: 'stopped' })}
      disabled={actionLoading}
      title="إعادة تعيين الخطأ"
      style={{
        ...btnStyle('#f59e0b20', '#f59e0b'),
        fontSize: 13,
        padding: '6px 12px',
        fontWeight: 700,
        opacity: actionLoading ? 0.5 : 1,
      }}
    >
      🔄 Reset
    </button>
  )}
  <button onClick={() => handleDelete(f.id, f.farm_name)} style={btnStyle('#f8514920', '#f85149')}>🗑️</button>
</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Tab: Create Farm ═══ */}
      {tab === 'create' && (
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: 24, maxWidth: 500 }}>
          <h3 style={{ color: '#3fb950', margin: '0 0 20px', fontSize: 16 }}>➕ إنشاء مزرعة جديدة (بدون دفع)</h3>

          <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>
            📧 بريد المستخدم (اختياري — الافتراضي: أنت)
          </label>
          <input value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="user@email.com" style={inputStyle} />

          <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>
            🏰 اسم المزرعة *
          </label>
          <input value={cName} onChange={e => setCName(e.target.value)} placeholder="farm-001" style={inputStyle} />

          <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>
            🎮 حساب اللعبة (بريد IGG)
          </label>
          <input value={cGame} onChange={e => setCGame(e.target.value)} placeholder="igg@email.com" style={inputStyle} />

          <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>
            🔑 كلمة مرور IGG
          </label>
          <input value={cPass} onChange={e => setCPass(e.target.value)} placeholder="password" type="password" style={inputStyle} />

          <button onClick={handleCreate} disabled={actionLoading} style={{
            ...btnStyle('linear-gradient(135deg, #3fb950, #059669)', '#fff'),
            width: '100%', opacity: actionLoading ? 0.5 : 1,
          }}>
            {actionLoading ? '⏳ جارٍ الإنشاء...' : '➕ إنشاء المزرعة'}
          </button>
        </div>
      )}

      {/* ═══ Tab: Grant Farms ═══ */}
      {tab === 'grant' && (
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: 24, maxWidth: 500 }}>
          <h3 style={{ color: '#f0a500', margin: '0 0 20px', fontSize: 16 }}>🎁 منح مزارع لمستخدم (مجاناً)</h3>

          <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>
            📧 بريد المستخدم *
          </label>
          <input value={gEmail} onChange={e => setGEmail(e.target.value)} placeholder="user@email.com" style={inputStyle} />

          <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>
            🏰 عدد المزارع
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[1, 3, 5, 10, 20].map(n => (
              <button
                key={n}
                onClick={() => setGCount(n)}
                style={{
                  padding: '8px 16px',
                  background: gCount === n ? '#f0a500' : '#0d1117',
                  color: gCount === n ? '#0d1117' : '#8b949e',
                  border: `1px solid ${gCount === n ? '#f0a500' : '#30363d'}`,
                  borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>
            📅 مدة الاشتراك (أيام)
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[7, 14, 30, 60, 90, 365].map(d => (
              <button
                key={d}
                onClick={() => setGDays(d)}
                style={{
                  padding: '8px 12px',
                  background: gDays === d ? '#8b5cf6' : '#0d1117',
                  color: gDays === d ? '#fff' : '#8b949e',
                  border: `1px solid ${gDays === d ? '#8b5cf6' : '#30363d'}`,
                  borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12,
                }}
              >
                {d}d
              </button>
            ))}
          </div>

          <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: '#8b949e' }}>
            📋 ملخص: منح <strong style={{ color: '#f0a500' }}>{gCount}</strong> مزرعة لـ <strong style={{ color: '#58a6ff' }}>{gEmail || '...'}</strong> لمدة <strong style={{ color: '#8b5cf6' }}>{gDays} يوم</strong> مجاناً
          </div>

          <button onClick={handleGrant} disabled={actionLoading} style={{
            ...btnStyle('linear-gradient(135deg, #f0a500, #e05c2a)', '#0d1117'),
            width: '100%', opacity: actionLoading ? 0.5 : 1,
          }}>
            {actionLoading ? '⏳ جارٍ المنح...' : `🎁 منح ${gCount} مزرعة`}
          </button>
        </div>
      )}

      {/* ═══ Edit Modal ═══ */}
      {editFarm && (
        <div
          onClick={() => setEditFarm(null)}
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
              background: '#161b22', border: '1px solid #58a6ff30',
              borderRadius: 16, padding: 28, width: '100%', maxWidth: 440,
            }}
          >
            <h3 style={{ color: '#58a6ff', margin: '0 0 20px', fontSize: 16 }}>
              ✏️ تعديل: {editFarm.farm_name}
            </h3>

            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>اسم المزرعة</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} />

            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>حساب اللعبة</label>
            <input value={editGame} onChange={e => setEditGame(e.target.value)} style={inputStyle} />

            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>الحالة</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['provisioning', 'running', 'stopped', 'error', 'deleted'].map(s => (
                <button
                  key={s}
                  onClick={() => setEditStatus(s)}
                  style={{
                    padding: '6px 12px',
                    background: editStatus === s ? sc(s) + '20' : '#0d1117',
                    border: `2px solid ${editStatus === s ? sc(s) : '#30363d'}`,
                    borderRadius: 6, color: editStatus === s ? sc(s) : '#8b949e',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditFarm(null)} style={{ ...btnStyle('#21262d', '#8b949e'), flex: 1, border: '1px solid #30363d' }}>
                إلغاء
              </button>
              <button onClick={handleUpdate} disabled={actionLoading} style={{ ...btnStyle('linear-gradient(135deg, #58a6ff, #1f6feb)', '#fff'), flex: 2 }}>
                {actionLoading ? '⏳...' : '💾 حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
