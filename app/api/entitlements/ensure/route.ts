import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'
const TRIAL_DAYS = 7

export async function GET() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
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

  const { data: ent, error } = await supabase
    .from('user_entitlements')
    .select('farm_slots, trial_ends_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // إذا موجود رجّعه
  if (ent) {
    const trialActive =
      ent.trial_ends_at && new Date(ent.trial_ends_at).getTime() > Date.now()
    // أثناء التجربة: farm_slots = 1 (لو كانت 0)
    if (trialActive && ent.farm_slots < 1) {
      await supabase
        .from('user_entitlements')
        .update({ farm_slots: 1 })
        .eq('user_id', user.id)
      return NextResponse.json({ ok: true, farm_slots: 1, trial_ends_at: ent.trial_ends_at })
    }
    return NextResponse.json({ ok: true, ...ent, trialActive })
  }

  // غير موجود: أنشئ Trial
  const trialEnds = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString()

  const { data: created, error: insErr } = await supabase
    .from('user_entitlements')
    .insert({
      user_id: user.id,
      farm_slots: 1,
      trial_ends_at: trialEnds,
    })
    .select('farm_slots, trial_ends_at')
    .single()

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...created, trialActive: true })
}
