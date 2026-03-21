import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const HETZNER_IP = process.env.HETZNER_IP || '88.99.64.19'
const API_KEY    = process.env.VRBOT_API_KEY || ''

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Auth check
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

    const { data: userData } = await supabaseAuth.auth.getUser()
    const user = userData?.user
    if (!user) return NextResponse.json({ farms: [] }, { status: 401 })

    // Service client for cloud_farms
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // جلب مزارع المستخدم من cloud_farms
    const { data: farms, error } = await supabase
      .from('cloud_farms')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'deleted')
      .order('created_at')

    if (error) {
      console.error('farms list error:', error)
      return NextResponse.json({ farms: [] })
    }

    if (!farms?.length) return NextResponse.json({ farms: [] })

    // جلب الحالة الحية من Hetzner
    try {
      const res = await fetch(
        `http://${HETZNER_IP}:8888/api/farms/status`,
        {
          headers: { 'X-API-Key': API_KEY },
          cache: 'no-store',
          signal: AbortSignal.timeout(5000)
        }
      )
      const live = await res.json()
      const liveFarms = live.farms || []

      // دمج البيانات — farm_name = container_id في Hetzner
      const merged = farms.map((f: any) => {
        const liveData = liveFarms.find(
          (l: any) => l.farm_id === f.farm_name || l.container_id === f.container_id
        ) || {}
        return {
          ...f,
          farm_id:      f.farm_name,  // للتوافق مع الـ frontend
          nickname:     f.farm_name,
          live_status:  liveData.live_status || (f.status === 'running' ? 'online' : 'offline'),
          tasks_today:  liveData.tasks_today || 0,
          success_rate: liveData.success_rate || 100,
        }
      })

      return NextResponse.json({ farms: merged })
    } catch {
      // إذا Hetzner لا يستجيب، أرجع البيانات من Supabase فقط
      const mapped = farms.map((f: any) => ({
        ...f,
        farm_id:      f.farm_name,
        nickname:     f.farm_name,
        live_status:  f.status === 'running' ? 'idle' : 'offline',
        tasks_today:  0,
        success_rate: 100,
      }))
      return NextResponse.json({ farms: mapped })
    }
  } catch (e: any) {
    console.error('list error:', e)
    return NextResponse.json({ farms: [] }, { status: 500 })
  }
}
