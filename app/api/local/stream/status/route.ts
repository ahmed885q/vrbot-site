import { NextResponse } from 'next/server'

export async function GET() {
  const r = await fetch('http://127.0.0.1:9797/stream/status', { method: 'GET' })
  const data = await r.json()
  return NextResponse.json(data, { status: r.status })
}
