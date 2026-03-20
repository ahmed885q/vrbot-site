'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'

function usePager<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil((items?.length || 0) / pageSize))
  const paged = useMemo(() => (items || []).slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize])
  useEffect(() => { setPage(1) }, [items?.length])
  return { page, setPage, totalPages, total: items?.length || 0, paged, pageSize }
}

function Pager({ page, totalPages, total, pageSize, setPage }: any) {
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #2a2a3a', marginTop: '8px' }}>
      <span style={{ fontSize: '12px', color: '#666' }}>{((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}</span>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => setPage(1)} disabled={page === 1} style={{ padding: '4px 8px', background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '4px', color: page === 1 ? '#444' : '#888', cursor: page === 1 ? 'default' : 'pointer', fontSize: '12px' }}>«</button>
        <button onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '4px 8px', background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '4px', color: page === 1 ? '#444' : '#888', cursor: page === 1 ? 'default' : 'pointer', fontSize: '12px' }}>‹</button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p = page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
          p = Math.max(1, Math.min(totalPages, p))
          return <button key={p} onClick={() => setPage(p)} style={{ padding: '4px 8px', background: p === page ? '#3b82f6' : '#1a1a2e', border: '1px solid ' + (p === page ? '#3b82f6' : '#2a2a3a'), borderRadius: '4px', color: p === page ? '#fff' : '#888', cursor: 'pointer', fontSize: '12px' }}>{p}</button>
        })}
        <button onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '4px 8px', background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '4px', color: page === totalPages ? '#444' : '#888', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '12px' }}>›</button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ padding: '4px 8px', background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '4px', color: page === totalPages ? '#444' : '#888', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '12px' }}>»</button>
      </div>
    </div>
  )
}

export default function DiagnosticsPage() {
  const [data, setData]               = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [msg, setMsg]                 = useState('')
  const [err, setErr]                 = useState('')
  const [tab, setTab]                 = useState('farms')
  const [keyCount, setKeyCount]       = useState(5)
  const [keyTag, setKeyTag]           = useState('')
  const [keyNote, setKeyNote]         = useState('')
  const [genCodes, setGenCodes]       = useState<string[]>([])
  const [userSearch, setUserSearch]   = useState('')
  const [farmSearch, setFarmSearch]   = useState('')
  const [subSearch, setSubSearch]     = useState('')
  const [keySearch, setKeySearch]     = useState('')
  const [retryData, setRetryData]     = useState<any>(null)
  const [retryLoading, setRetryLoading] = useState(false)
  const [agentData, setAgentData]     = useState<any>(null)
  const [agentLoading, setAgentLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/diagnostics')
      setData(await res.json())
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchRetryData = useCallback(async () => {
    setRetryLoading(true)
    try {
      const res = await fetch('/api/admin/smart-retry')
      setRetryData(await res.json())
    } catch (e: any) { setErr(e.message) }
    finally { setRetryLoading(false) }
  }, [])

  useEffect(() => { if (tab === 'smart_retry') fetchRetryData() }, [tab, fetchRetryData])

  const fetchAgentData = useCallback(async () => {
    setAgentLoading(true)
    try {
      const [farmsRes, batchRes, tasksRes] = await Promise.allSettled([
        fetch('https://cloud.vrbot.me/api/farms/status', { headers: { 'X-API-Key': 'vrbot_admin_2026' } }),
        fetch('https://cloud.vrbot.me/api/batch/status', { headers: { 'X-API-Key': 'vrbot_admin_2026' } }),
        fetch('https://cloud.vrbot.me/api/tasks/today',  { headers: { 'X-API-Key': 'vrbot_admin_2026' } }),
      ])
      const farms = farmsRes.status === 'fulfilled' && farmsRes.value.ok ? await farmsRes.value.json() : {}
      const batch = batchRes.status === 'fulfilled' && batchRes.value.ok ? await batchRes.value.json() : {}
      const tasks = tasksRes.status === 'fulfilled' && tasksRes.value.ok ? await tasksRes.value.json() : {}
      setAgentData({ farms, batch, tasks, ts: new Date().toLocaleTimeString('ar') })
    } catch(e) { console.error(e) }
    finally { setAgentLoading(false) }
  }, [])

  useEffect(() => { if (tab === 'agent' || tab === 'discord') fetchAgentData() }, [tab, fetchAgentData])

  async function doAction(action: string, params: Record<string, any> = {}) {
    setMsg(''); setErr(''); setGenCodes([])
    try {
      const res = await fetch('/api/admin/diagnostics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...params }) })
      const json = await res.json()
      if (json.error) setErr(json.error)
      else { setMsg(json.message || 'Done'); if (json.codes) setGenCodes(json.codes); await fetchData() }
    } catch (e: any) { setErr(e.message) }
  }

  async function deleteRetrySolution(id: number) {
    if (!confirm('حذف هذا الحل؟')) return
    try {
      await fetch('/api/admin/smart-retry', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      fetchRetryData()
    } catch (e: any) { setErr(e.message) }
  }

  function timeAgo(d: string) {
    if (!d) return '-'
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    if (m < 1) return 'now'; if (m < 60) return m + 'm'
    const h = Math.floor(m / 60)
    if (h < 24) return h + 'h'; return Math.floor(h / 24) + 'd'
  }
  function shortDate(d: string) {
    return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'
  }
  function copyText(t: string) { navigator.clipboard.writeText(t); setMsg('Copied!') }

  const filteredFarms = useMemo(() => (data?.farms || []).filter((f: any) => !farmSearch || f.user_email?.toLowerCase().includes(farmSearch.toLowerCase()) || f.id?.toLowerCase().includes(farmSearch.toLowerCase())), [data?.farms, farmSearch])
  const filteredUsers = useMemo(() => (data?.users || []).filter((u: any) => !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase())), [data?.users, userSearch])
  const filteredSubs  = useMemo(() => (data?.subscriptions || []).filter((s: any) => !subSearch || s.email?.toLowerCase().includes(subSearch.toLowerCase())), [data?.subscriptions, subSearch])
  const filteredKeys  = useMemo(() => (data?.proKeys || []).filter((k: any) => !keySearch || k.code?.toLowerCase().includes(keySearch.toLowerCase()) || k.tag?.toLowerCase().includes(keySearch.toLowerCase())), [data?.proKeys, keySearch])

  const farmsPager  = usePager(filteredFarms, 20)
  const usersPager  = usePager(filteredUsers, 20)
  const subsPager   = usePager(filteredSubs, 20)
  const keysPager   = usePager(filteredKeys, 20)
  const tokensPager = usePager(data?.tokens || [], 20)

  const S = {
    page:     { minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0', fontFamily: 'Segoe UI, sans-serif', padding: '24px' } as React.CSSProperties,
    card:     { background: '#141420', border: '1px solid #2a2a3a', borderRadius: '12px', padding: '20px', marginBottom: '16px' } as React.CSSProperties,
    btn:      (bg: string, c: string) => ({ padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: bg, color: c }) as React.CSSProperties,
    tabStyle: (a: boolean) => ({ padding: '10px 16px', background: a ? '#3b82f6' : '#1a1a2e', color: a ? '#fff' : '#888', border: a ? '1px solid #3b82f6' : '1px solid #2a2a3a', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: '13px', fontWeight: a ? 700 : 400 }) as React.CSSProperties,
    th:       { padding: '10px 12px', borderBottom: '1px solid #2a2a3a', textAlign: 'left' as const, fontSize: '12px', color: '#888', fontWeight: 600 } as React.CSSProperties,
    td:       { padding: '10px 12px', borderBottom: '1px solid #1a1a2a', fontSize: '13px' } as React.CSSProperties,
    badge:    (c: string, bg: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: c, background: bg }) as React.CSSProperties,
    stat:     (c: string) => ({ background: c + '10', border: '1px solid ' + c + '30', borderRadius: '10px', padding: '16px', textAlign: 'center' as const, flex: '1', minWidth: '120px' }) as React.CSSProperties,
    input:    { padding: '8px 12px', background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '6px', color: '#e0e0e0', fontSize: '13px' } as React.CSSProperties,
    filterBtn:(a: boolean) => ({ padding: '4px 10px', border: '1px solid ' + (a ? '#a855f7' : '#2a2a3a'), borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: a ? 700 : 400, background: a ? '#a855f720' : 'transparent', color: a ? '#a855f7' : '#888' }) as React.CSSProperties,
  }

  if (loading && !data) return (
    <div style={{ ...S.page, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontSize: '20px', color: '#888' }}>Loading...</div>
    </div>
  )

  const hub   = data?.hub   ?? {}
  const stats = data?.stats ?? {}
  const hubOn = !hub.error && hub.status !== 'offline'
  const srcColors: Record<string, string> = { discovered: '#ffd166', cloud: '#4ecdc4', local: '#888888' }
  const srcLabels: Record<string, string> = { discovered: '✦ مكتشف', cloud: '☁ سحابي', local: '◆ محلي' }

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>System Diagnostics</h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: '14px' }}>VRBOT Admin Control Panel</p>
        </div>
        <button onClick={fetchData} style={S.btn('#3b82f6', '#fff')} disabled={loading}>{loading ? '...' : '↻ Refresh'}</button>
      </div>

      {msg && <div style={{ ...S.card, background: '#052e16', borderColor: '#22c55e40', color: '#4ade80', padding: '12px', marginBottom: '12px' }}>{msg}</div>}
      {err && <div style={{ ...S.card, background: '#2a0a0a', borderColor: '#ef444440', color: '#f87171', padding: '12px', marginBottom: '12px' }}>{err}</div>}

      <div style={{ ...S.card, borderColor: hubOn ? '#22c55e40' : '#ef444440' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: hubOn ? '#22c55e' : '#ef4444', boxShadow: hubOn ? '0 0 12px #22c55e80' : '0 0 12px #ef444480' }} />
            <span style={{ fontWeight: 700, color: hubOn ? '#4ade80' : '#f87171' }}>Hub: {hubOn ? 'Online' : 'Offline'}</span>
          </div>
          {hubOn && (<>
            <span style={{ fontSize: '13px', color: '#888' }}>Connections: <b style={{ color: '#e0e0e0' }}>{hub.connections ?? 0}</b></span>
            <span style={{ fontSize: '13px', color: '#888' }}>Agents: <b style={{ color: '#e0e0e0' }}>{hub.agents ?? 0}</b></span>
            <span style={{ fontSize: '13px', color: '#888' }}>Dashboards: <b style={{ color: '#e0e0e0' }}>{hub.dashboards ?? 0}</b></span>
            <span style={{ fontSize: '13px', color: '#888' }}>Uptime: <b style={{ color: '#e0e0e0' }}>{hub.uptime ?? '-'}</b></span>
          </>)}
          {!hubOn && <span style={{ fontSize: '12px', color: '#666' }}>{hub.error || 'Cannot reach hub'}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { l: 'Users', v: stats.totalUsers ?? 0, c: '#3b82f6' },
          { l: 'Active Subs', v: stats.activeSubs ?? 0, c: '#22c55e' },
          { l: 'Farms', v: stats.totalFarms ?? 0, c: '#a855f7' },
          { l: 'Active Farms', v: stats.activeFarms ?? 0, c: '#06b6d4' },
          { l: 'Tokens Issued', v: stats.tokensIssued ?? 0, c: '#f59e0b' },
          { l: 'Pro Keys', v: stats.totalProKeys ?? 0, c: '#ec4899' },
          { l: 'Revenue', v: '$' + (stats.totalRevenue ?? 0), c: '#10b981' },
        ].map((s, i) => (
          <div key={i} style={S.stat(s.c)}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '0' }}>
        {[
          { k: 'farms',       l: 'Farms',         n: data?.farms?.length },
          { k: 'tokens',      l: 'Tokens',        n: data?.tokens?.length },
          { k: 'subs',        l: 'Subscriptions', n: data?.subscriptions?.length },
          { k: 'proKeys',     l: 'Pro Keys',      n: data?.proKeys?.length },
          { k: 'users',       l: 'Users',         n: data?.users?.length },
          { k: 'protection',  l: 'Protection',    n: null },
          { k: 'smart_retry', l: '🧠 Smart Retry', n: retryData?.total_solutions ?? null },
          { k: 'agent',       l: '🤖 Ultra Agent', n: null },
          { k: 'discord',     l: '🎮 Discord',     n: null },
        ].map(t => (
          <button key={t.k} style={S.tabStyle(tab === t.k)} onClick={() => setTab(t.k)}>
            {t.l}{t.n != null ? <span style={{ marginLeft: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '1px 6px', fontSize: '11px' }}>{t.n}</span> : null}
          </button>
        ))}
      </div>

      <div style={{ ...S.card, borderRadius: '0 12px 12px 12px', marginTop: '0' }}>

        {tab === 'farms' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Search by email or farm ID..." value={farmSearch} onChange={e => setFarmSearch(e.target.value)} style={{ ...S.input, minWidth: '240px' }} />
              <span style={{ fontSize: '12px', color: '#666' }}>{filteredFarms.length} farms</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Email', 'Farm ID', 'Name', 'Bot', 'Status', 'Last Activity', 'Actions'].map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {farmsPager.paged.map((f: any) => (
                  <tr key={f.id}>
                    <td style={S.td}><span style={{ fontSize: '12px' }}>{f.user_email}</span></td>
                    <td style={{ ...S.td, fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>{f.id?.slice(0, 8)}...</td>
                    <td style={S.td}>{f.name || '-'}</td>
                    <td style={S.td}><span style={f.bot_enabled ? S.badge('#4ade80', '#052e16') : S.badge('#888', '#1a1a2a')}>{f.bot_enabled ? 'ON' : 'OFF'}</span></td>
                    <td style={S.td}><span style={S.badge('#888', '#1a1a2a')}>{f.bot_status || 'idle'}</span></td>
                    <td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{timeAgo(f.last_bot_activity)}</td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {f.bot_enabled ? <button style={S.btn('#f59e0b', '#000')} onClick={() => doAction('disable_farm', { farmId: f.id })}>Disable</button> : <button style={S.btn('#22c55e', '#fff')} onClick={() => doAction('enable_farm', { farmId: f.id })}>Enable</button>}
                        <button style={S.btn('#ef4444', '#fff')} onClick={() => { if (confirm('Delete farm?')) doAction('delete_farm', { farmId: f.id }) }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={farmsPager.page} totalPages={farmsPager.totalPages} total={farmsPager.total} pageSize={farmsPager.pageSize} setPage={farmsPager.setPage} />
          </div>
        )}

        {tab === 'tokens' && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Email', 'Total', 'Used', 'Remaining', 'Trial', 'Actions'].map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {tokensPager.paged.map((tk: any) => (
                  <tr key={tk.user_id}>
                    <td style={S.td}><span style={{ fontSize: '12px' }}>{tk.email}</span></td>
                    <td style={{ ...S.td, fontWeight: 700, color: '#3b82f6' }}>{tk.tokens_total}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: '#f59e0b' }}>{tk.tokens_used}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: '#22c55e' }}>{tk.tokens_total - tk.tokens_used}</td>
                    <td style={S.td}><span style={tk.trial_granted ? S.badge('#f59e0b', '#2a1a00') : S.badge('#888', '#1a1a2a')}>{tk.trial_granted ? 'Yes' : 'No'}</span></td>
                    <td style={S.td}><button style={S.btn('#f59e0b', '#000')} onClick={() => doAction('reset_tokens', { userId: tk.user_id })}>Reset</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={tokensPager.page} totalPages={tokensPager.totalPages} total={tokensPager.total} pageSize={tokensPager.pageSize} setPage={tokensPager.setPage} />
          </div>
        )}

        {tab === 'subs' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Search by email..." value={subSearch} onChange={e => setSubSearch(e.target.value)} style={{ ...S.input, minWidth: '240px' }} />
              <span style={{ fontSize: '12px', color: '#666' }}>{filteredSubs.length} subscriptions</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Email', 'Plan', 'Status', 'Expires', 'Source', 'Actions'].map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {subsPager.paged.map((sub: any) => {
                  const on  = sub.status === 'active'
                  const src = sub.stripe_customer_id === 'admin_manual' ? 'Manual' : sub.pro_key_code ? 'Pro Key' : sub.stripe_customer_id?.startsWith('cus_') ? 'Stripe' : 'PayPal'
                  return (
                    <tr key={sub.id}>
                      <td style={S.td}><span style={{ fontSize: '12px' }}>{sub.email}</span></td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{sub.plan || '-'}</td>
                      <td style={S.td}><span style={on ? S.badge('#4ade80', '#052e16') : S.badge('#f87171', '#2a0a0a')}>{sub.status}</span></td>
                      <td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{shortDate(sub.expires_at)}</td>
                      <td style={S.td}><span style={S.badge('#888', '#1a1a2a')}>{src}</span></td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {on ? <button style={S.btn('#ef4444', '#fff')} onClick={() => doAction('cancel_subscription', { subId: sub.id })}>Cancel</button> : <button style={S.btn('#22c55e', '#fff')} onClick={() => doAction('activate_subscription', { subId: sub.id })}>Activate</button>}
                          <button style={S.btn('#3b82f6', '#fff')} onClick={() => doAction('extend_subscription', { subId: sub.id, days: 30 })}>+30d</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <Pager page={subsPager.page} totalPages={subsPager.totalPages} total={subsPager.total} pageSize={subsPager.pageSize} setPage={subsPager.setPage} />
          </div>
        )}

        {tab === 'proKeys' && (
          <div>
            <div style={{ ...S.card, background: '#0d1117', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, marginBottom: '12px', color: '#a855f7' }}>Generate Pro Keys</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div><div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Count</div><input type="number" min={1} max={100} value={keyCount} onChange={e => setKeyCount(+e.target.value)} style={{ ...S.input, width: '70px' }} /></div>
                <div><div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Tag</div><input placeholder="e.g. beta" value={keyTag} onChange={e => setKeyTag(e.target.value)} style={{ ...S.input, width: '120px' }} /></div>
                <div><div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Note</div><input placeholder="Optional note" value={keyNote} onChange={e => setKeyNote(e.target.value)} style={{ ...S.input, width: '200px' }} /></div>
                <button style={S.btn('#a855f7', '#fff')} onClick={() => doAction('generate_pro_keys', { count: keyCount, tag: keyTag, note: keyNote })}>Generate</button>
              </div>
              {genCodes.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>{genCodes.length} keys generated</span>
                    <button style={S.btn('#3b82f6', '#fff')} onClick={() => copyText(genCodes.join('\n'))}>Copy All</button>
                  </div>
                  <div style={{ background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: '6px', padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#a855f7', maxHeight: '120px', overflowY: 'auto' }}>
                    {genCodes.map((c, i) => <div key={i}>{c}</div>)}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Search by code or tag..." value={keySearch} onChange={e => setKeySearch(e.target.value)} style={{ ...S.input, minWidth: '240px' }} />
              <span style={{ fontSize: '12px', color: '#666' }}>{filteredKeys.length} keys</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Code', 'Tag', 'Status', 'Redeemed By', 'Redeemed At', 'Note', 'Actions'].map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {keysPager.paged.map((k: any) => (
                  <tr key={k.id}>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '12px', color: '#a855f7' }}><span style={{ cursor: 'pointer' }} onClick={() => copyText(k.code)}>{k.code}</span></td>
                    <td style={S.td}>{k.tag || '-'}</td>
                    <td style={S.td}><span style={k.is_redeemed ? S.badge('#888', '#1a1a2a') : S.badge('#4ade80', '#052e16')}>{k.is_redeemed ? 'Used' : 'Available'}</span></td>
                    <td style={{ ...S.td, fontSize: '12px' }}>{k.redeemed_by_email || '-'}</td>
                    <td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{shortDate(k.redeemed_at)}</td>
                    <td style={{ ...S.td, fontSize: '12px', color: '#666' }}>{k.note || '-'}</td>
                    <td style={S.td}>{!k.is_redeemed && <button style={S.btn('#ef4444', '#fff')} onClick={() => { if (confirm('Revoke key?')) doAction('revoke_pro_key', { keyId: k.id }) }}>Revoke</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={keysPager.page} totalPages={keysPager.totalPages} total={keysPager.total} pageSize={keysPager.pageSize} setPage={keysPager.setPage} />
          </div>
        )}

        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Search by email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ ...S.input, minWidth: '240px' }} />
              <span style={{ fontSize: '12px', color: '#666' }}>{filteredUsers.length} users</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Email', 'Registered', 'Last Login', 'Status', 'Actions'].map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {usersPager.paged.map((u: any) => (
                  <tr key={u.id}>
                    <td style={S.td}>{u.email}</td>
                    <td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{shortDate(u.created_at)}</td>
                    <td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{timeAgo(u.last_sign_in)}</td>
                    <td style={S.td}><span style={u.banned ? S.badge('#f87171', '#2a0a0a') : S.badge('#4ade80', '#052e16')}>{u.banned ? 'Banned' : 'Active'}</span></td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {u.banned ? <button style={S.btn('#22c55e', '#fff')} onClick={() => doAction('unban_user', { userId: u.id })}>Unban</button> : <button style={S.btn('#f59e0b', '#000')} onClick={() => doAction('ban_user', { userId: u.id })}>Ban</button>}
                        <button style={S.btn('#ef4444', '#fff')} onClick={() => { if (confirm('Delete user and all data?')) doAction('delete_user', { userId: u.id }) }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={usersPager.page} totalPages={usersPager.totalPages} total={usersPager.total} pageSize={usersPager.pageSize} setPage={usersPager.setPage} />
          </div>
        )}

        {tab === 'protection' && (
          <div>
            <div style={{ fontWeight: 700, marginBottom: '16px', color: '#06b6d4' }}>Anti-Detection Settings</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {[
                { label: 'Random Delays', key: 'random_delays', desc: 'Add random delays between actions' },
                { label: 'Human-like Gestures', key: 'human_gestures', desc: 'Simulate human touch patterns' },
                { label: 'Session Randomization', key: 'session_random', desc: 'Randomize session timing' },
                { label: 'Screen Variation', key: 'screen_variation', desc: 'Vary tap positions slightly' },
              ].map((setting) => (
                <div key={setting.key} style={{ ...S.card, marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{setting.label}</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{setting.desc}</div>
                  </div>
                  <button style={S.btn(data?.antiDetection?.[setting.key] ? '#22c55e' : '#374151', '#fff')} onClick={() => doAction('save_protection', { settings: { [setting.key]: !data?.antiDetection?.[setting.key] } })}>
                    {data?.antiDetection?.[setting.key] ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'smart_retry' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#4ecdc4' }}>🧠 Smart Retry Intelligence</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>الحلول المكتشفة تلقائياً عند فشل المهام — مشتركة بين كل المستخدمين</p>
              </div>
              <button onClick={fetchRetryData} style={S.btn('#4ecdc4', '#000')} disabled={retryLoading}>{retryLoading ? '...' : '↻ تحديث'}</button>
            </div>
            {retryData && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {[
                  { l: 'إجمالي الإنقاذات', v: retryData.total_rescues ?? 0, c: '#4ecdc4' },
                  { l: 'حلول محفوظة', v: retryData.total_solutions ?? 0, c: '#ffd166' },
                  { l: 'متوسط النجاح', v: (retryData.avg_success_rate ?? 0).toFixed(1) + '%', c: '#06d6a0' },
                  { l: 'مشاركة سحابية', v: retryData.cloud_solutions ?? 0, c: '#e07bff' },
                ].map((s, i) => (
                  <div key={i} style={S.stat(s.c)}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            )}
            {retryLoading && !retryData ? (
              <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>جاري التحميل...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['المهمة', 'الإجراء', 'نسبة النجاح', 'نجح', 'فشل', 'المصدر', 'بصمة الشاشة', 'آخر استخدام', 'إجراء'].map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {(retryData?.solutions ?? []).map((sol: any, i: number) => {
                    const total = (sol.success_count || 0) + (sol.fail_count || 0)
                    const rate  = total > 0 ? Math.round((sol.success_count / total) * 100) : 100
                    const rateColor = rate >= 80 ? '#22c55e' : rate >= 60 ? '#f59e0b' : '#ef4444'
                    return (
                      <tr key={i}>
                        <td style={S.td}><span style={{ fontSize: '12px', color: '#c9d4e8' }}>{(sol.task_name || '').replace(/_/g, ' ')}</span></td>
                        <td style={{ ...S.td, fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>{(sol.action_name || '').replace(/_/g, ' ')}</td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ flex: 1, height: '4px', background: '#2a2a3a', borderRadius: '2px', overflow: 'hidden', minWidth: '60px' }}>
                              <div style={{ width: `${rate}%`, height: '100%', background: rateColor, borderRadius: '2px' }} />
                            </div>
                            <span style={{ fontSize: '11px', color: rateColor, minWidth: '32px', textAlign: 'right' }}>{rate}%</span>
                          </div>
                        </td>
                        <td style={{ ...S.td, fontWeight: 700, color: '#22c55e' }}>{sol.success_count || 0}</td>
                        <td style={{ ...S.td, fontWeight: 700, color: '#ef4444' }}>{sol.fail_count || 0}</td>
                        <td style={S.td}><span style={S.badge(srcColors[sol.source] || '#888', (srcColors[sol.source] || '#888') + '20')}>{srcLabels[sol.source] || sol.source}</span></td>
                        <td style={{ ...S.td, fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>{(sol.screen_hash || '').slice(0, 12)}</td>
                        <td style={{ ...S.td, fontSize: '11px', color: '#666' }}>{sol.last_used ? new Date(sol.last_used).toLocaleDateString('ar') : '—'}</td>
                        <td style={S.td}><button style={S.btn('#ef4444', '#fff')} onClick={() => deleteRetrySolution(sol.id)}>حذف</button></td>
                      </tr>
                    )
                  })}
                  {!(retryData?.solutions?.length) && (
                    <tr><td colSpan={9} style={{ ...S.td, textAlign: 'center', color: '#555', padding: '40px' }}>لا توجد حلول محفوظة بعد — ستظهر تلقائياً عند تفعيل Smart Retry في الـ Agent</td></tr>
                  )}
                </tbody>
              </table>
            )}
            <div style={{ marginTop: '20px', background: '#0a1628', border: '1px solid #4ecdc422', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#4ecdc4', fontWeight: 700, marginBottom: '8px' }}>🔄 كيف يعمل؟</div>
              <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.8' }}>عند فشل أي مهمة في الـ Agent، يتدخل Smart Retry ويجرب حلولاً ذكية تلقائياً. الحل الناجح يُحفظ محلياً ثم يُشارك مع كل المستخدمين عبر هذا الجدول في Supabase.</div>
            </div>
          </div>
        )}

        {/* ══ ULTRA AGENT TAB ══ */}
        {tab === 'agent' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, background: 'linear-gradient(135deg,#00d4aa,#0095ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🤖 VRBOT Ultra Agent v3.0</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>Phase 1 · Phase 2 · Phase 3 — يعمل على Hetzner كل 6 ساعات</p>
              </div>
              <button onClick={fetchAgentData} style={S.btn('#00d4aa', '#000')} disabled={agentLoading}>{agentLoading ? '...' : '↻ تحديث'}</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { l: 'إجمالي المزارع', v: agentData?.farms?.farms?.length ?? 20, c: '#00d4aa' },
                { l: 'تعمل الآن', v: (agentData?.farms?.farms || []).filter((f: any) => f.live_status === 'running').length, c: '#0095ff' },
                { l: 'مهام اليوم', v: agentData?.tasks?.total ?? 0, c: '#ff9500' },
                { l: 'معدل النجاح', v: agentData?.tasks?.total > 0 ? Math.round(agentData.tasks.ok / agentData.tasks.total * 100) + '%' : 'N/A', c: '#22c55e' },
                { l: 'Batch الحالي', v: '#' + (agentData?.batch?.current_batch?.number ?? '?'), c: '#a855f7' },
                { l: 'معدل الخطأ', v: agentData?.batch?.error_rate ?? '0%', c: '#ef4444' },
              ].map((s, i) => (
                <div key={i} style={S.stat(s.c)}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { phase: 'Phase 1', title: 'Core Analysis + PRs', color: '#00d4aa', items: ['جلب logs من Hetzner API', 'تحليل المهام الفاشلة', 'بحث في GitHub + Stack Overflow', 'إنشاء PR تلقائي بالإصلاح'] },
                { phase: 'Phase 2', title: 'Self-Eval + Strategy', color: '#0095ff', items: ['تقييم ذاتي بـ 5 معايير', '8 استراتيجيات + UCB1 Algorithm', 'جمع بيانات Fine-tuning JSONL', 'تقرير نقاط الضعف'] },
                { phase: 'Phase 3', title: 'Multi-Agent + Goals', color: '#a855f7', items: ['6 Agents: Research→Code→Test', 'أهداف مستقلة تلقائية', 'Specialist Agents للمهام الصعبة', 'دورة كل 6 ساعات تلقائياً'] },
              ].map((p, i) => (
                <div key={i} style={{ background: '#0d1117', border: `1px solid ${p.color}30`, borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${p.color}20`, background: `${p.color}10` }}>
                    <span style={{ fontSize: '11px', color: p.color, fontWeight: 700, fontFamily: 'monospace' }}>{p.phase} </span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{p.title}</span>
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    {p.items.map((item, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: j < 3 ? '1px solid #1e2630' : 'none' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: '#888' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {agentData?.farms?.farms && (
              <div style={{ background: '#0d1117', border: '1px solid #1e2630', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#c8d8e8', marginBottom: '12px' }}>
                  🖥️ حالة المزارع ({agentData.farms.farms.length})
                  <span style={{ marginRight: '8px', fontSize: '11px', color: '#666' }}>آخر تحديث: {agentData.ts}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: '6px' }}>
                  {agentData.farms.farms.map((f: any) => {
                    const color = f.live_status === 'running' ? '#00d4aa' : f.live_status === 'error' ? '#ef4444' : '#4a5a6a'
                    return (
                      <div key={f.farm_id} style={{ background: `${color}10`, border: `1px solid ${color}30`, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: color, fontWeight: 700 }}>farm_{f.farm_id}</div>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, margin: '4px auto 0', boxShadow: `0 0 6px ${color}` }} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ DISCORD TAB ══ */}
        {tab === 'discord' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#5865F2' }}>🎮 Discord Integration</h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>بوت Discord مع 6 أوامر Slash + إشعارات تلقائية</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '16px' }}>
              <div style={{ background: '#0d1117', border: '1px solid #5865F230', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e2630', background: '#5865F215', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.013.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                  <span style={{ fontWeight: 700, color: '#fff' }}>Slash Commands</span>
                </div>
                <div style={{ padding: '14px 18px' }}>
                  {[['/status','حالة 20 مزرعة مباشرة'],['/farms','تفاصيل كل مزرعة'],['/agent','حالة Ultra Agent'],['/prs','آخر PRs على GitHub'],['/cycle','شغّل دورة يدوياً'],['/report','تقرير اليوم']].map(([cmd, desc], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < 5 ? '1px solid #1e2630' : 'none' }}>
                      <code style={{ background: '#5865F220', color: '#5865F2', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, minWidth: '72px', textAlign: 'center', flexShrink: 0 }}>{cmd}</code>
                      <span style={{ fontSize: '12px', color: '#888' }}>{desc}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: '14px', background: '#0a0a0f', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>تشغيل البوت:</div>
                    <code style={{ fontSize: '12px', color: '#00d4aa' }}>python discord_bot.py</code>
                  </div>
                </div>
              </div>
              <div style={{ background: '#0d1117', border: '1px solid #5865F230', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e2630', background: '#5865F215' }}>
                  <span style={{ fontWeight: 700, color: '#fff' }}>🔔 الإشعارات التلقائية</span>
                </div>
                <div style={{ padding: '14px 18px' }}>
                  {[['🔄','بدء كل دورة'],['✅','اكتمال الدورة + نتائج'],['🚀','PR جديد على GitHub'],['⚠️','مهمة فاشلة'],['❌','خطأ حرج في السيرفر'],['📅','تقرير كل 6 ساعات']].map(([emoji, event], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < 5 ? '1px solid #1e2630' : 'none' }}>
                      <span style={{ fontSize: '13px', color: '#c8d8e8' }}>{emoji} {event}</span>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '50px', background: '#00d4aa15', color: '#00d4aa', border: '1px solid #00d4aa30' }}>✓ نشط</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: '#0d1117', border: '1px solid #5865F230', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e2630', background: '#5865F215' }}>
                  <span style={{ fontWeight: 700, color: '#fff' }}>⚙️ الإعداد</span>
                </div>
                <div style={{ padding: '14px 18px' }}>
                  {[['DISCORD_BOT_TOKEN','من discord.com/developers'],['DISCORD_GUILD_ID','كليك يمين على السيرفر'],['DISCORD_CHANNEL_ID','كليك يمين على القناة']].map(([key, hint], i) => (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#5865F2', fontFamily: 'monospace', fontWeight: 700, marginBottom: '4px' }}>{key}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{hint}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: '4px', background: '#0a0a0f', borderRadius: '8px', padding: '12px', fontSize: '11px' }}>
                    <div style={{ color: '#666', marginBottom: '8px' }}>أضف في .env ثم:</div>
                    <code style={{ color: '#00d4aa', display: 'block', marginBottom: '4px' }}>pip install discord.py</code>
                    <code style={{ color: '#00d4aa' }}>python discord_bot.py</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <div style={{ textAlign: 'center', color: '#444', fontSize: '12px', marginTop: '16px' }}>
        Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : '—'}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        table tr:hover { background: #1a1a2e !important; }
        button:hover { opacity: 0.85; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 3px; }
      `}</style>
    </div>
  )
}
