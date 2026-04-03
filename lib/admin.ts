import { createClient } from "@supabase/supabase-js";

export async function isAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await db
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  return data?.is_admin === true;
}
