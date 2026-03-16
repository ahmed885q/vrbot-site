import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const HETZNER_IP = process.env.HETZNER_IP || '88.99.64.19'
const API_KEY    = process.env.VRBOT_API_KEY || ''

/**
 * POST /api/farms/provision
 * Check provisioning status or trigger re-provision for a farm
 * Body: { farm_id: string }  ← farm_id = farm_name in cloud_farms
 */
export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabaseAuth = createServerClient(
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

  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { farm_id } = await req.json().catch(() => ({ farm_id: null }))
  if (!farm_id) return NextResponse.json({ error: 'farm_id required' }, { status: 400 })

  // Service client — البحث بـ farm_name في cloud_farms
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data: farm } = await supabase
    .from('cloud_farms')
    .select('*')
    .eq('user_id', user.id)
    .eq('farm_name', farm_id)
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
      farm: { ...farm, farm_id: farm.farm_name },
      live: data.farms || [],
      cloud_status: farm.status || 'unknown',
    })
  } catch {
    return NextResponse.json({
      ok: true,
      farm: { ...farm, farm_id: farm.farm_name },
      live: [],
      cloud_status: farm.status || 'unknown',
      server_reachable: false,
    })
  }
}
