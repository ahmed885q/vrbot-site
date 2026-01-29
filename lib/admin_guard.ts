import { createSupabaseServerClient } from "@/lib/supabase/server"

const ADMINS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

export async function adminGuard() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email?.toLowerCase()

  return Boolean(email && ADMINS.includes(email))
}
