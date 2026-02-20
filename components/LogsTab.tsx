'use client'

import React from 'react'
import { Button, Card } from '@/components/bot/ui'

type LogRow = {
  id: number
  farm_id: string | null
  level: string
  message: string
  created_at: string
}

type FarmOption = {
  id: string
  name: string
}

type Props = {
  farms: FarmOption[]
  selectedFarmId: string
  setSelectedFarmId: (id: string) => void
  logs: LogRow[]
  logsLoading: boolean
  logsError: string | null
  reloadLogs: (farmId: string) => Promise<void>
}

export default function LogsTab({
  farms,
  selectedFarmId,
  setSelectedFarmId,
  logs,
  logsLoading,
  logsError,
  reloadLogs,
}: Props) {
  const getLevelStyle = (level: string) => {
    const base = {
      padding: '3px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 900,
      textTransform: 'uppercase' as const,
    }

    switch (level.toLowerCase()) {
      case 'error':
        return { ...base, background: '#fee2e2', color: '#991b1b' }
      case 'warning':
        return { ...base, background: '#fef3c7', color: '#92400e' }
      case 'success':
        return { ...base, background: '#dcfce7', color: '#166534' }
      default:
        return { ...base, background: '#e5e7eb', color: '#374151' }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const clearLogs = async () => {
    if (!confirm('Clear all logs? This cannot be undone.')) return

    try {
      const res = await fetch('/api/logs/clear', { method: 'POST' })
      if (res.ok) {
        await reloadLogs(selectedFarmId)
      }
    } catch (error) {
      alert('Failed to clear logs')
    }
  }

  return (
    <>
      <Card
        title="Activity Logs"
        subtitle="System and bot activity records"
        right={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" onClick={() => reloadLogs(selectedFarmId)}>
              🔄 Refresh
            </Button>
            <Button variant="danger" onClick={clearLogs}>
              🗑️ Clear All
            </Button>
          </div>
        }
      >
        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700 }}>Filter by Farm:</div>
          <select
            value={selectedFarmId}
            onChange={(e) => {
              setSelectedFarmId(e.target.value)
              reloadLogs(e.target.value)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <option value="all">All Farms</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <span style={getLevelStyle('info')}>Info</span>
            <span style={getLevelStyle('success')}>Success</span>
            <span style={getLevelStyle('warning')}>Warning</span>
            <span style={getLevelStyle('error')}>Error</span>
          </div>
        </div>

        {/* Logs Content */}
        {logsLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280', fontWeight: 700 }}>
            Loading logs...
          </div>
        ) : logsError ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#ef4444', fontWeight: 700 }}>
            Error: {logsError}
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280', fontWeight: 700 }}>
            No logs found. Activity will appear here.
          </div>
        ) : (
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              overflow: 'hidden',
              maxHeight: 500,
              overflowY: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 900, fontSize: 13 }}>Time</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 900, fontSize: 13 }}>Level</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 900, fontSize: 13 }}>Farm</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 900, fontSize: 13 }}>Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const farm = farms.find((f) => f.id === log.farm_id)
                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: log.level === 'error' ? '#fef2f2' : '#fff',
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#6b7280' }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={getLevelStyle(log.level)}>{log.level}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700 }}>
                        {farm ? farm.name : 'System'}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#111827' }}>
                        {log.message}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
            Showing {logs.length} log entries
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
            Auto-refresh: Off
          </div>
        </div>
      </Card>

      {/* Log Statistics */}
      <Card title="Log Statistics" subtitle="Activity summary">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
          <div style={{ textAlign: 'center', padding: 14, border: '1px solid #e5e7eb', borderRadius: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 950 }}>{logs.length}</div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Total Logs</div>
          </div>

          <div style={{ textAlign: 'center', padding: 14, border: '1px solid #e5e7eb', borderRadius: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 950, color: '#991b1b' }}>
              {logs.filter((l) => l.level === 'error').length}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Errors</div>
          </div>

          <div style={{ textAlign: 'center', padding: 14, border: '1px solid #e5e7eb', borderRadius: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 950, color: '#92400e' }}>
              {logs.filter((l) => l.level === 'warning').length}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Warnings</div>
          </div>

          <div style={{ textAlign: 'center', padding: 14, border: '1px solid #e5e7eb', borderRadius: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 950, color: '#166534' }}>
              {logs.filter((l) => l.level === 'success').length}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Success</div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Recent Activity Pattern:</div>
          <div style={{ height: 60, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', fontWeight: 700, lineHeight: '40px' }}>
                No activity data
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: '100%' }}>
                {[...Array(24)].map((_, i) => {
                  const hourLogs = logs.filter(
                    (log) => new Date(log.created_at).getHours() === i
                  ).length
                  const height = Math.min(40, (hourLogs / Math.max(...[...Array(24)].map((_, j) =>
                    logs.filter((log) => new Date(log.created_at).getHours() === j).length
                  ))) * 40)

                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${height}px`,
                          background: hourLogs > 0 ? '#3b82f6' : '#e5e7eb',
                          borderRadius: 3,
                        }}
                      />
                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>{i}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 6, fontWeight: 700 }}>
            Hour of day (0-23)
          </div>
        </div>
      </Card>

      {/* Export Logs */}
      <Card title="Export Logs" subtitle="Download or backup activity data">
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontWeight: 700, color: '#374151' }}>
            Export your logs for analysis or backup:
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="ghost">
              📥 Export as JSON
            </Button>
            <Button variant="ghost">
              📊 Export as CSV
            </Button>
            <Button variant="ghost">
              📋 Copy to Clipboard
            </Button>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              background: '#f8fafc',
              fontSize: 13,
              color: '#374151',
              fontWeight: 700,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Export Options:</div>
            <ul style={{ marginLeft: 20 }}>
              <li>JSON: For programmatic analysis</li>
              <li>CSV: For spreadsheet import</li>
              <li>Text: For plain text review</li>
              <li>Filtered: Export only selected farm or level</li>
            </ul>
          </div>

          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
            Note: Exports include all logs visible with current filter settings.
          </div>
        </div>
      </Card>
    </>
  )
}