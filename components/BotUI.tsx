'use client'

import React, { useMemo, useState } from 'react'

type Props = {
  userId: string
  email: string
  plan: string
  status: string
}

type TabKey =
  | 'overview'
  | 'farming'
  | 'build'
  | 'rally'
  | 'resources'
  | 'mail'
  | 'ai'

function Badge({
  label,
  icon,
  bg,
  color,
}: {
  label: string
  icon?: string
  bg: string
  color: string
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: bg,
        color,
        border: '1px solid rgba(17,24,39,0.10)',
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true">{icon ?? '•'}</span>
      {label}
    </span>
  )
}

function Card({
  title,
  subtitle,
  children,
  right,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        background: '#fff',
        boxShadow: '0 6px 18px rgba(17,24,39,0.06)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: 14,
          borderBottom: '1px solid #eef2f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontWeight: 900 }}>{title}</div>
          {subtitle ? (
            <div style={{ marginTop: 2, fontSize: 12, color: '#6b7280' }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {right}
      </div>

      <div style={{ padding: 14 }}>{children}</div>
    </div>
  )
}

function Row({
  left,
  right,
}: {
  left: React.ReactNode
  right: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 14,
        padding: '10px 0',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <div style={{ color: '#111827', fontWeight: 700 }}>{left}</div>
      <div style={{ color: '#374151' }}>{right}</div>
    </div>
  )
}

function Button({
  children,
  onClick,
  variant = 'primary',
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost'
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 12,
    fontWeight: 800,
    border: '1px solid transparent',
    cursor: 'pointer',
    userSelect: 'none',
  }

  const styles =
    variant === 'primary'
      ? {
          ...base,
          background: '#111827',
          color: '#fff',
        }
      : {
          ...base,
          background: '#fff',
          color: '#111827',
          borderColor: '#e5e7eb',
        }

  return (
    <button type="button" style={styles} onClick={onClick}>
      {children}
    </button>
  )
}

export default function BotUI({ email, userId, plan, status }: Props) {
  const [tab, setTab] = useState<TabKey>('overview')

  const planBadge = useMemo(() => {
    const p = String(plan || 'free').toLowerCase()
    if (p === 'pro') return { label: 'PRO', icon: '⚡', bg: '#dcfce7', color: '#166534' }
    if (p === 'trial') return { label: 'TRIAL', icon: '⏳', bg: '#e0f2fe', color: '#075985' }
    return { label: 'FREE', icon: '🧪', bg: '#f3f4f6', color: '#374151' }
  }, [plan])

  const statusBadge = useMemo(() => {
    const s = String(status || '').toLowerCase()
    if (s === 'active') return { label: 'ACTIVE', icon: '✅', bg: '#dcfce7', color: '#166534' }
    if (s === 'trialing') return { label: 'TRIALING', icon: '⏳', bg: '#e0f2fe', color: '#075985' }
    if (s === 'canceled') return { label: 'CANCELED', icon: '🛑', bg: '#fee2e2', color: '#991b1b' }
    return { label: String(status || '—').toUpperCase(), icon: '•', bg: '#f3f4f6', color: '#374151' }
  }, [status])

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '🏠' },
    { key: 'farming', label: 'Farming', icon: '🌾' },
    { key: 'build', label: 'Build', icon: '🏗️' },
    { key: 'rally', label: 'Rally', icon: '⚔️' },
    { key: 'resources', label: 'Resources', icon: '⛏️' },
    { key: 'mail', label: 'Mail & Gifts', icon: '🎁' },
    { key: 'ai', label: 'AI Helper', icon: '🤖' },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 500px at 20% 0%, rgba(59,130,246,0.12), transparent), radial-gradient(900px 400px at 80% 0%, rgba(34,197,94,0.10), transparent), #f8fafc',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto', padding: 18 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: -0.5 }}>
              VRBOT
            </div>
            <div style={{ marginTop: 6, color: '#6b7280', fontWeight: 600 }}>
              Viking Rise assistant dashboard (planning + checklist + guidance)
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Badge {...planBadge} />
            <Badge {...statusBadge} />
            <Badge label="No ban-bypass" icon="🛡️" bg="#fff7ed" color="#9a3412" />
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                border: '1px solid #e5e7eb',
                background: tab === t.key ? '#111827' : '#fff',
                color: tab === t.key ? '#fff' : '#111827',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 12,
          }}
        >
          {tab === 'overview' ? <Overview email={email} userId={userId} /> : null}
          {tab === 'farming' ? <Farming /> : null}
          {tab === 'build' ? <BuildPlanner /> : null}
          {tab === 'rally' ? <RallyPlanner /> : null}
          {tab === 'resources' ? <Resources /> : null}
          {tab === 'mail' ? <MailAndGifts /> : null}
          {tab === 'ai' ? <AIHelper /> : null}
        </div>

        <div style={{ marginTop: 14, color: '#6b7280', fontSize: 12, fontWeight: 700 }}>
          Note: This UI helps you plan and track tasks. Automation/bypass features are intentionally not included.
        </div>
      </div>
    </div>
  )
}

function Overview({ email, userId }: { email: string; userId: string }) {
  return (
    <Card
      title="Account"
      subtitle="Basic info"
      right={
        <a
          href="/dashboard"
          style={{
            textDecoration: 'none',
            fontWeight: 900,
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#fff',
            color: '#111827',
          }}
        >
          ↩︎ Dashboard
        </a>
      }
    >
      <Row left="Email" right={<span style={{ fontWeight: 800 }}>{email || '—'}</span>} />
      <Row
        left="User ID"
        right={<span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{userId}</span>}
      />
      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a
          href="/"
          style={{
            textDecoration: 'none',
            fontWeight: 900,
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #111827',
            background: '#111827',
            color: '#fff',
          }}
        >
          🏠 Home
        </a>
        <a
          href="mailto:ahmed85q@hotmail.com?subject=VRBOT%20Feedback"
          style={{
            textDecoration: 'none',
            fontWeight: 900,
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#fff',
            color: '#111827',
          }}
        >
          ✉️ Feedback
        </a>
      </div>
    </Card>
  )
}

function Farming() {
  const [routine, setRoutine] = useState({
    gather: true,
    farmTiles: true,
    upgradeWorkers: true,
    heal: true,
  })

  return (
    <Card title="Farming routine" subtitle="Daily checklist (manual tracking)">
      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={routine.gather}
          onChange={(e) => setRoutine({ ...routine, gather: e.target.checked })}
        />
        <span><b>Gather resources</b> — send marches to nearest rich nodes</span>
      </label>

      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={routine.farmTiles}
          onChange={(e) => setRoutine({ ...routine, farmTiles: e.target.checked })}
        />
        <span><b>Farm map tiles</b> — rotate zones to avoid over-farming one area</span>
      </label>

      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={routine.upgradeWorkers}
          onChange={(e) => setRoutine({ ...routine, upgradeWorkers: e.target.checked })}
        />
        <span><b>Upgrade economy</b> — queue upgrades for farm/production buildings</span>
      </label>

      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={routine.heal}
          onChange={(e) => setRoutine({ ...routine, heal: e.target.checked })}
        />
        <span><b>Heal + hospital</b> — keep capacity safe before rallies</span>
      </label>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 14,
          border: '1px solid #e5e7eb',
          background: '#f8fafc',
          color: '#374151',
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        ✅ This section is a planner/checklist. If later you want real automation, it must be done within the game’s allowed tools and rules.
      </div>
    </Card>
  )
}

function BuildPlanner() {
  const [level, setLevel] = useState(1)
  const target = 17

  const pct = Math.max(0, Math.min(100, Math.round((level / target) * 100)))

  return (
    <Card title="Build planner" subtitle="From level 1 → 17 (plan + notes)">
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Target farm level</div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => setLevel((v) => Math.max(1, v - 1))}>−</Button>
          <div style={{ fontSize: 28, fontWeight: 950 }}>{level}</div>
          <Button variant="ghost" onClick={() => setLevel((v) => Math.min(target, v + 1))}>+</Button>
          <div style={{ color: '#6b7280', fontWeight: 800 }}>Target: {target}</div>
        </div>

        <div style={{ height: 10, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#111827' }} />
        </div>

        <div style={{ fontSize: 13, color: '#374151', fontWeight: 700 }}>
          Suggested focus: <b>HQ/Stronghold requirements</b> + resource production + troop capacity.
        </div>

        <textarea
          placeholder="Notes (e.g., next upgrades, missing requirements, timers...)"
          style={{
            width: '100%',
            minHeight: 120,
            borderRadius: 14,
            border: '1px solid #e5e7eb',
            padding: 12,
            outline: 'none',
            fontWeight: 700,
          }}
        />
      </div>
    </Card>
  )
}

function RallyPlanner() {
  const [mode, setMode] = useState<'monsters' | 'support'>('monsters')

  return (
    <Card title="Rally planner" subtitle="Monsters + support rallies (planning)">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Button variant={mode === 'monsters' ? 'primary' : 'ghost'} onClick={() => setMode('monsters')}>
          ⚔️ Monsters
        </Button>
        <Button variant={mode === 'support' ? 'primary' : 'ghost'} onClick={() => setMode('support')}>
          🛡️ Support
        </Button>
      </div>

      {mode === 'monsters' ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <Row left="Goal" right="Farm XP + loot efficiently" />
          <Row left="Tip" right="Use strongest march, keep stamina check" />
          <Row left="Checklist" right="Scout → rally → heal → repeat" />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          <Row left="Goal" right="Support alliance rallies" />
          <Row left="Tip" right="Set time windows + notify group" />
          <Row left="Checklist" right="Join → send support → return → refill" />
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <textarea
          placeholder="Plan for today’s rallies (times, targets, notes)"
          style={{
            width: '100%',
            minHeight: 110,
            borderRadius: 14,
            border: '1px solid #e5e7eb',
            padding: 12,
            outline: 'none',
            fontWeight: 700,
          }}
        />
      </div>
    </Card>
  )
}

function Resources() {
  const [wood, setWood] = useState(0)
  const [food, setFood] = useState(0)
  const [stone, setStone] = useState(0)
  const [gold, setGold] = useState(0)

  return (
    <Card title="Resources tracker" subtitle="Manual tracking (for planning)">
      <div style={{ display: 'grid', gap: 10 }}>
        {resRow('🪵 Wood', wood, setWood)}
        {resRow('🍞 Food', food, setFood)}
        {resRow('🪨 Stone', stone, setStone)}
        {resRow('🪙 Gold', gold, setGold)}
      </div>

      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
        }}
      >
        <MiniStat label="Total" value={wood + food + stone + gold} />
        <MiniStat label="Priority" value="HQ reqs" />
        <MiniStat label="Next" value="Upgrade queue" />
      </div>
    </Card>
  )
}

function MailAndGifts() {
  const [done, setDone] = useState({
    dailyMail: false,
    allianceGifts: false,
    events: false,
    store: false,
  })

  return (
    <Card title="Mail & gifts" subtitle="Collect daily rewards + messages">
      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={done.dailyMail}
          onChange={(e) => setDone({ ...done, dailyMail: e.target.checked })}
        />
        <span><b>Daily mail</b> — claim all rewards</span>
      </label>

      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={done.allianceGifts}
          onChange={(e) => setDone({ ...done, allianceGifts: e.target.checked })}
        />
        <span><b>Alliance gifts</b> — open + share notes</span>
      </label>

      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={done.events}
          onChange={(e) => setDone({ ...done, events: e.target.checked })}
        />
        <span><b>Events</b> — check limited tasks</span>
      </label>

      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={done.store}
          onChange={(e) => setDone({ ...done, store: e.target.checked })}
        />
        <span><b>Store</b> — free pack / weekly items</span>
      </label>

      <div style={{ marginTop: 10, color: '#6b7280', fontWeight: 700, fontSize: 13 }}>
        Tip: write “what to do next” notes here:
      </div>

      <textarea
        placeholder="Notes / messages to remember..."
        style={{
          width: '100%',
          minHeight: 110,
          borderRadius: 14,
          border: '1px solid #e5e7eb',
          padding: 12,
          outline: 'none',
          fontWeight: 700,
          marginTop: 8,
        }}
      />
    </Card>
  )
}

function AIHelper() {
  const [q, setQ] = useState('')
  const [msgs, setMsgs] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    {
      role: 'ai',
      text:
        'Ask me for a farming/build/rally plan. (This is a safe helper—no ban bypass or cheating instructions.)',
    },
  ])
  const [loading, setLoading] = useState(false)

  async function ask() {
    const text = q.trim()
    if (!text || loading) return
    setQ('')
    setMsgs((m) => [...m, { role: 'user', text }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      setMsgs((m) => [...m, { role: 'ai', text: data.reply ?? 'OK' }])
    } catch {
      setMsgs((m) => [...m, { role: 'ai', text: 'Error: failed to reach AI endpoint.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="AI helper" subtitle="Planning + guidance">
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 14,
          padding: 12,
          background: '#f8fafc',
          maxHeight: 260,
          overflow: 'auto',
        }}
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '10px 12px',
                borderRadius: 14,
                fontWeight: 700,
                background: m.role === 'user' ? '#111827' : '#fff',
                color: m.role === 'user' ? '#fff' : '#111827',
                border: m.role === 'user' ? '1px solid #111827' : '1px solid #e5e7eb',
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g., give me a level 1→17 build plan..."
          style={{
            flex: 1,
            minWidth: 220,
            padding: '12px 12px',
            borderRadius: 14,
            border: '1px solid #e5e7eb',
            outline: 'none',
            fontWeight: 700,
          }}
        />
        <Button onClick={ask}>{loading ? '…' : 'Send'}</Button>
      </div>
    </Card>
  )
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        padding: 12,
        background: '#fff',
      }}
    >
      <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950 }}>{value}</div>
    </div>
  )
}

function chkRow(): React.CSSProperties {
  return {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9',
    fontWeight: 700,
    color: '#111827',
  }
}

function resRow(
  label: string,
  value: number,
  setValue: (n: number) => void
) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f1f5f9',
        padding: '10px 0',
      }}
    >
      <div style={{ fontWeight: 900 }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(Number(e.target.value || 0))}
        style={{
          width: 160,
          maxWidth: '45vw',
          padding: '10px 12px',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          outline: 'none',
          fontWeight: 900,
          textAlign: 'right',
        }}
      />
    </div>
  )
}
