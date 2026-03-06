// lib/supabase/server.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * Server client bound to the current request cookies (user session / RLS).
 * Used in API routes that need to know the logged-in user.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // On some Next runtimes cookies may be read-only; ignore.
          }
        },
      },
    }
  )
}

/** Backwards-compatible alias if some files import supabaseServer */
export function supabaseServer() {
  return createSupabaseServerClient()
}

/**
 * Service-role client (ADMIN). Never use in client components.
 * Used for privileged operations (storage signed URLs, admin queries, etc.).
 */
export function supabaseService() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
