import { NextResponse } from 'next/server'

export async function POST() {
  const r = await fetch('http://127.0.0.1:9797/stream/stop', { method: 'POST' })
  const data = await r.json()
  return NextResponse.json(data, { status: r.status })
}
