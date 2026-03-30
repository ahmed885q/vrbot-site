import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const HETZNER_IP = process.env.HETZNER_IP || '88.99.64.19'
const API_KEY    = process.env.VRBOT_API_KEY || ''

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

  const { farm_id } = await req.json()

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
    .single()

  if (!data) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  try {
    const res = await fetch(`https://${HETZNER_IP}/api/farms/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({ farm_id: data.container_id || farm_id }),
    })

    // تحديث الحالة في Supabase
    await supabase
      .from('cloud_farms')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('farm_name', farm_id)

    return NextResponse.json(await res.json())
  } catch (err: any) {
    return NextResponse.json({ error: 'Server unreachable' }, { status: 502 })
  }
}
