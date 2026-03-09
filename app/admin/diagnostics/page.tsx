'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'

// ─── Pager Hook ────────────────────────────────────────────────────────────────
function usePager<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil((items?.length || 0) / pageSize))
  const paged = useMemo(() => (items || []).slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize])
  useEffect(() => { setPage(1) }, [items?.length])
  return { page, setPage, totalPages, total: items?.length || 0, paged, pageSize }
}

// ─── Pager Component ───────────────────────────────────────────────────────────
function Pager({ page, totalPages, total, pageSize, setPage }: any) {
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #2a2a3a', marginTop: '8px' }}>
      <span style={{ fontSize: '12px', color: '#666' }}>
        {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => setPage(1)} disabled={page === 1} style={{ padding: '4px 8px', background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '4px', color: page === 1 ? '#444' : '#888', cursor: page === 1 ? 'default' : 'pointer', fontSize: '12px' }}>«</button>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '4px 8px', background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '4px', color: page === 1 ? '#444' : '#888', cursor: page === 1 ? 'default' : 'pointer', fontSize: '12px' }}>‹</button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p = page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
          p = Math.max(1, Math.min(totalPages, p))
          return (
            <button key={p} onClick={() => setPage(p)} style={{ padding: '4px 8px', background: p === page ? '#3b82f6' : '#1a1a2e', border: '1px solid ' + (p === page ? '#3b82f6' : '#2a2a3a'), borderRadius: '4px', color: p === page ? '#fff' : '#888', cursor: 'pointer', fontSize: '12px' }}>{p}</button>
          )
        })}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '4px 8px', background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '4px', color: page === totalPages ? '#444' : '#888', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '12px' }}>›</button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ padding: '4px 8px', background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '4px', color: page === totalPages ? '#444' : '#888', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '12px' }}>»</button>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
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
  // Smart Retry state
  const [retryData, setRetryData]     = useState<any>(null)
  const [retryLoading, setRetryLoading] = useState(false)

  // ── fetch main data ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/diagnostics')
      const json = await res.json()
      setData(json)
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── fetch smart retry data ──
  const fetchRetryData = useCallback(async () => {
    setRetryLoading(true)
    try {
      const res = await fetch('/api/admin/smart-retry')
      const json = await res.json()
      setRetryData(json)
    } catch (e: any) { setErr(e.message) }
    finally { setRetryLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'smart_retry') fetchRetryData()
  }, [tab, fetchRetryData])

  // ── actions ──
  async function doAction(action: string, params: Record<string, any> = {}) {
    setMsg(''); setErr(''); setGenCodes([])
    try {
      const res = await fetch('/api/admin/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      })
      const json = await res.json()
      if (json.error) setErr(json.error)
      else { setMsg(json.message || 'Done'); if (json.codes) setGenCodes(json.codes); await fetchData() }
    } catch (e: any) { setErr(e.message) }
  }

  async function deleteRetrySolution(id: number) {
    if (!confirm('حذف هذا الحل؟')) return
    try {
      await fetch('/api/admin/smart-retry', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      fetchRetryData()
    } catch (e: any) { setErr(e.message) }
  }

  // ── helpers ──
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

  // ── filtered lists ──
  const filteredFarms = useMemo(() =>
    (data?.farms || []).filter((f: any) =>
      !farmSearch || f.user_email?.toLowerCase().includes(farmSearch.toLowerCase()) || f.id?.toLowerCase().includes(farmSearch.toLowerCase())
    ), [data?.farms, farmSearch])

  const filteredUsers = useMemo(() =>
    (data?.users || []).filter((u: any) =>
      !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase())
    ), [data?.users, userSearch])

  const filteredSubs = useMemo(() =>
    (data?.subscriptions || []).filter((s: any) =>
      !subSearch || s.email?.toLowerCase().includes(subSearch.toLowerCase())
    ), [data?.subscriptions, subSearch])

  const filteredKeys = useMemo(() =>
    (data?.proKeys || []).filter((k: any) =>
      !keySearch || k.code?.toLowerCase().includes(keySearch.toLowerCase()) || k.tag?.toLowerCase().includes(keySearch.toLowerCase())
    ), [data?.proKeys, keySearch])

  // ── pagers ──
  const farmsPager  = usePager(filteredFarms, 20)
  const usersPager  = usePager(filteredUsers, 20)
  const subsPager   = usePager(filteredSubs, 20)
  const keysPager   = usePager(filteredKeys, 20)
  const tokensPager = usePager(data?.tokens || [], 20)

  // ── styles ──
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

  // ── Smart Retry helpers ──
  const srcColors: Record<string, string> = { discovered: '#ffd166', cloud: '#4ecdc4', local: '#888888' }
  const srcLabels: Record<string, string> = { discovered: '✦ مكتشف', cloud: '☁ سحابي', local: '◆ محلي' }

  return (
    <div style={S.page}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            System Diagnostics
          </h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: '14px' }}>VRBOT Admin Control Panel</p>
        </div>
        <button onClick={fetchData} style={S.btn('#3b82f6', '#fff')} disabled={loading}>
          {loading ? '...' : '↻ Refresh'}
        </button>
      </div>

      {/* ── Messages ── */}
      {msg && <div style={{ ...S.card, background: '#052e16', borderColor: '#22c55e40', color: '#4ade80', padding: '12px', marginBottom: '12px' }}>{msg}</div>}
      {err && <div style={{ ...S.card, background: '#2a0a0a', borderColor: '#ef444440', color: '#f87171', padding: '12px', marginBottom: '12px' }}>{err}</div>}

      {/* ── Hub Status ── */}
      <div style={{ ...S.card, borderColor: hubOn ? '#22c55e40' : '#ef444440' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: hubOn ? '#22c55e' : '#ef4444', boxShadow: hubOn ? '0 0 12px #22c55e80' : '0 0 12px #ef444480' }} />
            <span style={{ fontWeight: 700, color: hubOn ? '#4ade80' : '#f87171' }}>Hub: {hubOn ? 'Online' : 'Offline'}</span>
          </div>
          {hubOn && (
            <>
              <span style={{ fontSize: '13px', color: '#888' }}>Connections: <b style={{ color: '#e0e0e0' }}>{hub.connections ?? 0}</b></span>
              <span style={{ fontSize: '13px', color: '#888' }}>Agents: <b style={{ color: '#e0e0e0' }}>{hub.agents ?? 0}</b></span>
              <span style={{ fontSize: '13px', color: '#888' }}>Dashboards: <b style={{ color: '#e0e0e0' }}>{hub.dashboards ?? 0}</b></span>
              <span style={{ fontSize: '13px', color: '#888' }}>Uptime: <b style={{ color: '#e0e0e0' }}>{hub.uptime ?? '-'}</b></span>
            </>
          )}
          {!hubOn && <span style={{ fontSize: '12px', color: '#666' }}>{hub.error || 'Cannot reach hub'}</span>}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { l: 'Users',         v: stats.totalUsers         ?? 0, c: '#3b82f6' },
          { l: 'Active Subs',   v: stats.activeSubs         ?? 0, c: '#22c55e' },
          { l: 'Farms',         v: stats.totalFarms         ?? 0, c: '#a855f7' },
          { l: 'Active Farms',  v: stats.activeFarms        ?? 0, c: '#06b6d4' },
          { l: 'Tokens Issued', v: stats.tokensIssued       ?? 0, c: '#f59e0b' },
          { l: 'Pro Keys',      v: stats.totalProKeys       ?? 0, c: '#ec4899' },
          { l: 'Revenue',       v: '$' + (stats.totalRevenue ?? 0), c: '#10b981' },
        ].map((s, i) => (
          <div key={i} style={S.stat(s.c)}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '0' }}>
        {[
          { k: 'farms',       l: 'Farms',         n: data?.farms?.length },
          { k: 'tokens',      l: 'Tokens',        n: data?.tokens?.length },
          { k: 'subs',        l: 'Subscriptions', n: data?.subscriptions?.length },
          { k: 'proKeys',     l: 'Pro Keys',      n: data?.proKeys?.length },
          { k: 'users',       l: 'Users',         n: data?.users?.length },
          { k: 'protection',  l: 'Protection',    n: null },
          { k: 'smart_retry', l: '🧠 Smart Retry', n: retryData?.total_solutions ?? null },
        ].map(t => (
          <button key={t.k} style={S.tabStyle(tab === t.k)} onClick={() => setTab(t.k)}>
            {t.l}{t.n != null ? <span style={{ marginLeft: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '1px 6px', fontSize: '11px' }}>{t.n}</span> : null}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ ...S.card, borderRadius: '0 12px 12px 12px', marginTop: '0' }}>

        {/* ── FARMS ── */}
        {tab === 'farms' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="Search by email or farm ID..."
                value={farmSearch}
                onChange={e => setFarmSearch(e.target.value)}
                style={{ ...S.input, minWidth: '240px' }}
              />
              <span style={{ fontSize: '12px', color: '#666' }}>{filteredFarms.length} farms</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Email', 'Farm ID', 'Name', 'Bot', 'Status', 'Last Activity', 'Actions'].map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr>
              </thead>
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
                        {f.bot_enabled
                          ? <button style={S.btn('#f59e0b', '#000')} onClick={() => doAction('disable_farm', { farmId: f.id })}>Disable</button>
                          : <button style={S.btn('#22c55e', '#fff')} onClick={() => doAction('enable_farm', { farmId: f.id })}>Enable</button>
                        }
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

        {/* ── TOKENS ── */}
        {tab === 'tokens' && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Email', 'Total', 'Used', 'Remaining', 'Trial', 'Actions'].map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {tokensPager.paged.map((tk: any) => (
                  <tr key={tk.user_id}>
                    <td style={S.td}><span style={{ fontSize: '12px' }}>{tk.email}</span></td>
                    <td style={{ ...S.td, fontWeight: 700, color: '#3b82f6' }}>{tk.tokens_total}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: '#f59e0b' }}>{tk.tokens_used}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: '#22c55e' }}>{tk.tokens_total - tk.tokens_used}</td>
                    <td style={S.td}><span style={tk.trial_granted ? S.badge('#f59e0b', '#2a1a00') : S.badge('#888', '#1a1a2a')}>{tk.trial_granted ? 'Yes' : 'No'}</span></td>
                    <td style={S.td}>
                      <button style={S.btn('#f59e0b', '#000')} onClick={() => doAction('reset_tokens', { userId: tk.user_id })}>Reset</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={tokensPager.page} totalPages={tokensPager.totalPages} total={tokensPager.total} pageSize={tokensPager.pageSize} setPage={tokensPager.setPage} />
          </div>
        )}

        {/* ── SUBSCRIPTIONS ── */}
        {tab === 'subs' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="Search by email..."
                value={subSearch}
                onChange={e => setSubSearch(e.target.value)}
                style={{ ...S.input, minWidth: '240px' }}
              />
              <span style={{ fontSize: '12px', color: '#666' }}>{filteredSubs.length} subscriptions</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Email', 'Plan', 'Status', 'Expires', 'Source', 'Actions'].map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {subsPager.paged.map((sub: any) => {
                  const on  = sub.status === 'active'
                  const src = sub.stripe_customer_id === 'admin_manual' ? 'Manual'
                    : sub.pro_key_code ? 'Pro Key'
                    : sub.stripe_customer_id?.startsWith('cus_') ? 'Stripe'
                    : 'PayPal'
                  return (
                    <tr key={sub.id}>
                      <td style={S.td}><span style={{ fontSize: '12px' }}>{sub.email}</span></td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{sub.plan || '-'}</td>
                      <td style={S.td}><span style={on ? S.badge('#4ade80', '#052e16') : S.badge('#f87171', '#2a0a0a')}>{sub.status}</span></td>
                      <td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{shortDate(sub.expires_at)}</td>
                      <td style={S.td}><span style={S.badge('#888', '#1a1a2a')}>{src}</span></td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {on
                            ? <button style={S.btn('#ef4444', '#fff')} onClick={() => doAction('cancel_subscription', { subId: sub.id })}>Cancel</button>
                            : <button style={S.btn('#22c55e', '#fff')} onClick={() => doAction('activate_subscription', { subId: sub.id })}>Activate</button>
                          }
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

        {/* ── PRO KEYS ── */}
        {tab === 'proKeys' && (
          <div>
            {/* Generate Keys */}
            <div style={{ ...S.card, background: '#0d1117', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, marginBottom: '12px', color: '#a855f7' }}>Generate Pro Keys</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Count</div>
                  <input type="number" min={1} max={100} value={keyCount} onChange={e => setKeyCount(+e.target.value)}
                    style={{ ...S.input, width: '70px' }} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Tag</div>
                  <input placeholder="e.g. beta" value={keyTag} onChange={e => setKeyTag(e.target.value)}
                    style={{ ...S.input, width: '120px' }} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Note</div>
                  <input placeholder="Optional note" value={keyNote} onChange={e => setKeyNote(e.target.value)}
                    style={{ ...S.input, width: '200px' }} />
                </div>
                <button style={S.btn('#a855f7', '#fff')} onClick={() => doAction('generate_pro_keys', { count: keyCount, tag: keyTag, note: keyNote })}>
                  Generate
                </button>
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

            {/* Keys Table */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="Search by code or tag..."
                value={keySearch}
                onChange={e => setKeySearch(e.target.value)}
                style={{ ...S.input, minWidth: '240px' }}
              />
              <span style={{ fontSize: '12px', color: '#666' }}>{filteredKeys.length} keys</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Code', 'Tag', 'Status', 'Redeemed By', 'Redeemed At', 'Note', 'Actions'].map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {keysPager.paged.map((k: any) => (
                  <tr key={k.id}>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '12px', color: '#a855f7' }}>
                      <span style={{ cursor: 'pointer' }} onClick={() => copyText(k.code)}>{k.code}</span>
                    </td>
                    <td style={S.td}>{k.tag || '-'}</td>
                    <td style={S.td}>
                      <span style={k.is_redeemed ? S.badge('#888', '#1a1a2a') : S.badge('#4ade80', '#052e16')}>
                        {k.is_redeemed ? 'Used' : 'Available'}
                      </span>
                    </td>
                    <td style={{ ...S.td, fontSize: '12px' }}>{k.redeemed_by_email || '-'}</td>
                    <td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{shortDate(k.redeemed_at)}</td>
                    <td style={{ ...S.td, fontSize: '12px', color: '#666' }}>{k.note || '-'}</td>
                    <td style={S.td}>
                      {!k.is_redeemed && (
                        <button style={S.btn('#ef4444', '#fff')} onClick={() => { if (confirm('Revoke key?')) doAction('revoke_pro_key', { keyId: k.id }) }}>
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={keysPager.page} totalPages={keysPager.totalPages} total={keysPager.total} pageSize={keysPager.pageSize} setPage={keysPager.setPage} />
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="Search by email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{ ...S.input, minWidth: '240px' }}
              />
              <span style={{ fontSize: '12px', color: '#666' }}>{filteredUsers.length} users</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Email', 'Registered', 'Last Login', 'Status', 'Actions'].map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {usersPager.paged.map((u: any) => (
                  <tr key={u.id}>
                    <td style={S.td}>{u.email}</td>
                    <td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{shortDate(u.created_at)}</td>
                    <td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{timeAgo(u.last_sign_in)}</td>
                    <td style={S.td}>
                      <span style={u.banned ? S.badge('#f87171', '#2a0a0a') : S.badge('#4ade80', '#052e16')}>
                        {u.banned ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {u.banned
                          ? <button style={S.btn('#22c55e', '#fff')} onClick={() => doAction('unban_user', { userId: u.id })}>Unban</button>
                          : <button style={S.btn('#f59e0b', '#000')} onClick={() => doAction('ban_user', { userId: u.id })}>Ban</button>
                        }
                        <button style={S.btn('#ef4444', '#fff')} onClick={() => { if (confirm('Delete user and all data?')) doAction('delete_user', { userId: u.id }) }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={usersPager.page} totalPages={usersPager.totalPages} total={usersPager.total} pageSize={usersPager.pageSize} setPage={usersPager.setPage} />
          </div>
        )}

        {/* ── PROTECTION ── */}
        {tab === 'protection' && (
          <div>
            <div style={{ fontWeight: 700, marginBottom: '16px', color: '#06b6d4' }}>Anti-Detection Settings</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {[
                { label: 'Random Delays',        key: 'random_delays',        desc: 'Add random delays between actions' },
                { label: 'Human-like Gestures',  key: 'human_gestures',       desc: 'Simulate human touch patterns' },
                { label: 'Session Randomization', key: 'session_random',      desc: 'Randomize session timing' },
                { label: 'Screen Variation',     key: 'screen_variation',     desc: 'Vary tap positions slightly' },
              ].map((setting) => (
                <div key={setting.key} style={{ ...S.card, marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{setting.label}</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{setting.desc}</div>
                  </div>
                  <button
                    style={S.btn(data?.antiDetection?.[setting.key] ? '#22c55e' : '#374151', '#fff')}
                    onClick={() => doAction('save_protection', { settings: { [setting.key]: !data?.antiDetection?.[setting.key] } })}
                  >
                    {data?.antiDetection?.[setting.key] ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SMART RETRY ── */}
        {tab === 'smart_retry' && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#4ecdc4' }}>🧠 Smart Retry Intelligence</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>الحلول المكتشفة تلقائياً عند فشل المهام — مشتركة بين كل المستخدمين</p>
              </div>
              <button onClick={fetchRetryData} style={S.btn('#4ecdc4', '#000')} disabled={retryLoading}>
                {retryLoading ? '...' : '↻ تحديث'}
              </button>
            </div>

            {/* Stats */}
            {retryData && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {[
                  { l: 'إجمالي الإنقاذات', v: retryData.total_rescues    ?? 0,                            c: '#4ecdc4' },
                  { l: 'حلول محفوظة',      v: retryData.total_solutions  ?? 0,                            c: '#ffd166' },
                  { l: 'متوسط النجاح',     v: (retryData.avg_success_rate ?? 0).toFixed(1) + '%',         c: '#06d6a0' },
                  { l: 'مشاركة سحابية',    v: retryData.cloud_solutions  ?? 0,                            c: '#e07bff' },
                ].map((s, i) => (
                  <div key={i} style={S.stat(s.c)}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Table */}
            {retryLoading && !retryData ? (
              <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>جاري التحميل...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['المهمة', 'الإجراء', 'نسبة النجاح', 'نجح', 'فشل', 'المصدر', 'بصمة الشاشة', 'آخر استخدام', 'إجراء'].map((h, i) => (
                      <th key={i} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(retryData?.solutions ?? []).map((sol: any, i: number) => {
                    const total = (sol.success_count || 0) + (sol.fail_count || 0)
                    const rate  = total > 0 ? Math.round((sol.success_count / total) * 100) : 100
                    const rateColor = rate >= 80 ? '#22c55e' : rate >= 60 ? '#f59e0b' : '#ef4444'
                    return (
                      <tr key={i}>
                        <td style={S.td}>
                          <span style={{ fontSize: '12px', color: '#c9d4e8' }}>
                            {(sol.task_name || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ ...S.td, fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
                          {(sol.action_name || '').replace(/_/g, ' ')}
                        </td>
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
                        <td style={S.td}>
                          <span style={S.badge(srcColors[sol.source] || '#888', (srcColors[sol.source] || '#888') + '20')}>
                            {srcLabels[sol.source] || sol.source}
                          </span>
                        </td>
                        <td style={{ ...S.td, fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>
                          {(sol.screen_hash || '').slice(0, 12)}
                        </td>
                        <td style={{ ...S.td, fontSize: '11px', color: '#666' }}>
                          {sol.last_used ? new Date(sol.last_used).toLocaleDateString('ar') : '—'}
                        </td>
                        <td style={S.td}>
                          <button style={S.btn('#ef4444', '#fff')} onClick={() => deleteRetrySolution(sol.id)}>
                            حذف
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {!(retryData?.solutions?.length) && (
                    <tr>
                      <td colSpan={9} style={{ ...S.td, textAlign: 'center', color: '#555', padding: '40px' }}>
                        لا توجد حلول محفوظة بعد — ستظهر تلقائياً عند تفعيل Smart Retry في الـ Agent
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Info */}
            <div style={{ marginTop: '20px', background: '#0a1628', border: '1px solid #4ecdc422', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#4ecdc4', fontWeight: 700, marginBottom: '8px' }}>🔄 كيف يعمل؟</div>
              <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.8' }}>
                عند فشل أي مهمة في الـ Agent، يتدخل Smart Retry ويجرب حلولاً ذكية تلقائياً.
                الحل الناجح يُحفظ محلياً ثم يُشارك مع كل المستخدمين عبر هذا الجدول في Supabase.
                في المرة القادمة يستخدم الحل المحفوظ مباشرة بدون تجربة. النسبة تمثل معدل نجاح الحل.
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Timestamp ── */}
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
