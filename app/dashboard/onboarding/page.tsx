'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STEPS = [
  {
    title: 'مرحباً بك في VRBot ⚔️',
    desc: 'منصة إدارة مزارعك السحابية بالذكاء الاصطناعي',
    icon: '🏰',
  },
  {
    title: 'أنشئ مزرعتك الأولى',
    desc: 'اختر اسماً لمزرعتك وسنجهزها لك في السحابة خلال ثوانٍ',
    icon: '🌾',
    action: 'create_farm',
  },
  {
    title: 'تابع البث المباشر',
    desc: 'شاهد مزرعتك تعمل مباشرة وتحكم بها عن بُعد',
    icon: '📺',
  },
  {
    title: 'فعّل الإشعارات',
    desc: 'احصل على تنبيه فوري إذا توقفت مزرعتك أو تعطلت',
    icon: '🔔',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [farmName, setFarmName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(false)

  const current = STEPS[step]

  async function createFarm() {
    if (!farmName.trim()) { setError('أدخل اسم المزرعة'); return }
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/farms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: farmName.trim(), cloud: true }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'حدث خطأ'); setCreating(false); return }
      setCreated(true)
      setCreating(false)
      setTimeout(() => setStep(s => s + 1), 1000)
    } catch {
      setError('تعذر الاتصال بالسيرفر')
      setCreating(false)
    }
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else router.push('/dashboard')
  }

  const isDark = true
  const bg = '#0d1117'
  const card = '#161b22'
  const border = '#21262d'
  const gold = '#f0a500'

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#e6edf3',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', fontFamily: "'Cinzel', sans-serif", padding: 20 }}>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');`}</style>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            width: 40, height: 4, borderRadius: 2,
            background: i <= step ? gold : border,
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Card */}
      <div style={{
        background: card, border: `1px solid ${border}`, borderRadius: 16,
        padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{current.icon}</div>
        <h1 style={{ color: gold, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          {current.title}
        </h1>
        <p style={{ color: '#8b949e', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          {current.desc}
        </p>

        {/* Step 1: Create Farm */}
        {current.action === 'create_farm' && !created && (
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              value={farmName}
              onChange={e => setFarmName(e.target.value)}
              placeholder="اسم المزرعة (مثال: مزرعة الفارس)"
              dir="rtl"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 8,
                background: bg, border: `1px solid ${border}`, color: '#e6edf3',
                fontSize: 14, marginBottom: 12, boxSizing: 'border-box',
              }}
            />
            {error && <p style={{ color: '#f85149', fontSize: 12, marginBottom: 8 }}>{error}</p>}
            <button onClick={createFarm} disabled={creating} style={{
              width: '100%', padding: 12, borderRadius: 8, border: 'none',
              background: creating ? '#30363d' : `linear-gradient(135deg, ${gold}, #e05c2a)`,
              color: creating ? '#8b949e' : bg, fontSize: 15, fontWeight: 700,
              cursor: creating ? 'wait' : 'pointer',
            }}>
              {creating ? '⏳ جارٍ الإنشاء...' : '🌾 أنشئ المزرعة'}
            </button>
          </div>
        )}

        {current.action === 'create_farm' && created && (
          <div style={{ background: '#3fb95015', border: '1px solid #3fb95040',
            borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <p style={{ color: '#3fb950', fontSize: 14, marginTop: 8 }}>
              تم إنشاء المزرعة! جارٍ تجهيزها في السحابة...
            </p>
          </div>
        )}

        {/* Navigation */}
        {(!current.action || created || step === 0 || step >= 2) && (
          <button onClick={next} style={{
            width: '100%', padding: 12, borderRadius: 8, border: 'none',
            background: `linear-gradient(135deg, ${gold}, #e05c2a)`,
            color: bg, fontSize: 15, fontWeight: 700, cursor: 'pointer',
            marginTop: current.action ? 0 : 8,
          }}>
            {step === STEPS.length - 1 ? '🚀 ابدأ الآن' : 'التالي →'}
          </button>
        )}

        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            background: 'none', border: 'none', color: '#8b949e',
            cursor: 'pointer', fontSize: 13, marginTop: 12, padding: 8,
          }}>
            ← رجوع
          </button>
        )}
      </div>

      {/* Skip */}
      <button onClick={() => router.push('/dashboard')} style={{
        background: 'none', border: 'none', color: '#484f58',
        cursor: 'pointer', fontSize: 12, marginTop: 20,
      }}>
        تخطي → الداشبورد
      </button>
    </div>
  )
}
