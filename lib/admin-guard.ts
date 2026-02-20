import { createSupabaseServerClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

export async function requireAdmin() {
  const supabase = createSupabaseServerClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user

  if (!user || !user.email) {
    return { ok: false, status: 401, error: 'NOT_AUTHENTICATED' }
  }

  if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return { ok: true, user: { id: user.id, email: user.email } }
  }

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (roleRow?.role === 'admin') {
    return { ok: true, user: { id: user.id, email: user.email } }
  }

  return { ok: false, status: 403, error: 'NOT_ADMIN' }
}
