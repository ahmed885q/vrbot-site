import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function requireEntitled() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('status,trial_ends_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!sub) return { ok: false as const, status: 403, error: 'No subscription' }

  const now = new Date()

  if (sub.status === 'active') return { ok: true as const, user }

  if (sub.status === 'trialing' && sub.trial_ends_at) {
    const end = new Date(sub.trial_ends_at)
    if (now < end) return { ok: true as const, user }
  }

  return { ok: false as const, status: 403, error: 'Trial ended. Upgrade required.' }
}
