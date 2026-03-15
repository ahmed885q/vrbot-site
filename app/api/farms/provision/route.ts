import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

const HETZNER_IP = process.env.HETZNER_IP || '88.99.64.19'
const API_KEY    = process.env.VRBOT_API_KEY || ''

/**
 * POST /api/farms/provision
 * Check provisioning status or trigger re-provision for a farm
 * Body: { farm_id: string }
 */
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

  const { farm_id } = await req.json().catch(() => ({ farm_id: null }))
  if (!farm_id) return NextResponse.json({ error: 'farm_id required' }, { status: 400 })

  // Check ownership
  const { data: farm } = await supabase
    .from('user_farms')
    .select('*')
    .eq('user_id', user.id)
    .eq('id', farm_id)
    .single()

  if (!farm) return NextResponse.json({ error: 'Farm not found' }, { status: 404 })

  // Check live status from Hetzner
  try {
    const res = await fetch(`http://${HETZNER_IP}:8888/api/farms/status?user_id=${user.id}`, {
      headers: { 'X-API-Key': API_KEY },
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json({
      ok: true,
      farm,
      live: data.farms || [],
      cloud_status: farm.cloud_status || 'unknown',
    })
  } catch {
    return NextResponse.json({
      ok: true,
      farm,
      live: [],
      cloud_status: farm.cloud_status || 'unknown',
      server_reachable: false,
    })
  }
}
