import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const FILE_PATH = 'vrbot-agent-v5.zip'
const BUCKET = 'downloads'
const SIGNED_URL_EXPIRY = 300 // 5 minutes

export async function GET() {
  try {
    // 1. Auth check
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
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized — please log in first' },
        { status: 401 }
      )
    }

    // 2. Subscription check — user must have at least one farm
    const { count } = await supabase
      .from('user_farms')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (!count || count === 0) {
      return NextResponse.json(
        { error: 'No active subscription — please subscribe first' },
        { status: 403 }
      )
    }

    // 3. Generate signed URL using admin client (bucket is private)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: signedData, error: signError } = await supabaseAdmin
      .storage
      .from(BUCKET)
      .createSignedUrl(FILE_PATH, SIGNED_URL_EXPIRY)

    if (signError || !signedData?.signedUrl) {
      console.error('Storage signedUrl error:', signError)
      return NextResponse.json(
        { error: 'Failed to generate download link' },
        { status: 500 }
      )
    }

    // 4. Redirect to signed URL
    return NextResponse.redirect(signedData.signedUrl)
  } catch (err) {
    console.error('Download API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
