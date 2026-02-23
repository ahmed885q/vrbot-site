'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import AnalyticsTab from '../components/AnalyticsTab'

export default function DiagnosticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('analytics')
  const [keyCount, setKeyCount] = useState(5)
  const [keyTag, setKeyTag] = useState('')
  const [keyNote, setKeyNote] = useState('')
  const [genCodes, setGenCodes] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newPass, setNewPass] = useState('')
  const [pEnabled, setPEnabled] = useState(true)
  const [pSensitivity, setPSensitivity] = useState(3)
  const [pMaxReq, setPMaxReq] = useState(100)
  const [pBlockMin, setPBlockMin] = useState(60)
  const [keyFilter, setKeyFilter] = useState('all')
  const [keySearch, setKeySearch] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<number[]>([])
  const [deliverTo, setDeliverTo] = useState('')
  const [deliverNote, setDeliverNote] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/diagnostics')
      const json = await res.json()
      setData(json)
      if (json.antiDetection) {
        setPEnabled(json.antiDetection.enabled ?? true)
        setPSensitivity(json.antiDetection.sensitivity ?? 3)
        setPMaxReq(json.antiDetection.max_requests ?? 100)
        setPBlockMin(json.antiDetection.block_duration_minutes ?? 60)
      }
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function doAction(action: string, params: Record<string, any> = {}) {
    setMsg(''); setErr(''); setGenCodes([])
    try {
      const res = await fetch('/api/admin/diagnostics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      })
      const json = await res.json()
      if (json.error) setErr(json.error)
      else { setMsg(json.message || 'Done'); if (json.codes) setGenCodes(json.codes); await fetchData() }
    } catch (e: any) { setErr(e.message) }
  }

  function timeAgo(d: string) {
    if (!d) return '-'
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    if (m < 1) return 'now'; if (m < 60) return m + 'm'
    const h = Math.floor(m / 60); if (h < 24) return h + 'h'; return Math.floor(h / 24) + 'd'
  }
  function shortDate(d: string) { return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-' }
  function copyText(t: string) { navigator.clipboard.writeText(t); setMsg('Copied!') }

  const filteredKeys = useMemo(() => {
    let keys = data?.proKeys ?? []
    if (keyFilter === 'available') keys = keys.filter((k: any) => !k.is_used && !k.revoked)
    else if (keyFilter === 'used') keys = keys.filter((k: any) => k.is_used)
    else if (keyFilter === 'revoked') keys = keys.filter((k: any) => k.revoked)
    else if (keyFilter === 'delivered') keys = keys.filter((k: any) => k.delivered_at)
    else if (keyFilter === 'undelivered') keys = keys.filter((k: any) => !k.delivered_at && !k.is_used && !k.revoked)
    if (keySearch) {
      const s = keySearch.toLowerCase()
      keys = keys.filter((k: any) => k.code?.toLowerCase().includes(s) || k.batch_tag?.toLowerCase().includes(s) || k.note?.toLowerCase().includes(s) || k.delivered_to?.toLowerCase().includes(s) || k.usedByEmail?.toLowerCase().includes(s))
    }
    return keys
  }, [data?.proKeys, keyFilter, keySearch])

  function exportCSV() {
    const keys = filteredKeys
    const header = 'Code,Status,UsedBy,Batch,Note,DeliveredTo,DeliveredNote,Created\n'
    const rows = keys.map((k: any) => `${k.code},${k.revoked ? 'Revoked' : k.is_used ? 'Used' : 'Available'},${k.usedByEmail || ''},${k.batch_tag || ''},${(k.note || '').replace(/,/g, ';')},${k.delivered_to || ''},${(k.delivered_note || '').replace(/,/g, ';')},${shortDate(k.created_at)}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `pro-keys-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
    setMsg('CSV exported!')
  }

  function toggleKey(id: number) {
    setSelectedKeys(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id])
  }
  function selectAllFiltered() {
    const avail = filteredKeys.filter((k: any) => !k.is_used && !k.revoked).map((k: any) => k.id)
    setSelectedKeys(prev => prev.length === avail.length ? [] : avail)
  }

  const S = {
    page: { minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0', fontFamily: 'Segoe UI, sans-serif', padding: '24px' } as React.CSSProperties,
    card: { background: '#141420', border: '1px solid #2a2a3a', borderRadius: '12px', padding: '20px', marginBottom: '16px' } as React.CSSProperties,
    btn: (bg: string, c: string) => ({ padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: bg, color: c }) as React.CSSProperties,
    tabS: (a: boolean) => ({ padding: '10px 16px', background: a ? '#3b82f6' : '#1a1a2e', color: a ? '#fff' : '#888', border: a ? '1px solid #3b82f6' : '1px solid #2a2a3a', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: '13px', fontWeight: a ? 700 : 400 }) as React.CSSProperties,
    th: { padding: '10px 12px', borderBottom: '1px solid #2a2a3a', textAlign: 'left' as const, fontSize: '12px', color: '#888', fontWeight: 600 } as React.CSSProperties,
    td: { padding: '10px 12px', borderBottom: '1px solid #1a1a2a', fontSize: '13px' } as React.CSSProperties,
    badge: (c: string, bg: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: c, background: bg }) as React.CSSProperties,
    stat: (c: string) => ({ background: c + '10', border: '1px solid ' + c + '30', borderRadius: '10px', padding: '16px', textAlign: 'center' as const, flex: '1', minWidth: '120px' }) as React.CSSProperties,
    input: { padding: '8px 12px', background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '6px', color: '#e0e0e0', fontSize: '13px' } as React.CSSProperties,
    filterBtn: (a: boolean) => ({ padding: '4px 10px', border: '1px solid ' + (a ? '#a855f7' : '#2a2a3a'), borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: a ? 700 : 400, background: a ? '#a855f720' : 'transparent', color: a ? '#a855f7' : '#888' }) as React.CSSProperties,
  }

  if (loading && !data) return <div style={{ ...S.page, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div style={{ fontSize: '20px', color: '#888' }}>Loading...</div></div>
  const hub = data?.hub ?? {}; const stats = data?.stats ?? {}; const hubOn = !hub.error && hub.status !== 'offline'

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>System Diagnostics</h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: '14px' }}>VRBOT Admin Control Panel</p>
        </div>
        <button onClick={fetchData} style={S.btn('#3b82f6', '#fff')} disabled={loading}>{loading ? '...' : 'Refresh'}</button>
      </div>
      {msg && <div style={{ ...S.card, background: '#052e16', borderColor: '#22c55e40', color: '#4ade80', padding: '12px' }}>{msg}</div>}
      {err && <div style={{ ...S.card, background: '#2a0a0a', borderColor: '#ef444440', color: '#f87171', padding: '12px' }}>{err}</div>}
      <div style={{ ...S.card, borderColor: hubOn ? '#22c55e40' : '#ef444440' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: hubOn ? '#22c55e' : '#ef4444', boxShadow: hubOn ? '0 0 12px #22c55e80' : '0 0 12px #ef444480' }} />
            <span style={{ fontWeight: 700, color: hubOn ? '#4ade80' : '#f87171' }}>Hub: {hubOn ? 'Online' : 'Offline'}</span>
          </div>
          {hubOn && <><span style={{ fontSize: '13px' }}>Connections: <b>{hub.connections}</b></span><span style={{ fontSize: '13px', color: '#3b82f6' }}>Agents: <b>{hub.agents}</b></span><span style={{ fontSize: '13px', color: '#8b5cf6' }}>Dashboards: <b>{hub.dashboards}</b></span></>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {[{ v: stats.totalUsers, l: 'Users', c: '#3b82f6' },{ v: stats.totalFarms, l: 'Farms', c: '#8b5cf6' },{ v: stats.activeFarms, l: 'Active', c: '#22c55e' },{ v: stats.activeSubs, l: 'Subs', c: '#f59e0b' },{ v: (stats.totalTokensUsed||0)+'/'+(stats.totalTokensAvail||0), l: 'Tokens', c: '#06b6d4' },{ v: stats.totalKeys, l: 'Keys', c: '#a855f7' },{ v: stats.usedKeys, l: 'Used', c: '#ec4899' },{ v: stats.deliveredKeys, l: 'Delivered', c: '#14b8a6' }].map((s, i) => (<div key={i} style={S.stat(s.c)}><div style={{ fontSize: '24px', fontWeight: 800, color: s.c }}>{s.v}</div><div style={{ fontSize: '11px', color: '#888' }}>{s.l}</div></div>))}
      </div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {[{ k: 'analytics', l: '📊 Analytics', n: null },{ k: 'farms', l: 'Farms', n: data?.farms?.length },{ k: 'tokens', l: 'Tokens', n: data?.tokens?.length },{ k: 'subs', l: 'Subscriptions', n: data?.subscriptions?.length },{ k: 'proKeys', l: 'Pro Keys', n: data?.proKeys?.length },{ k: 'users', l: 'Users', n: data?.users?.length },{ k: 'protection', l: 'Protection', n: null }].map(t => (<div key={t.k} style={S.tabS(tab === t.k)} onClick={() => setTab(t.k)}>{t.l}{t.n !== null ? ` (${t.n ?? 0})` : ''}</div>))}
      </div>
      <div style={{ ...S.card, borderTopLeftRadius: 0, marginTop: 0, overflowX: 'auto' }}>

        {tab === 'analytics' && <AnalyticsTab data={data} />}

        {tab === 'farms' && (<table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Email','Name','Server','Bot','Status','Activity','Actions'].map((h,i) => <th key={i} style={S.th}>{h}</th>)}</tr></thead><tbody>{(data?.farms ?? []).map((f: any) => (<tr key={f.id}><td style={S.td}><span style={{ fontSize: '12px' }}>{f.email}</span></td><td style={{ ...S.td, fontWeight: 600 }}>{f.name}</td><td style={S.td}>{f.server || '-'}</td><td style={S.td}><span style={f.bot_enabled ? S.badge('#22c55e','#052e16') : S.badge('#888','#1a1a2a')}>{f.bot_enabled ? 'ON' : 'OFF'}</span></td><td style={S.td}><span style={S.badge('#888','#1a1a2a')}>{f.bot_status || 'idle'}</span></td><td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{timeAgo(f.last_bot_activity)}</td><td style={S.td}><div style={{ display: 'flex', gap: '4px' }}>{f.bot_enabled ? <button style={S.btn('#f59e0b','#000')} onClick={() => doAction('disable_farm', { farmId: f.id })}>Disable</button> : <button style={S.btn('#22c55e','#fff')} onClick={() => doAction('enable_farm', { farmId: f.id })}>Enable</button>}<button style={S.btn('#ef4444','#fff')} onClick={() => { if(confirm('Delete farm?')) doAction('delete_farm', { farmId: f.id }) }}>Delete</button></div></td></tr>))}</tbody></table>)}

        {tab === 'tokens' && (<table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Email','Total','Used','Remaining','Trial','Actions'].map((h,i) => <th key={i} style={S.th}>{h}</th>)}</tr></thead><tbody>{(data?.tokens ?? []).map((t: any) => (<tr key={t.user_id}><td style={S.td}><span style={{ fontSize: '12px' }}>{t.email}</span></td><td style={{ ...S.td, fontWeight: 700, color: '#3b82f6' }}>{t.tokens_total}</td><td style={{ ...S.td, fontWeight: 700, color: '#f59e0b' }}>{t.tokens_used}</td><td style={{ ...S.td, fontWeight: 700, color: '#22c55e' }}>{t.tokens_total - t.tokens_used}</td><td style={S.td}><span style={t.trial_granted ? S.badge('#f59e0b','#2a1a00') : S.badge('#888','#1a1a2a')}>{t.trial_granted ? 'Yes' : 'No'}</span></td><td style={S.td}><button style={S.btn('#f59e0b','#000')} onClick={() => doAction('reset_tokens', { userId: t.user_id })}>Reset</button></td></tr>))}</tbody></table>)}

        {tab === 'subs' && (<table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Email','Plan','Status','Expires','Source','Actions'].map((h,i) => <th key={i} style={S.th}>{h}</th>)}</tr></thead><tbody>{(data?.subscriptions ?? []).map((s: any) => {const on = s.status === 'active'; const src = s.stripe_customer_id === 'admin_manual' ? 'Manual' : s.pro_key_code ? 'Pro Key' : s.stripe_customer_id?.startsWith('cus_') ? 'Stripe' : 'PayPal'; return (<tr key={s.id}><td style={S.td}><span style={{ fontSize: '12px' }}>{s.email}</span></td><td style={{ ...S.td, fontWeight: 600 }}>{s.plan || '-'}</td><td style={S.td}><span style={on ? S.badge('#22c55e','#052e16') : S.badge('#ef4444','#2a0a0a')}>{s.status}</span></td><td style={{ ...S.td, fontSize: '12px' }}>{shortDate(s.current_period_end)}</td><td style={S.td}><span style={S.badge('#06b6d4','#0a2a3a')}>{src}</span></td><td style={S.td}><div style={{ display: 'flex', gap: '4px' }}>{on ? <button style={S.btn('#ef4444','#fff')} onClick={() => doAction('deactivate_subscription', { userId: s.user_id })}>Deactivate</button> : <button style={S.btn('#22c55e','#fff')} onClick={() => doAction('activate_subscription', { userId: s.user_id })}>Activate</button>}</div></td></tr>)})}</tbody></table>)}

        {tab === 'proKeys' && (<div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="number" min={1} max={100} value={keyCount} onChange={e => setKeyCount(Number(e.target.value))} style={{ ...S.input, width: '70px' }} placeholder="Count" />
            <input value={keyTag} onChange={e => setKeyTag(e.target.value)} style={{ ...S.input, width: '150px' }} placeholder="Batch tag" />
            <input value={keyNote} onChange={e => setKeyNote(e.target.value)} style={{ ...S.input, width: '200px' }} placeholder="Note" />
            <button style={S.btn('#a855f7','#fff')} onClick={() => doAction('generate_keys', { count: keyCount, batchTag: keyTag || null, note: keyNote || null })}>Generate</button>
          </div>
          {genCodes.length > 0 && (<div style={{ ...S.card, background: '#1a0a2e', borderColor: '#a855f740', marginBottom: '12px' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#a855f7', fontWeight: 700 }}>Generated {genCodes.length} keys:</span><button style={S.btn('#a855f7','#fff')} onClick={() => copyText(genCodes.join('\n'))}>Copy All</button></div><div style={{ maxHeight: '150px', overflow: 'auto', fontSize: '12px', fontFamily: 'monospace', color: '#ccc' }}>{genCodes.map((c,i) => <div key={i}>{c}</div>)}</div></div>)}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[{k:'all',l:'All'},{k:'available',l:'Available'},{k:'used',l:'Used'},{k:'revoked',l:'Revoked'},{k:'delivered',l:'Delivered'},{k:'undelivered',l:'Not Delivered'}].map(f => (<button key={f.k} style={S.filterBtn(keyFilter === f.k)} onClick={() => setKeyFilter(f.k)}>{f.l}</button>))}
            <input value={keySearch} onChange={e => setKeySearch(e.target.value)} style={{ ...S.input, width: '200px', marginLeft: '8px' }} placeholder="Search code, tag, email..." />
            <button style={S.btn('#06b6d4','#fff')} onClick={exportCSV}>Export CSV</button>
            <span style={{ fontSize: '12px', color: '#666' }}>{filteredKeys.length} keys</span>
          </div>
          {selectedKeys.length > 0 && (<div style={{ display: 'flex', gap: '8px', marginBottom: '12px', padding: '12px', background: '#1a0a2e', borderRadius: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#a855f7', fontWeight: 700, fontSize: '13px' }}>{selectedKeys.length} selected</span>
            <input value={deliverTo} onChange={e => setDeliverTo(e.target.value)} style={{ ...S.input, width: '180px' }} placeholder="Deliver to (email/name)" />
            <input value={deliverNote} onChange={e => setDeliverNote(e.target.value)} style={{ ...S.input, width: '180px' }} placeholder="Delivery note" />
            <button style={S.btn('#14b8a6','#fff')} onClick={() => { if(deliverTo) { doAction('deliver_keys', { keyIds: selectedKeys, deliveredTo: deliverTo, deliveredNote: deliverNote || null }); setSelectedKeys([]); setDeliverTo(''); setDeliverNote('') } }}>Deliver</button>
            <button style={S.btn('#06b6d4','#fff')} onClick={() => { const codes = filteredKeys.filter((k: any) => selectedKeys.includes(k.id)).map((k: any) => k.code); copyText(codes.join('\n')) }}>Copy Selected</button>
            <button style={{ ...S.btn('#333','#888'), marginLeft: 'auto' }} onClick={() => setSelectedKeys([])}>Clear</button>
          </div>)}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>
            <th style={S.th}><input type="checkbox" onChange={selectAllFiltered} checked={selectedKeys.length > 0 && selectedKeys.length === filteredKeys.filter((k: any) => !k.is_used && !k.revoked).length} /></th>
            {['Code','Status','Used By','Delivered To','Batch','Note','Created','Actions'].map((h,i) => <th key={i} style={S.th}>{h}</th>)}
          </tr></thead><tbody>{filteredKeys.map((k: any) => (<tr key={k.id} style={{ background: selectedKeys.includes(k.id) ? '#1a0a2e' : 'transparent' }}>
            <td style={S.td}>{!k.is_used && !k.revoked && <input type="checkbox" checked={selectedKeys.includes(k.id)} onChange={() => toggleKey(k.id)} />}</td>
            <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: '11px', cursor: 'pointer' }} onClick={() => copyText(k.code)} title="Click to copy">{k.code?.slice(0,12)}...</span></td>
            <td style={S.td}><span style={k.revoked ? S.badge('#ef4444','#2a0a0a') : k.is_used ? S.badge('#f59e0b','#2a1a00') : S.badge('#22c55e','#052e16')}>{k.revoked ? 'Revoked' : k.is_used ? 'Used' : 'Available'}</span></td>
            <td style={{ ...S.td, fontSize: '12px' }}>{k.usedByEmail || '-'}</td>
            <td style={{ ...S.td, fontSize: '12px' }}>{k.delivered_to ? <span style={S.badge('#14b8a6','#0a2a2a')}>{k.delivered_to}</span> : '-'}</td>
            <td style={S.td}>{k.batch_tag || '-'}</td>
            <td style={{ ...S.td, fontSize: '12px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.note || k.delivered_note || '-'}</td>
            <td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{shortDate(k.created_at)}</td>
            <td style={S.td}>{!k.revoked && !k.is_used && <button style={S.btn('#ef4444','#fff')} onClick={() => doAction('revoke_key', { keyId: k.id })}>Revoke</button>}{k.revoked && <button style={S.btn('#22c55e','#fff')} onClick={() => doAction('unrevoke_key', { keyId: k.id })}>Unrevoke</button>}</td>
          </tr>))}</tbody></table>
        </div>)}

        {tab === 'users' && (<div><div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center', padding: '12px', background: '#1a1a2e', borderRadius: '8px' }}><span style={{ fontSize: '13px', color: '#888' }}>Create User:</span><input value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ ...S.input, width: '220px' }} placeholder="email@example.com" /><input value={newPass} onChange={e => setNewPass(e.target.value)} style={{ ...S.input, width: '150px' }} placeholder="Password" type="password" /><button style={S.btn('#3b82f6','#fff')} onClick={() => { if(newEmail && newPass) { doAction('create_user', { email: newEmail, password: newPass }); setNewEmail(''); setNewPass('') } }}>Create</button></div><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Email','Created','Last Login','Status','Actions'].map((h,i) => <th key={i} style={S.th}>{h}</th>)}</tr></thead><tbody>{(data?.users ?? []).map((u: any) => (<tr key={u.id}><td style={S.td}>{u.email}</td><td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{shortDate(u.created_at)}</td><td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{timeAgo(u.last_sign_in)}</td><td style={S.td}><span style={u.banned ? S.badge('#ef4444','#2a0a0a') : S.badge('#22c55e','#052e16')}>{u.banned ? 'Banned' : 'Active'}</span></td><td style={S.td}><div style={{ display: 'flex', gap: '4px' }}>{u.banned ? <button style={S.btn('#22c55e','#fff')} onClick={() => doAction('unban_user', { userId: u.id })}>Unban</button> : <button style={S.btn('#f59e0b','#000')} onClick={() => doAction('ban_user', { userId: u.id })}>Ban</button>}<button style={S.btn('#ef4444','#fff')} onClick={() => { if(confirm('DELETE ' + u.email + '?')) doAction('delete_user', { userId: u.id }) }}>Delete</button></div></td></tr>))}</tbody></table></div>)}

        {tab === 'protection' && (<div style={{ maxWidth: '500px' }}><h3 style={{ margin: '0 0 20px', color: '#8b5cf6' }}>Protection Settings</h3><div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}><label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}><input type="checkbox" checked={pEnabled} onChange={e => setPEnabled(e.target.checked)} style={{ width: '18px', height: '18px' }} /><span style={{ fontSize: '14px' }}>Enabled</span></label><div><label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>Sensitivity (1-5)</label><input type="number" min={1} max={5} value={pSensitivity} onChange={e => setPSensitivity(Number(e.target.value))} style={{ ...S.input, width: '100%' }} /></div><div><label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>Max Requests</label><input type="number" min={1} value={pMaxReq} onChange={e => setPMaxReq(Number(e.target.value))} style={{ ...S.input, width: '100%' }} /></div><div><label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>Block Duration (minutes)</label><input type="number" min={1} value={pBlockMin} onChange={e => setPBlockMin(Number(e.target.value))} style={{ ...S.input, width: '100%' }} /></div><button style={{ ...S.btn('#8b5cf6','#fff'), padding: '12px', fontSize: '14px' }} onClick={() => doAction('save_protection', { settings: { enabled: pEnabled, sensitivity: pSensitivity, max_requests: pMaxReq, block_duration_minutes: pBlockMin } })}>Save Settings</button></div></div>)}
      </div>
      <div style={{ textAlign: 'center', color: '#444', fontSize: '12px', marginTop: '16px' }}>Updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : '-'}</div>
      <style>{`table tr:hover{background:#1a1a2e!important}button:hover{opacity:0.85}`}</style>
    </div>
  )
}
