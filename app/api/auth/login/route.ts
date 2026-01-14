import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '../../../../lib/supabase-server'
import { createSession } from '../../../../lib/session'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = body as { email?: string }

    // ✅ تحقق أساسي
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Invalid email' },
        { status: 400 }
      )
    }

    // ✅ جلب المستخدم
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    // ✅ إنشاء Session حقيقي
    const session = await createSession({
      userId: user.id,
      ip: req.headers.get('x-forwarded-for') ?? 'unknown',
      userAgent: req.headers.get('user-agent') ?? 'unknown',
    })

    // ✅ استجابة نهائية
    return NextResponse.json({
      success: true,
      token: session.token,
    })
  } catch (err) {
    console.error('LOGIN_ERROR', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
