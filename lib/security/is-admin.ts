import { supabaseAdmin } from '@/lib/supabase-admin'

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("id")
    .eq("user_id", userId)
    .single();

  return !!data;
}
