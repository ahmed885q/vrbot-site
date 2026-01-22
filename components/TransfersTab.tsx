'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Row } from '@/components/bot/ui'

type Farm = { id: string; name: string }
type Transfer = {
  id: string
  farm_id: string
  recipient: string
  recipient_type: 'name' | 'id'
  wood: number
  food: number
  stone: number
  gold: number
  status: 'pending' | 'done' | 'canceled'
  note: string | null
  scheduled_at: string | null
  created_at: string
}

export default function TransfersTab() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // form
  const [farmId, setFarmId] = useState('')
  const [recipientType, setRecipientType] = useState<'name' | 'id'>('name')
  const [recipient, setRecipient] = useState('')
  const [wood, setWood] = useState(0)
  const [food, setFood] = useState(0)
  const [stone, setStone] = useState(0)
  const [gold, setGold] = useState(0)
  const [note, setNote] = useState('')
  const [scheduleNow, setScheduleNow] = useState(true)
  const [scheduledAt, setScheduledAt] = useState('')

  const pendingCount = useMemo(
    () => transfers.filter((t) => t.status === 'pending').length,
    [transfers]
  )

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      // farms
      const fRes = await fetch('/api/farms/list', { cache: 'no-store' })
      const fJson = await fRes.json().catch(() => ({}))
      if (!fRes.ok) throw new Error(fJson?.error || 'Failed to load farms')
      const farmsList: Farm[] = fJson?.farms || []
      setFarms(farmsList)
      if (!farmId && farmsList[0]?.id) setFarmId(farmsList[0].id)

      // transfers
      const tRes = await fetch('/api/transfers/list', { cache: 'no-store' })
      const tJson = await tRes.json().catch(() => ({}))
      if (!tRes.ok) throw new Error(tJson?.error || 'Failed to load transfers')
      setTransfers(tJson?.transfers || [])
    } catch (e: any) {
      setError(e?.message || 'Load failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetAmounts() {
    setWood(0)
    setFood(0)
    setStone(0)
    setGold(0)
  }

  async function createTransfer() {
    setError(null)
    const r = recipient.trim()
    if (!farmId) return setError('Select a farm')
    if (!r) return setError('Enter recipient')
    if (wood + food + stone + gold <= 0) return setError('Set at least one resource amount')

    setBusy(true)
    try {
      const res = await fetch('/api/transfers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          recipientType,
          recipient: r,
          wood,
          food,
          stone,
          gold,
          note: note.trim() || null,
          scheduledAt: scheduleNow ? null : scheduledAt || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Create failed')

      setRecipient('')
      setNote('')
      setScheduleNow(true)
      setScheduledAt('')
      resetAmounts()
      await loadAll()
    } catch (e: any) {
      setError(e?.message || 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(id: string, status: 'pending' | 'done' | 'canceled') {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/transfers/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Update failed')
      await loadAll()
    } catch (e: any) {
      setError(e?.message || 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function removeTransfer(id: string) {
    if (!confirm('Delete this transfer task?')) return
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/transfers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Delete failed')
      await loadAll()
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="Resource Transfers"
      subtitle="Create transfer tasks (recipient by Name or ID) + track status"
      right={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge label={`Pending: ${pendingCount}`} icon="📦" bg="#eef2ff" color="#3730a3" />
          <Button variant="ghost" onClick={loadAll} disabled={busy || loading}>
            🔄 Refresh
          </Button>
        </div>
      }
    >
      {error ? (
        <div
          style={{
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid rgba(17,24,39,0.08)',
            padding: 12,
            borderRadius: 12,
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      {/* Create form */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 14,
          background: '#fff',
          padding: 12,
          marginBottom: 12,
        }}
      >
        <Row
          left="From farm"
          right={
            <select
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
              style={selStyle()}
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          }
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <div>
            <div style={labelStyle()}>Recipient type</div>
            <select
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value as any)}
              style={selStyle()}
            >
              <option value="name">Name</option>
              <option value="id">ID</option>
            </select>
          </div>

          <div>
            <div style={labelStyle()}>Recipient</div>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={recipientType === 'name' ? 'Player name' : 'Player ID'}
              style={inputStyle()}
            />
          </div>
        </div>

        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Amount label="🪵 Wood" value={wood} setValue={setWood} />
          <Amount label="🍞 Food" value={food} setValue={setFood} />
          <Amount label="🪨 Stone" value={stone} setValue={setStone} />
          <Amount label="🪙 Gold" value={gold} setValue={setGold} />
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={labelStyle()}>Note (optional)</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle()} />
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 800 }}>
            <input type="checkbox" checked={scheduleNow} onChange={(e) => setScheduleNow(e.target.checked)} />
            Send now
          </label>

          {!scheduleNow ? (
            <input
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              placeholder="YYYY-MM-DDTHH:mm (optional)"
              style={{ ...inputStyle(), minWidth: 260 }}
            />
          ) : null}

          <Button onClick={createTransfer} disabled={busy || loading}>
            ➕ Create task
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              setRecipient('')
              setNote('')
              resetAmounts()
            }}
            disabled={busy || loading}
          >
            🧹 Clear
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: '#6b7280', fontWeight: 800 }}>Loading…</div>
      ) : transfers.length === 0 ? (
        <div style={{ color: '#6b7280', fontWeight: 800 }}>No transfer tasks yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {transfers.map((t) => (
            <div
              key={t.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 14,
                background: '#fff',
                padding: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 950 }}>
                  To: {t.recipient} <span style={{ color: '#6b7280' }}>({t.recipient_type})</span>
                </div>

                <Badge
                  label={t.status.toUpperCase()}
                  icon={t.status === 'pending' ? '⏳' : t.status === 'done' ? '✅' : '🛑'}
                  bg={t.status === 'done' ? '#dcfce7' : t.status === 'canceled' ? '#fee2e2' : '#e0f2fe'}
                  color={t.status === 'done' ? '#166534' : t.status === 'canceled' ? '#991b1b' : '#075985'}
                />
              </div>

              <div style={{ marginTop: 8, color: '#374151', fontWeight: 800, fontSize: 13 }}>
                Amounts: 🪵 {t.wood} · 🍞 {t.food} · 🪨 {t.stone} · 🪙 {t.gold}
              </div>

              {t.note ? (
                <div style={{ marginTop: 6, color: '#6b7280', fontWeight: 800, fontSize: 13 }}>
                  Note: {t.note}
                </div>
              ) : null}

              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button variant="ghost" onClick={() => setStatus(t.id, 'pending')} disabled={busy}>
                  ⏳ Pending
                </Button>
                <Button onClick={() => setStatus(t.id, 'done')} disabled={busy}>
                  ✅ Done
                </Button>
                <Button variant="danger" onClick={() => setStatus(t.id, 'canceled')} disabled={busy}>
                  🛑 Cancel
                </Button>
                <Button variant="danger" onClick={() => removeTransfer(t.id)} disabled={busy}>
                  🗑 Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function labelStyle(): React.CSSProperties {
  return { fontWeight: 900, fontSize: 12, color: '#6b7280', marginBottom: 6 }
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px 12px',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    outline: 'none',
    fontWeight: 800,
  }
}

function selStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px 12px',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    outline: 'none',
    fontWeight: 800,
    background: '#fff',
  }
}

function Amount({
  label,
  value,
  setValue,
}: {
  label: string
  value: number
  setValue: (n: number) => void
}) {
  return (
    <div>
      <div style={labelStyle()}>{label}</div>
      <input
        type="number"
        value={value}
        min={0}
        onChange={(e) => setValue(Math.max(0, Number(e.target.value || 0)))}
        style={inputStyle()}
      />
    </div>
  )
}
