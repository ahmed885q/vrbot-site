import { supabaseAdmin } from '@/lib/supabase-admin'

export async function logAudit(
  event: string,
  payload: Record<string, any>
) {
  await supabaseAdmin.from("audit_trail").insert({
    event,
    payload,
  });
}
