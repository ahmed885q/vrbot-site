import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

const HETZNER_IP = process.env.HETZNER_IP || '88.99.64.19'
const API_KEY    = process.env.VRBOT_API_KEY || ''

async function getUser() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
}

async function verifyOwnership(supabase: any, userId: string, farmId: string) {
  const { data } = await supabase
    .from('cloud_farms')
    .select('farm_id')
    .eq('user_id', userId)
    .eq('farm_id', farmId)
    .single()
  return !!data
}

export async function POST(req: Request) {
  const { user, supabase } = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { farm_id, action, x, y, x1, y1, x2, y2, key, text } = body

  // Verify farm ownership
  const owns = await verifyOwnership(supabase, user.id, farm_id)
  if (!owns) return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })

  // Only allow safe actions
  const ALLOWED = ['tap', 'swipe', 'key', 'text']
  if (!ALLOWED.includes(action)) {
    return NextResponse.json({ error: 'أمر غير مسموح' }, { status: 400 })
  }

  const commandMap: Record<string, string> = {
    tap:   `tap:${x},${y}`,
    swipe: `swipe:${x1},${y1},${x2},${y2}`,
    key:   `key:${key}`,
    text:  `text:${text}`,
  }

  try {
    const res = await fetch(`http://${HETZNER_IP}:8888/api/farms/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({ farm_id, command: commandMap[action] }),
    })
    const result = await res.json()
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: 'Server unreachable', detail: err.message }, { status: 502 })
  }
}