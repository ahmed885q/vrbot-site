// app/api/hetzner/[...path]/route.ts
// Proxy لـ Hetzner API - يحل مشكلة CORS

import { NextRequest, NextResponse } from 'next/server'

const BASE_URL  = 'https://cloud.vrbot.me'
const ADMIN_KEY = process.env.VRBOT_ADMIN_KEY || 'vrbot_admin_2026'

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(req, params.path, 'GET')
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(req, params.path, 'POST')
}

async function proxy(req: NextRequest, path: string[], method: string) {
  const endpoint = '/' + path.join('/')
  const url = BASE_URL + endpoint

  const options: RequestInit = {
    method,
    headers: {
      'X-API-Key':    ADMIN_KEY,
      'Content-Type': 'application/json',
    },
  }

  if (method === 'POST') {
    try { options.body = await req.text() } catch {}
  }

  try {
    const res  = await fetch(url, options)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
