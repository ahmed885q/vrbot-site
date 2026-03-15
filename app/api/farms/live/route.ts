import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

const HETZNER_IP = process.env.HETZNER_IP || '88.99.64.19'
const API_KEY    = process.env.VRBOT_API_KEY || ''

/**
 * GET /api/farms/live
 * Returns merged farm data: Supabase user_farms + live Hetzner status
 * Used by /dashboard/live page
 */
export async function GET() {
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

  // Get user's farms from Supabase
  const { data: userFarms } = await supabase
    .from('user_farms')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at')

  // Also check cloud_farms table
  const { data: cloudFarms } = await supabase
    .from('cloud_farms')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')

  // Get live status from Hetzner
  let liveFarms: any[] = []
  try {
    const res = await fetch(
      `http://${HETZNER_IP}:8888/api/farms/status?user_id=${user.id}`,
      {
        headers: { 'X-API-Key': API_KEY },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      }
    )
    if (res.ok) {
      const data = await res.json()
      liveFarms = data.farms || []
    }
  } catch {}

  // Merge: if user has cloud_farms, use those + live status
  // If user has no cloud_farms but has user_farms, show user_farms
  // If user has neither, show all live farms (admin/demo mode)
  const farms = (cloudFarms && cloudFarms.length > 0)
    ? cloudFarms.map(cf => {
        const live = liveFarms.find(lf => lf.farm_id === cf.farm_id)
        return {
          farm_id: cf.farm_id,
          nickname: cf.nickname || cf.farm_id,
          igg_email: cf.igg_email || '',
          live_status: live?.live_status || 'offline',
          tasks_today: live?.tasks_today || 0,
          success_rate: 0,
          adb_port: live?.adb_port || 5555,
          status: cf.status,
        }
      })
    : (userFarms && userFarms.length > 0)
    ? userFarms.map((uf, i) => {
        // Map user_farms to live format using index-based farm_id
        const farmId = String(i + 1).padStart(3, '0')
        const live = liveFarms.find(lf => lf.farm_id === farmId)
        return {
          farm_id: farmId,
          nickname: uf.name || farmId,
          igg_email: '',
          live_status: live?.live_status || 'offline',
          tasks_today: live?.tasks_today || 0,
          success_rate: 0,
          adb_port: live?.adb_port || 5555,
          status: uf.cloud_status || 'active',
        }
      })
    : liveFarms.map(lf => ({
        farm_id: lf.farm_id,
        nickname: lf.farm_id,
        igg_email: '',
        live_status: lf.live_status || 'offline',
        tasks_today: lf.tasks_today || 0,
        success_rate: 0,
        adb_port: lf.adb_port || 5555,
        status: 'active',
      }))

  return NextResponse.json({ ok: true, farms })
}
