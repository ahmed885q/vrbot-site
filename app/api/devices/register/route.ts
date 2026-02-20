import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import crypto from 'crypto'

export const runtime = 'nodejs'

function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const deviceName = String(body?.deviceName ?? 'Windows Agent').trim() || 'Windows Agent'

  // token raw (show once)
  const tokenRaw = 'dev_' + crypto.randomBytes(24).toString('hex')
  const tokenHash = sha256(tokenRaw)

  const { data: device, error } = await supabase
    .from('bot_devices')
    .insert({
      user_id: user.id,
      device_name: deviceName,
      token_hash: tokenHash,
      last_seen_at: null,
    })
    .select('id, device_name, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, token: tokenRaw, device })
}
