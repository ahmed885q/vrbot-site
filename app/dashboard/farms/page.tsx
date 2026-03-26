'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Farm = {
  id?: string
  farm_name: string
  game_account: string
  has_password?: boolean
  status: string
  tasks_today?: number
  container_id?: string
  created_at?: string
}

export default function FarmsPage() {
  const [farms, setFarms]       = useState<Farm[]>([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [editFarm, setEditFarm] = useState<Farm | null>(null)
  const [msg, setMsg]           = useState('')
  const [msgType, setMsgType]   = useState<'ok'|'err'>('ok')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)

  // نموذج إضافة / تعديل
  const [formName, setFormName]           = useState('')
  const [formAccount, setFormAccount]     = useState('')
  const [formPassword, setFormPassword]   = useState('')
  const [showPassword, setShowPassword]   = useState(false)

  const supabase = createSupabaseBrowserClient()

  const showMessage = (text: string, type: 'ok'|'err' = 'ok') => {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}
  }, [supabase])

  const loadFarms = useCallback(async () => {
    try {
      const h = await getAuthHeaders()
      const r = await fetch('/api/farms/list', { headers: h })
      const d = await r.json()
      setFarms(d.farms || [])
    } catch {}
    setLoading(false)
  }, [getAuthHeaders])

  useEffect(() => { loadFarms() }, [loadFarms])

  // فتح نموذج الإضافة
  function openAdd() {
    setFormName('')
    setFormAccount('')
    setFormPassword('')
    setShowPassword(false)
    setEditFarm(null)
    setShowAdd(true)
  }

  // فتح نموذج التعديل
  function openEdit(farm: Farm) {
    setFormName(farm.farm_name)
    setFormAccount(farm.game_account || '')
    setFormPassword('')  // لا نعرض الباسورد القديم أبداً
    setShowPassword(false)
    setEditFarm(farm)
    setShowAdd(true)
  }

  // حفظ (إضافة أو تعديل)
  async function handleSave() {
    if (!formName.trim())    return showMessage('اسم المزرعة مطلوب', 'err')
    if (!formAccount.trim()) return showMessage('حساب اللعبة مطلوب', 'err')

    setSaving(true)
    try {
      const h = await getAuthHeaders()

      if (editFarm) {
        // تعديل game_account + game_password
        const r = await fetch('/api/farms/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...h },
          body: JSON.stringify({
            farm_name:     editFarm.farm_name,
            game_account:  formAccount.trim(),
            game_password: formPassword || undefined,
          }),
        })
        const d = await r.json()
        if (d.ok) {
          showMessage('تم تحديث المزرعة')
          setShowAdd(false)
          loadFarms()
        } else {
          showMessage(d.error || 'فشل التحديث', 'err')
        }
      } else {
        // إضافة جديدة — create route يستخدم name و igg_email
        const r = await fetch('/api/farms/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...h },
          body: JSON.stringify({
            name:          formName.trim(),
            igg_email:     formAccount.trim(),
            game_password: formPassword || undefined,
          }),
        })
        const d = await r.json()
        if (d.ok || d.farm) {
          showMessage('تم إضافة المزرعة بنجاح')
          setShowAdd(false)
          loadFarms()
        } else {
          showMessage(d.error || 'فشل الإضافة', 'err')
        }
      }
    } catch (e: any) {
      showMessage(`خطأ: ${e.message}`, 'err')
    }
    setSaving(false)
  }

  // حذف مزرعة
  async function handleDelete(farmName: string) {
    if (!confirm(`هل تريد حذف مزرعة "${farmName}"؟`)) return
    setDeleting(farmName)
    try {
      const h = await getAuthHeaders()
      const r = await fetch(`/api/farms/delete?id=${farmName}`, {
        method: 'DELETE',
        headers: h,
      })
      const d = await r.json()
      if (d.ok) {
        showMessage('تم حذف المزرعة')
        loadFarms()
      } else {
        showMessage(d.error || 'فشل الحذف', 'err')
      }
    } catch (e: any) {
      showMessage(`خطأ: ${e.message}`, 'err')
    }
    setDeleting(null)
  }

  const sc = (s: string) =>
    s === 'running' ? '#10b981' : s === 'provisioning' ? '#f59e0b' : '#64748b'

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '16px 24px', background: '#161b22', borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ color: '#f0a500', fontSize: 20, fontWeight: 700, margin: 0 }}>مزارعي</h1>
          <p style={{ color: '#8b949e', fontSize: 12, margin: '2px 0 0' }}>
            {farms.length} مزرعة مسجّلة
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/dashboard" style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', padding: '8px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>
            الرئيسية
          </Link>
          <Link href="/dashboard/live" style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', padding: '8px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>
            Live
          </Link>
          <button
            onClick={openAdd}
            style={{ background: 'linear-gradient(135deg,#f0a500,#e05c2a)', color: '#0d1117', border: 'none', padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
          >
            + إضافة مزرعة
          </button>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div style={{ padding: '10px 24px', background: msgType === 'ok' ? '#3fb95015' : '#f8514915', borderBottom: `1px solid ${msgType === 'ok' ? '#3fb95040' : '#f8514940'}`, color: msgType === 'ok' ? '#3fb950' : '#f85149', fontSize: 13 }}>
          {msg}
        </div>
      )}

      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#8b949e' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚔️</div>
            <p>جارٍ تحميل مزارعك...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && farms.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🏰</div>
            <h2 style={{ color: '#e6edf3', marginBottom: 8 }}>لا توجد مزارع بعد</h2>
            <p style={{ color: '#8b949e', marginBottom: 24, fontSize: 14 }}>
              أضف مزرعتك الأولى وأدخل حساب اللعبة
            </p>
            <button onClick={openAdd}
              style={{ background: 'linear-gradient(135deg,#f0a500,#e05c2a)', color: '#0d1117', border: 'none', padding: '12px 32px', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
              + إضافة مزرعة
            </button>
          </div>
        )}

        {/* Farms Grid */}
        {!loading && farms.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {farms.map(farm => (
              <div key={farm.farm_name} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: 18, transition: 'border-color 0.2s' }}>

                {/* Farm Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc(farm.status), display: 'inline-block', boxShadow: `0 0 6px ${sc(farm.status)}` }} />
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{farm.farm_name}</span>
                  </div>
                  <span style={{ fontSize: 10, color: sc(farm.status), background: sc(farm.status) + '15', padding: '2px 8px', borderRadius: 4 }}>
                    {farm.status}
                  </span>
                </div>

                {/* Game Account */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 3 }}>حساب اللعبة</div>
                  <div style={{ fontSize: 13, color: farm.game_account ? '#e6edf3' : '#4a5060', background: '#0d1117', padding: '6px 10px', borderRadius: 6, border: '1px solid #21262d', direction: 'ltr' }}>
                    {farm.game_account || '— غير محدد —'}
                  </div>
                </div>

                {/* Password indicator */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 11 }}>
                  <span style={{
                    color: farm.has_password ? '#3fb950' : '#f59e0b',
                    background: farm.has_password ? '#3fb95015' : '#f59e0b15',
                    padding: '2px 8px',
                    borderRadius: 4
                  }}>
                    {farm.has_password ? 'باسورد محفوظ' : 'لا يوجد باسورد'}
                  </span>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 14, fontSize: 12, color: '#8b949e' }}>
                  <span>{farm.tasks_today || 0} مهمة اليوم</span>
                  {farm.container_id && <span>container: {farm.container_id}</span>}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link href="/dashboard/live"
                    style={{ flex: 1, background: '#58a6ff15', border: '1px solid #58a6ff40', color: '#58a6ff', padding: '7px', borderRadius: 6, textDecoration: 'none', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                    Live
                  </Link>
                  <button onClick={() => openEdit(farm)}
                    style={{ flex: 1, background: '#f0a50015', border: '1px solid #f0a50040', color: '#f0a500', padding: '7px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    تعديل
                  </button>
                  <button onClick={() => handleDelete(farm.farm_name)} disabled={deleting === farm.farm_name}
                    style={{ background: '#f8514915', border: '1px solid #f8514940', color: '#f85149', padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                    {deleting === farm.farm_name ? '...' : 'حذف'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal — إضافة / تعديل */}
      {showAdd && (
        <div
          onClick={() => setShowAdd(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#161b22', border: '1px solid #f0a50030', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440 }}>

            <h3 style={{ color: '#f0a500', margin: '0 0 24px', fontSize: 18, fontWeight: 700 }}>
              {editFarm ? 'تعديل المزرعة' : '+ إضافة مزرعة جديدة'}
            </h3>

            {/* Farm Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>
                اسم المزرعة {editFarm && <span style={{ color: '#f85149' }}>(لا يمكن تغييره)</span>}
              </label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                disabled={!!editFarm}
                placeholder="مثال: farm001 أو ahmed_farm"
                dir="ltr"
                style={{ width: '100%', padding: '11px 14px', background: '#0d1117', border: `1px solid ${editFarm ? '#21262d' : '#30363d'}`, borderRadius: 8, color: editFarm ? '#4a5060' : '#e6edf3', fontSize: 14, outline: 'none', boxSizing: 'border-box', cursor: editFarm ? 'not-allowed' : 'text' }}
              />
            </div>

            {/* Game Account */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>
                حساب اللعبة (إيميل Viking Rise)
              </label>
              <input
                value={formAccount}
                onChange={e => setFormAccount(e.target.value)}
                placeholder="player@example.com"
                autoFocus={!!editFarm}
                dir="ltr"
                style={{ width: '100%', padding: '11px 14px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <p style={{ fontSize: 11, color: '#8b949e', margin: '6px 0 0' }}>
                هذا الحساب خاص بك فقط ولا يظهر لأي عميل آخر
              </p>
            </div>

            {/* Game Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>
                باسورد حساب اللعبة
                {editFarm && <span style={{ color: '#8b949e', marginRight: 8 }}> (اتركه فارغاً للإبقاء على القديم)</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder={editFarm ? '••••••••' : 'أدخل باسورد حساب Viking Rise'}
                  dir="ltr"
                  style={{
                    width: '100%',
                    padding: '11px 44px 11px 14px',
                    background: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: 8,
                    color: '#e6edf3',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box' as const,
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#8b949e',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: 0,
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#8b949e', margin: '6px 0 0' }}>
                يُحفظ مشفّراً — لا يظهر لأي شخص آخر
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAdd(false)}
                style={{ flex: 1, padding: '12px', background: '#21262d', border: '1px solid #30363d', borderRadius: 8, color: '#8b949e', cursor: 'pointer', fontSize: 14 }}>
                إلغاء
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 2, padding: '12px', background: saving ? '#21262d' : 'linear-gradient(135deg,#f0a500,#e05c2a)', border: 'none', borderRadius: 8, color: saving ? '#8b949e' : '#0d1117', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700 }}>
                {saving ? 'جارٍ الحفظ...' : editFarm ? 'حفظ التعديل' : '+ إضافة المزرعة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
