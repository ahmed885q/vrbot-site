'use client'
import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type TestResult = {
  name: string
  status: 'pending' | 'running' | 'pass' | 'fail' | 'warn'
  detail: string
  duration?: number
}

const supabase = createSupabaseBrowserClient()

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || ''
}

async function runTest(
  name: string,
  fn: () => Promise<{ ok: boolean; detail: string }>
): Promise<TestResult> {
  const start = Date.now()
  try {
    const result = await fn()
    return {
      name,
      status: result.ok ? 'pass' : 'fail',
      detail: result.detail,
      duration: Date.now() - start,
    }
  } catch (e: any) {
    return { name, status: 'fail', detail: e.message, duration: Date.now() - start }
  }
}

const ALL_TESTS = [
  // ── Auth ──────────────────────────────────────────
  {
    group: '🔐 Auth',
    tests: [
      {
        name: 'Session موجودة',
        fn: async () => {
          const token = await getToken()
          return { ok: !!token, detail: token ? `token: ${token.slice(0,20)}...` : 'لا يوجد session — يجب تسجيل الدخول' }
        }
      },
    ]
  },

  // ── Farms ─────────────────────────────────────────
  {
    group: '🏰 المزارع',
    tests: [
      {
        name: 'جلب قائمة المزارع',
        fn: async () => {
          const token = await getToken()
          const r = await fetch('/api/farms/list', { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) })
          const d = await r.json()
          const count = d.farms?.length || 0
          return { ok: count > 0, detail: `${count} مزرعة — ${d.farms?.map((f:any) => f.farm_name).join(', ')}` }
        }
      },
      {
        name: 'حالة المزارع على Hetzner',
        fn: async () => {
          const r = await fetch('https://cloud.vrbot.me/api/farms/status/live', { headers: { 'X-API-Key': 'vrbot_admin_2026' }, signal: AbortSignal.timeout(8000) })
          const d = await r.json()
          const running = d.farms?.filter((f:any) => f.live_status === 'running').length || 0
          return { ok: r.ok, detail: `${d.farms?.length || 0} مزرعة — ${running} شغّالة` }
        }
      },
    ]
  },

  // ── Screenshot ────────────────────────────────────
  {
    group: '📺 Screenshot & Stream',
    tests: [
      {
        name: 'Screenshot عبر Vercel Proxy',
        fn: async () => {
          const r = await fetch('/api/farms/screenshot?farm_id=jx&t=' + Date.now(), { signal: AbortSignal.timeout(8000) })
          const b = await r.blob()
          return {
            ok: r.ok && b.size > 5000,
            detail: `HTTP:${r.status} type:${r.headers.get('content-type')} size:${b.size.toLocaleString()} bytes`
          }
        }
      },
      {
        name: 'Screenshot مباشر من Hetzner',
        fn: async () => {
          const r = await fetch('https://cloud.vrbot.me/api/screenshot/1?t=' + Date.now(), { headers: { 'X-API-Key': 'vrbot_admin_2026' }, signal: AbortSignal.timeout(6000) })
          const b = await r.blob()
          return {
            ok: r.ok && b.size > 5000,
            detail: `HTTP:${r.status} type:${b.type} size:${b.size.toLocaleString()} bytes`
          }
        }
      },
      {
        name: 'Screenshot يتحدث (cache-busting)',
        fn: async () => {
          const r1 = await fetch('/api/farms/screenshot?farm_id=jx&t=' + Date.now())
          const b1 = await r1.blob()
          await new Promise(r => setTimeout(r, 2500))
          const r2 = await fetch('/api/farms/screenshot?farm_id=jx&t=' + Date.now())
          const b2 = await r2.blob()
          const changed = b1.size !== b2.size
          return {
            ok: b1.size > 5000 && b2.size > 5000,
            detail: `صورة 1: ${b1.size} | صورة 2: ${b2.size} | ${changed ? '✅ تغيّرت' : '⚠️ لم تتغير (اللعبة ثابتة؟)'}`
          }
        }
      },
    ]
  },

  // ── ADB Control ───────────────────────────────────
  {
    group: '🎮 التحكم ADB',
    tests: [
      {
        name: 'ADB key:HOME',
        fn: async () => {
          const token = await getToken()
          const r = await fetch('/api/farms/adb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ farm_id: 'jx', command: 'key:HOME' }),
            signal: AbortSignal.timeout(8000)
          })
          const d = await r.json()
          return { ok: d.ok, detail: `device:${d.device} error:${d.error || 'none'}` }
        }
      },
      {
        name: 'ADB key:BACK',
        fn: async () => {
          const token = await getToken()
          const r = await fetch('/api/farms/adb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ farm_id: 'jx', command: 'key:BACK' }),
            signal: AbortSignal.timeout(8000)
          })
          const d = await r.json()
          return { ok: d.ok, detail: `device:${d.device} error:${d.error || 'none'}` }
        }
      },
      {
        name: 'ADB tap:640,360 (وسط الشاشة)',
        fn: async () => {
          const token = await getToken()
          const r = await fetch('/api/farms/adb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ farm_id: 'jx', command: 'tap:640,360' }),
            signal: AbortSignal.timeout(8000)
          })
          const d = await r.json()
          return { ok: d.ok, detail: `device:${d.device} error:${d.error || 'none'}` }
        }
      },
    ]
  },

  // ── Game Launch ───────────────────────────────────
  {
    group: '🚀 تشغيل اللعبة',
    tests: [
      {
        name: 'Launch endpoint موجود',
        fn: async () => {
          const token = await getToken()
          const r = await fetch('/api/farms/launch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ farm_id: 'jx' }),
            signal: AbortSignal.timeout(15000)
          })
          const d = await r.json()
          return { ok: r.status !== 404, detail: `HTTP:${r.status} ok:${d.ok} device:${d.device || 'N/A'}` }
        }
      },
    ]
  },

  // ── Tasks ─────────────────────────────────────────
  {
    group: '📋 المهام',
    tests: [
      {
        name: 'Run Tasks endpoint',
        fn: async () => {
          const token = await getToken()
          const r = await fetch('/api/farms/run-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ farm_id: 'jx', tasks: ['Gather Resources'], action: 'start' }),
            signal: AbortSignal.timeout(15000)
          })
          const d = await r.json()
          return { ok: r.status !== 404 && r.status !== 500, detail: `HTTP:${r.status} ok:${d.ok} error:${d.error || 'none'}` }
        }
      },
      {
        name: 'مهام اليوم',
        fn: async () => {
          const r = await fetch('https://cloud.vrbot.me/api/tasks/today', {
            headers: { 'X-API-Key': 'vrbot_admin_2026' },
            signal: AbortSignal.timeout(8000)
          })
          const d = await r.json()
          return { ok: r.ok, detail: `total:${d.total} ok:${d.ok} fail:${d.fail} farms:${d.farms}` }
        }
      },
    ]
  },

  // ── Orchestrator ──────────────────────────────────
  {
    group: '⚙️ Orchestrator',
    tests: [
      {
        name: 'Health check',
        fn: async () => {
          const r = await fetch('https://cloud.vrbot.me/api/health', {
            headers: { 'X-API-Key': 'vrbot_admin_2026' },
            signal: AbortSignal.timeout(5000)
          })
          const d = await r.json()
          return { ok: r.ok && d.status === 'ok', detail: `status:${d.status} version:${d.version}` }
        }
      },
      {
        name: 'ADB devices على السيرفر',
        fn: async () => {
          const r = await fetch('https://cloud.vrbot.me/api/farms/status/live', {
            headers: { 'X-API-Key': 'vrbot_admin_2026' },
            signal: AbortSignal.timeout(8000)
          })
          const d = await r.json()
          const online = d.farms?.filter((f:any) => f.is_online).length || 0
          return { ok: r.ok, detail: `${d.total} أجهزة — ${online} متصلة` }
        }
      },
    ]
  },

  // ── Login ─────────────────────────────────────────
  {
    group: '🔑 صفحة تسجيل الدخول',
    tests: [
      {
        name: 'صفحة /login تعمل',
        fn: async () => {
          const r = await fetch('/login', { signal: AbortSignal.timeout(5000) })
          return { ok: r.ok, detail: `HTTP:${r.status}` }
        }
      },
      {
        name: 'صفحة /dashboard/live تعمل',
        fn: async () => {
          const r = await fetch('/dashboard/live', { signal: AbortSignal.timeout(5000) })
          return { ok: r.ok, detail: `HTTP:${r.status}` }
        }
      },
    ]
  },
]

export default function TestPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)

  const updateResult = useCallback((name: string, result: TestResult) => {
    setResults(prev => ({ ...prev, [name]: result }))
  }, [])

  async function runAllTests() {
    setRunning(true)
    setResults({})
    setProgress(0)

    const allTests = ALL_TESTS.flatMap(g => g.tests)
    setTotal(allTests.length)

    // تشغيل مع تأخير بسيط بين كل اختبار
    for (let i = 0; i < allTests.length; i++) {
      const test = allTests[i]
      updateResult(test.name, { name: test.name, status: 'running', detail: '...' })
      const result = await runTest(test.name, test.fn)
      updateResult(test.name, result)
      setProgress(i + 1)
      await new Promise(r => setTimeout(r, 300))
    }

    setRunning(false)
  }

  const passCount = Object.values(results).filter(r => r.status === 'pass').length
  const failCount = Object.values(results).filter(r => r.status === 'fail').length

  const statusColor = {
    pending: '#4a5060',
    running: '#58a6ff',
    pass: '#3fb950',
    fail: '#f85149',
    warn: '#f59e0b',
  }

  const statusIcon = {
    pending: '○',
    running: '⟳',
    pass: '✅',
    fail: '❌',
    warn: '⚠️',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'monospace', padding: '24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: '#f0a500', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            ⚔️ VRBOT — فحص شامل
          </h1>
          <p style={{ color: '#8b949e', fontSize: 13 }}>
            يختبر كل ميزة تلقائياً على أرض الواقع
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
          <button
            onClick={runAllTests}
            disabled={running}
            style={{
              padding: '10px 24px',
              background: running ? '#21262d' : 'linear-gradient(135deg,#f0a500,#e05c2a)',
              color: running ? '#8b949e' : '#0d1117',
              border: 'none', borderRadius: 8,
              cursor: running ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 700,
            }}
          >
            {running ? `⏳ جارٍ الفحص... (${progress}/${total})` : '▶ ابدأ الفحص الشامل'}
          </button>

          {Object.keys(results).length > 0 && (
            <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
              <span style={{ color: '#3fb950' }}>✅ نجح: {passCount}</span>
              <span style={{ color: '#f85149' }}>❌ فشل: {failCount}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {running && (
          <div style={{ background: '#21262d', borderRadius: 4, height: 6, marginBottom: 20, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg,#f0a500,#e05c2a)',
              width: `${(progress / total) * 100}%`,
              transition: 'width 0.3s',
              borderRadius: 4,
            }} />
          </div>
        )}

        {/* Results */}
        {ALL_TESTS.map(group => (
          <div key={group.group} style={{ marginBottom: 20 }}>
            <h3 style={{ color: '#8b949e', fontSize: 12, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
              {group.group}
            </h3>
            <div style={{ background: '#161b22', borderRadius: 10, border: '1px solid #21262d', overflow: 'hidden' }}>
              {group.tests.map((test, i) => {
                const result = results[test.name]
                const status = result?.status || 'pending'
                return (
                  <div key={test.name} style={{
                    padding: '12px 16px',
                    borderBottom: i < group.tests.length - 1 ? '1px solid #21262d' : 'none',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                  }}>
                    <span style={{ color: statusColor[status], fontSize: 16, minWidth: 20, marginTop: 1 }}>
                      {status === 'running' ? '⟳' : statusIcon[status]}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3, color: status === 'fail' ? '#f85149' : '#e6edf3' }}>
                        {test.name}
                      </div>
                      {result && (
                        <div style={{ fontSize: 11, color: '#8b949e', wordBreak: 'break-all' }}>
                          {result.detail}
                        </div>
                      )}
                    </div>
                    {result?.duration && (
                      <span style={{ fontSize: 10, color: '#4a5060', minWidth: 50, textAlign: 'right' }}>
                        {result.duration}ms
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Summary */}
        {!running && failCount > 0 && Object.keys(results).length > 0 && (
          <div style={{ background: '#f8514910', border: '1px solid #f8514930', borderRadius: 10, padding: 16, marginTop: 16 }}>
            <h3 style={{ color: '#f85149', fontSize: 13, marginBottom: 8 }}>❌ المشاكل المكتشفة:</h3>
            {Object.values(results).filter(r => r.status === 'fail').map(r => (
              <div key={r.name} style={{ fontSize: 12, color: '#f85149', marginBottom: 4 }}>
                • {r.name}: {r.detail}
              </div>
            ))}
          </div>
        )}

        {!running && failCount === 0 && passCount > 0 && (
          <div style={{ background: '#3fb95010', border: '1px solid #3fb95030', borderRadius: 10, padding: 16, marginTop: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ color: '#3fb950', fontSize: 14, fontWeight: 700 }}>كل الاختبارات نجحت! VRBOT يعمل بشكل مثالي</div>
          </div>
        )}

      </div>
    </div>
  )
}
