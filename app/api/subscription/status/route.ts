import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: auth, error: authErr } = await supabase.auth.getUser()

  if (authErr || !auth?.user) {
    return NextResponse.json({ plan: 'free', userId: null, email: null }, { status: 200 })
  }

  const user = auth.user

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('plan,status,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { plan: 'free', userId: user.id, email: user.email ?? null },
      { status: 200 }
    )
  }

  // اعتبر Pro فقط إذا plan=pro و status active/trialing
  const status = sub?.status ?? null
  const isActive = status === 'active' || status === 'trialing'
  const plan = sub?.plan === 'pro' && isActive ? 'pro' : 'free'

  return NextResponse.json({
    plan,
    status,
    currentPeriodEnd: sub?.current_period_end ?? null,
    userId: user.id,
    email: user.email ?? null,
  })
}
