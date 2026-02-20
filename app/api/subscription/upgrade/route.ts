import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { email, plan } = await req.json()

  if (!email || !plan) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (error || !user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
  }

  await supabaseAdmin
    .from('subscriptions')
    .update({ plan })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
