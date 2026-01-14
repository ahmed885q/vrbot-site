import { supabaseAdmin } from './supabase-server'

export async function audit(event: string, payload: any) {
  await supabaseAdmin.from('audit_trail').insert({
    event,
    payload,
  })
}
