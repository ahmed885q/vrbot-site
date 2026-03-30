import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const HETZNER_IP = process.env.HETZNER_IP || '88.99.64.19'
const API_KEY    = process.env.VRBOT_API_KEY || ''

/**
 * GET /api/farms/live
 * Returns merged farm data: Supabase cloud_farms + live Hetzner status
 * Used by /dashboard/live page
 *
 * cloud_farms schema: id, user_id, farm_name, server_id, container_id,
 *   adb_port, status, game_account, tasks_config, last_heartbeat, created_at, updated_at, worker_id
 */
export async function GET() {
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

  // Service client for cloud_farms
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // جلب مزارع المستخدم — cloud_farms فقط (farm_name هو المعرف)
  const { data: cloudFarms } = await supabase
    .from('cloud_farms')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'deleted')
    .order('created_at')

  // Get live status from Hetzner
  let liveFarms: any[] = []
  try {
    const res = await fetch(
      `https://${HETZNER_IP}/api/farms/status`,
      {
        headers: { 'X-API-Key': API_KEY },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      }
    )
    if (res.ok) {
      const data = await res.json()
      liveFarms = data.farms || []
    }
  } catch {}

  // Merge cloud_farms + live status
  if (cloudFarms && cloudFarms.length > 0) {
    const farms = cloudFarms.map((cf: any) => {
      const live = liveFarms.find(
        (lf: any) => lf.farm_id === cf.farm_name || lf.container_id === cf.container_id
      )
      return {
        farm_id:      cf.farm_name,
        nickname:     cf.farm_name,
        igg_email:    cf.game_account || '',
        live_status:  live?.live_status || (cf.status === 'running' ? 'online' : 'offline'),
        tasks_today:  live?.tasks_today || 0,
        success_rate: live?.success_rate || 100,
        adb_port:     cf.adb_port || live?.adb_port || 5555,
        status:       cf.status,
      }
    })
    return NextResponse.json({ ok: true, farms })
  }

  // Fallback: show all live farms if no cloud_farms records
  if (liveFarms.length > 0) {
    const farms = liveFarms.map((lf: any) => ({
      farm_id:      lf.farm_id,
      nickname:     lf.farm_id,
      igg_email:    '',
      live_status:  lf.live_status || 'offline',
      tasks_today:  lf.tasks_today || 0,
      success_rate: lf.success_rate || 100,
      adb_port:     lf.adb_port || 5555,
      status:       'running',
    }))
    return NextResponse.json({ ok: true, farms })
  }

  return NextResponse.json({ ok: true, farms: [] })
}
