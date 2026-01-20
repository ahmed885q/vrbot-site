export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'


export const runtime = 'nodejs'

export async function GET() {
  try {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set() {
            // لا نحتاج set هنا
          },
          remove() {
            // لا نحتاج remove هنا
          },
        },
      }
    )

    // 1) جيب المستخدم الحقيقي من جلسة Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.getUser()

    if (authErr || !authData?.user) {
      // غير مسجل دخول أو الكوكي حق Supabase غير موجود
      return NextResponse.json(
        { plan: 'free', status: null, current_period_end: null, note: 'no-auth-user' },
        { status: 200 }
      )
    }

    const userId = authData.user.id
    const email = authData.user.email ?? null

    // 2) اقرأ الاشتراك من قاعدة البيانات باستخدام service role
    const { data: sub, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select('plan,status,current_period_end')
      .eq('user_id', userId)
      .maybeSingle()

    if (subErr) {
      console.error('subscription status error:', subErr)
      return NextResponse.json(
        { plan: 'free', status: null, current_period_end: null, error: subErr.message },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        plan: sub?.plan ?? 'free',
        status: sub?.status ?? null,
        current_period_end: sub?.current_period_end ?? null,
        userId,
        email,
      },
      { status: 200 }
    )
  } catch (e: any) {
    console.error('status route fatal:', e)
    return NextResponse.json(
      { plan: 'free', status: null, current_period_end: null, error: e?.message || 'unknown' },
      { status: 200 }
    )
  }
}
