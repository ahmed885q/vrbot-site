import { supabaseAdmin } from "@/lib/supabase/server";

export async function logAdminAction(
  userId: string,
  action: string,
  ip: string
) {
  await supabaseAdmin.from("admin_logs").insert({
    user_id: userId,
    action,
    ip,
  });
}
