import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

const HETZNER_IP = process.env.HETZNER_IP || '88.99.64.19'
const API_KEY    = process.env.VRBOT_API_KEY || ''

export async function POST(req: Request) {
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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { farm_id } = await req.json()

  // Verify ownership
  const { data } = await supabase
    .from('cloud_farms')
    .select('farm_id')
    .eq('user_id', user.id)
    .eq('farm_id', farm_id)
    .single()
  if (!data) return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })

  try {
    const res = await fetch(`http://${HETZNER_IP}:8888/api/farms/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({ farm_id }),
    })
    return NextResponse.json(await res.json())
  } catch (err: any) {
    return NextResponse.json({ error: 'Server unreachable' }, { status: 502 })
  }
}