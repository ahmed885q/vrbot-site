import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function requireAdmin() {
  const supabase = createSupabaseServerClient()

  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!roleRow || roleRow.role !== 'admin') {
    return { ok: false as const, status: 403, error: 'Forbidden' }
  }

  return { ok: true as const, user }
}
