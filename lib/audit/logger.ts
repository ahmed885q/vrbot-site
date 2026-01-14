import { supabaseAdmin } from "@/lib/supabase/server";

export async function logAudit(
  event: string,
  payload: Record<string, any>
) {
  await supabaseAdmin.from("audit_trail").insert({
    event,
    payload,
  });
}
