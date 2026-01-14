import { supabaseAdmin } from '../supabase-server'

export async function getUserRole(userId: string): Promise<'admin' | 'user'> {
  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  return data?.role === 'admin' ? 'admin' : 'user'
}
