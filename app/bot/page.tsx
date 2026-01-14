'use client'

import { useEffect, useRef, useState } from 'react'

type Log = {
  id: string
  level: string
  message: string
  created_at: string
}

export default function BotLogs() {
  const [logs, setLogs] = useState<Log[]>([])
  const lastTsRef = useRef<string | null>(null)

  useEffect(() => {
    const interval = setInterval(async () => {
      const url = lastTsRef.current
        ? `/api/bot/logs?since=${encodeURIComponent(lastTsRef.current)}`
        : '/api/bot/logs'

      const res = await fetch(url)
      if (!res.ok) return

      const data = await res.json()
      if (!data.logs?.length) return

      setLogs(prev => [...prev, ...data.logs])
      lastTsRef.current =
        data.logs[data.logs.length - 1].created_at
    }, 3000) // كل 3 ثواني

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-2 text-sm">
      {logs.length === 0 && (
        <p className="text-gray-500">No logs yet</p>
      )}

      {logs.map(log => (
        <div
          key={log.id}
          className="rounded bg-gray-100 p-2 font-mono"
        >
          <span className="text-gray-500">
            {new Date(log.created_at).toLocaleTimeString()}
          </span>{' '}
          <span className="font-bold">{log.level.toUpperCase()}</span>{' '}
          {log.message}
        </div>
      ))}
    </div>
  )
}
