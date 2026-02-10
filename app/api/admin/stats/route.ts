export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function isAdminEmail(email: string | null | undefined) {
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!email) return false;
  return admins.includes(email.toLowerCase());
}

export async function GET() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  if (!data?.user || !isAdminEmail(data.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const [usersRes, subsRes, keysRes] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    db.from("pro_keys").select("*", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    totalUsers: usersRes.data?.users?.length || 0,
    activeSubs: subsRes.count || 0,
    totalKeys: keysRes.count || 0,
  });
}
