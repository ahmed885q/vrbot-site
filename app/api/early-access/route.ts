import { NextRequest, NextResponse } from 'next/server'

// ✅ مسارات نسبية (بدون @)
import { supabaseAdmin } from '../../../lib/supabase-server'
import { rateLimit } from '../../../lib/rate-limit'
import { audit } from '../../../lib/audit'

/* =========================
   POST – إضافة بريد Early Access
========================= */
export async function POST(req: NextRequest) {
  // IP Tracking
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0] ??
    req.ip ??
    'unknown'

  try {
    // Rate limit
    await rateLimit(ip)

    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Invalid email' },
        { status: 400 }
      )
    }

    // Insert email
    const { error } = await supabaseAdmin
      .from('early_access')
      .insert({ email, ip })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Audit log
    await audit('EARLY_ACCESS_SUBMIT', { email, ip })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 429 }
    )
  }
}
