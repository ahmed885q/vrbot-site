import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-server'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const session = req.cookies.get('session')?.value
  if (!session) {
    return NextResponse.json({ plan: 'guest' })
  }

  // نشتق الإيميل بنفس طريقة التوليد (مبسّط للـ MVP)
  // لاحقًا سنستخدم جدول sessions
  const { data } = await supabaseAdmin
    .from('users')
    .select('id,email,subscriptions(plan)')
    .limit(1)

  const plan =
    data?.[0]?.subscriptions?.[0]?.plan ?? 'free'

  return NextResponse.json({ plan })
}
