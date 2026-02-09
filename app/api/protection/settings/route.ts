export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

function getSupabase() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ✅ anon هنا
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

type RequireAdminResult =
  | { ok: false; res: NextResponse }
  | { ok: true; supabase: ReturnType<typeof getSupabase> }

async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = getSupabase()

  // 1️⃣ المستخدم
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // 2️⃣ تحقق Admin
  const { data: admin } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!admin) {
    return { ok: false, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true, supabase }
}

/* ================== GET ================== */
export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.res

  const { supabase } = guard

  const { data } = await supabase
    .from('anti_detection_settings')
    .select('*')
    .eq('setting_key', 'global')
    .maybeSingle()

  return NextResponse.json({
    data:
      data ?? {
        setting_key: 'global',
        enabled: true,
        sensitivity: 3,
        max_requests: 100,
        block_duration_minutes: 60,
      },
  })
}

/* ================== POST ================== */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.res

  const { supabase } = guard
  const body = await req.json()

  const payload = {
    setting_key: 'global',
    enabled: !!body.enabled,
    sensitivity: Number(body.sensitivity),
    max_requests: Number(body.max_requests),
    block_duration_minutes: Number(body.block_duration_minutes),
  }

  const { data, error } = await supabase
    .from('anti_detection_settings')
    .upsert(payload, { onConflict: 'setting_key' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
