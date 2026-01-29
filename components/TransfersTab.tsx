'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Badge } from '@/components/bot/ui'

type Transfer = {
  id: string
  from_farm_id: string
  to_player: string
  amount: number
  resource_type: 'food' | 'wood' | 'stone' | 'gold' | string
  status: 'pending' | 'sent' | 'cancelled' | 'failed' | string
  created_at: string
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString()
  } catch {
    return d
  }
}

function StatusBadge({ status }: { status: Transfer['status'] }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pending: { label: 'Pending', bg: '#fff7ed', color: '#9a3412' },
    sent: { label: 'Sent', bg: '#ecfdf5', color: '#065f46' },
    cancelled: { label: 'Cancelled', bg: '#f3f4f6', color: '#374151' },
    failed: { label: 'Failed', bg: '#fef2f2', color: '#991b1b' },
  }
  const s = map[status] ?? { label: status, bg: '#eef2ff', color: '#3730a3' }
  return <Badge label={s.label} bg={s.bg} color={s.color} />
}

export default function TransfersTab() {
  const [items, setItems] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // form
  const [fromFarmId, setFromFarmId] = useState('')
  const [toPlayer, setToPlayer] = useState('') // اسم أو ID
  const [resourceType, setResourceType] = useState<Transfer['resource_type']>('food')
  const [amount, setAmount] = useState<number>(1000)

  const canSubmit = useMemo(() => {
    return (
      fromFarmId.trim().length > 0 &&
      toPlayer.trim().length > 0 &&
      Number.isFinite(amount) &&
      amount > 0 &&
      String(resourceType).trim().length > 0
    )
  }, [fromFarmId, toPlayer, amount, resourceType])

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/transfers/list', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load transfers')
      setItems(data.items ?? [])
    } catch (e: any) {
      setErr(e?.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function createTransfer() {
    if (!canSubmit) return
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/transfers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromFarmId: fromFarmId.trim(),
          toPlayer: toPlayer.trim(), // يقبل اسم أو ID
          amount: Number(amount),
          resourceType,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create transfer')
      // حدث القائمة
      await load()
      // نظف بسيط
      setToPlayer('')
    } catch (e: any) {
      setErr(e?.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function cancelTransfer(id: string) {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/transfers/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to cancel transfer')
      await load()
    } catch (e: any) {
      setErr(e?.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Card
        title="Transfers"
        subtitle="Send resources to a player (Name or ID). This currently creates/queues a transfer record."
        right={
          <Button onClick={load} variant="ghost" disabled={loading}>
            Refresh
          </Button>
        }
      >
        {err ? (
          <div style={{ marginBottom: 10, color: '#b91c1c', fontSize: 13 }}>
            {err}
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: '1fr 1fr',
            alignItems: 'end',
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>From Farm ID</div>
            <input
              value={fromFarmId}
              onChange={(e) => setFromFarmId(e.target.value)}
              placeholder="farm uuid..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>To Player (Name or ID)</div>
            <input
              value={toPlayer}
              onChange={(e) => setToPlayer(e.target.value)}
              placeholder="player name or ID..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Resource</div>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                outline: 'none',
                background: '#fff',
              }}
            >
              <option value="food">Food</option>
              <option value="wood">Wood</option>
              <option value="stone">Stone</option>
              <option value="gold">Gold</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Amount</div>
            <input
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              type="number"
              min={1}
              step={1}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
            <Button onClick={createTransfer} variant="primary" disabled={!canSubmit || loading}>
              {loading ? '...' : 'Create Transfer'}
            </Button>

            <div style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>
              Tip: “To Player” accepts either **name** or **ID**.
            </div>
          </div>
        </div>
      </Card>

      <Card title="Recent Transfers" subtitle={`${items.length} items`}>
        <div style={{ display: 'grid', gap: 10 }}>
          {items.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: 13 }}>No transfers yet.</div>
          ) : (
            items.map((t) => (
              <div
                key={t.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 14,
                  padding: 12,
                  display: 'grid',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 700, color: '#111827' }}>
                    {t.resource_type} · {t.amount.toLocaleString()}
                  </div>
                  <StatusBadge status={t.status} />
                </div>

                <div style={{ fontSize: 13, color: '#374151' }}>
                  From: <span style={{ fontFamily: 'monospace' }}>{t.from_farm_id}</span>
                </div>

                <div style={{ fontSize: 13, color: '#374151' }}>
                  To: <span style={{ fontWeight: 700 }}>{t.to_player}</span>
                </div>

                <div style={{ fontSize: 12, color: '#6b7280' }}>{formatDate(t.created_at)}</div>

                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  {t.status === 'pending' ? (
                    <Button onClick={() => cancelTransfer(t.id)} variant="ghost" disabled={loading}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
