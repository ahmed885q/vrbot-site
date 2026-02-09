export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJwtHS256 } from '@/lib/license/jwt'

export const runtime = 'nodejs'

const TRIAL_DAYS = 7
const TRIAL_FARM_LIMIT = 2
const PRO_FARM_LIMIT = 999999
const MAX_DEVICES = 1

function isExpired(periodEnd: string | null) {
  if (!periodEnd) return true
  return new Date(periodEnd).getTime() < Date.now()
}

export async function POST(req: Request) {
  const secret = process.env.LICENSE_JWT_SECRET
  if (!secret) return NextResponse.json({ ok: false, error: 'MISSING_LICENSE_JWT_SECRET' }, { status: 500 })

  const body = await req.json().catch(() => ({}))
  const token = String(body?.token || '')
  const deviceFingerprint = String(body?.deviceFingerprint || '').trim()
  const deviceLabel = String(body?.deviceLabel || 'Windows PC').trim()

  if (!token) return NextResponse.json({ ok: false, error: 'TOKEN_REQUIRED' }, { status: 400 })
  if (!deviceFingerprint) return NextResponse.json({ ok: false, error: 'DEVICE_FINGERPRINT_REQUIRED' }, { status: 400 })

  let payload: any
  try {
    payload = verifyJwtHS256(token, secret)
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'BAD_TOKEN' }, { status: 401 })
  }

  const userId = String(payload?.sub || '')
  if (!userId) return NextResponse.json({ ok: false, error: 'BAD_TOKEN_SUB' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // subscription exists? else create trial
  const { data: sub0 } = await supabase
    .from('subscriptions')
    .select('plan,status,current_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  let plan = sub0?.plan ?? 'trial'
  let status = sub0?.status ?? 'trialing'
  let periodEnd: string | null = sub0?.current_period_end ?? null

  if (!sub0) {
    const end = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { data: created } = await supabase
      .from('subscriptions')
      .insert({ user_id: userId, plan: 'trial', status: 'trialing', current_period_end: end })
      .select('plan,status,current_period_end')
      .single()

    plan = created?.plan ?? 'trial'
    status = created?.status ?? 'trialing'
    periodEnd = created?.current_period_end ?? end
  }

  // device binding
  const { data: devices } = await supabase
    .from('devices')
    .select('id, device_fingerprint, revoked_at')
    .eq('user_id', userId)
    .is('revoked_at', null)

  const active = devices ?? []
  const alreadyBound = active.find((d) => d.device_fingerprint === deviceFingerprint)

  if (!alreadyBound) {
    if (active.length >= MAX_DEVICES) {
      return NextResponse.json({ ok: false, error: 'DEVICE_LIMIT_REACHED', message: 'الحساب مربوط بجهاز آخر.' }, { status: 403 })
    }
    await supabase.from('devices').insert({ user_id: userId, label: deviceLabel, device_fingerprint: deviceFingerprint })
  }

  // trial expiry
  const expired = isExpired(periodEnd)
  if (plan === 'trial' && expired) {
    return NextResponse.json({ ok: false, error: 'TRIAL_ENDED', trialEndsAt: periodEnd }, { status: 402 })
  }

  const isPro = plan === 'pro' && (status === 'active' || status === 'paid' || status === 'trialing')
  const farmLimit = isPro ? PRO_FARM_LIMIT : TRIAL_FARM_LIMIT

  return NextResponse.json({
    ok: true,
    plan: isPro ? 'pro' : 'trial',
    status,
    trialEndsAt: periodEnd,
    farmLimit,
    deviceBound: true,
  })
}
