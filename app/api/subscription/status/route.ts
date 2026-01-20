import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // مهم
)

export async function GET() {
  const cookieStore = cookies()

  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    return NextResponse.json({
      plan: 'free',
      status: null,
      current_period_end: null,
    })
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return NextResponse.json({
      plan: 'free',
      status: null,
      current_period_end: null,
    })
  }

  return NextResponse.json({
    plan: data.plan,
    status: data.status,
    current_period_end: data.current_period_end,
  })
}
