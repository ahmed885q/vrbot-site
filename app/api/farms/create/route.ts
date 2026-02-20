import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

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

  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = String(body?.name ?? '').trim()
  const server = String(body?.server ?? '').trim() || null
  const notes = String(body?.notes ?? '').trim() || null

  if (!name) return NextResponse.json({ error: 'Missing farm name' }, { status: 400 })

  // Entitlements
  const { data: ent } = await supabase
    .from('user_entitlements')
    .select('farm_slots, trial_ends_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const slots = ent?.farm_slots ?? 0

  // Count current farms
  const { count } = await supabase
    .from('user_farms')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const used = count ?? 0
  if (used >= slots) {
    return NextResponse.json(
      { error: `Farm limit reached (${used}/${slots}). Upgrade later to add more farms.` },
      { status: 403 }
    )
  }

  const { data: farm, error } = await supabase
    .from('user_farms')
    .insert({ user_id: user.id, name, server, notes })
    .select('id,name,server,notes,created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // create empty settings row
  await supabase.from('farm_settings').upsert(
    { farm_id: farm.id, user_id: user.id, settings: {} },
    { onConflict: 'farm_id' }
  )

  return NextResponse.json({ ok: true, farm })
}
