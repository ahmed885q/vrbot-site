import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const HETZNER_IP = process.env.HETZNER_IP || 'cloud.vrbot.me'
const API_KEY    = process.env.VRBOT_API_KEY || ''

function getAuthClient() {
  const cookieStore = cookies()
  return createServerClient(
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
}

export async function POST(req: Request) {
  const supabaseAuth = getAuthClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { farm_id, action, x, y, x1, y1, x2, y2, key, text } = body

  // Service client — تحقق من الملكية عبر farm_name
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data } = await supabase
    .from('cloud_farms')
    .select('farm_name, container_id')
    .eq('user_id', user.id)
    .eq('farm_name', farm_id)
    .neq('status', 'deleted')
    .single()

  if (!data) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

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
    const res = await fetch(`https://${HETZNER_IP}/api/farms/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        farm_id: data.container_id || farm_id,
        command: commandMap[action]
      }),
    })
    const result = await res.json()
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: 'Server unreachable', detail: err.message }, { status: 502 })
  }
}
