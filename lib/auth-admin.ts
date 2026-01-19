import { supabaseAdmin } from '@/lib/supabase-admin'

export async function requireAdmin() {
  const { data } = await supabaseAdmin.auth.getUser()

  if (!data?.user) {
    throw new Error('Unauthorized')
  }

  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('user_id', data.user.id)
    .single()

  if (!admin) {
    throw new Error('Forbidden')
  }
}
